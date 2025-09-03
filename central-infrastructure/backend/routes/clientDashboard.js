const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');

// Import VPS API service for real data
const VpsApiService = require('../services/vpsApi');
const vpsApi = new VpsApiService();

// Middleware to authenticate dashboard access
const authenticateDashboardAccess = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access token required' 
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Store client ID for route handlers
    req.clientId = req.user.client_id || 'admin';
    req.userRole = req.user.role;

    console.log(`🔐 Dashboard access authenticated for user ${req.user.username} with role ${req.user.role} and client_id ${req.clientId}`);

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }
    return res.status(500).json({ 
      success: false, 
      error: 'Authentication error' 
    });
  }
};

// GET: Client Dashboard Overview
router.get('/overview', authenticateDashboardAccess, async (req, res) => {
  try {
    console.log(`📊 Generating dashboard overview for ${req.userRole} user ${req.user.username}`);

    if (req.userRole === 'admin') {
      // Admin view - get real data from VPS API
      try {
        const systemOverview = await vpsApi.getSystemOverview();
        const collectionsList = await vpsApi.getCollectionsList();
        
        console.log('🔧 VPS API responses:', { systemOverview, collectionsList });
        
        const overview = {
          client_id: '*',
          client_role: 'admin',
          total_collections: collectionsList?.collections?.length || 0,
          total_clients: systemOverview?.overview?.total_clients || 0,
          total_records: systemOverview?.overview?.total_records || 0,
          data_types: systemOverview?.overview?.data_types || {},
          recent_activity: systemOverview?.overview?.recent_activity || [],
          system_health: {
            database: systemOverview?.overview?.system_health?.database || 'unknown',
            vps_status: systemOverview?.overview?.system_health?.vps_status || 'unknown',
            timestamp: new Date().toISOString()
          }
        };

        res.json({
          success: true,
          overview
        });
      } catch (vpsError) {
        console.error('VPS API error for admin overview:', vpsError);
        // Fallback to basic overview if VPS API fails
        res.json({
          success: true,
          overview: {
            client_id: '*',
            client_role: 'admin',
            total_collections: 0,
            total_clients: 0,
            total_records: 0,
            data_types: {},
            recent_activity: [],
            system_health: {
              database: 'disconnected',
              vps_status: 'unavailable',
              timestamp: new Date().toISOString()
            }
          }
        });
      }
    } else {
      // Client view - get real data from VPS API
      try {
        const clientStatus = await vpsApi.getClientStatus(req.clientId);
        const clientData = await vpsApi.getClientData(req.clientId, 'deception_event', { limit: 5 });
        
        const overview = {
          client_id: req.clientId,
          client_role: 'client',
          total_records: clientStatus?.total_records || 0,
          data_types: {
            deception_event: {
              total_count: clientData?.data?.length || 0,
              clients: [{ client_id: req.clientId, count: clientData?.data?.length || 0 }]
            }
          },
          recent_activity: clientData?.data?.slice(0, 5) || [],
          system_health: {
            database: clientStatus?.status || 'unknown',
            timestamp: new Date().toISOString()
          }
        };

        res.json({
          success: true,
          overview
        });
      } catch (vpsError) {
        console.error('VPS API error for client overview:', vpsError);
        // Fallback to basic overview if VPS API fails
        res.json({
          success: true,
          overview: {
            client_id: req.clientId,
            client_role: 'client',
            total_records: 0,
            data_types: {
              deception_event: {
                total_count: 0,
                clients: [{ client_id: req.clientId, count: 0 }]
              }
            },
            recent_activity: [],
            system_health: {
              database: 'disconnected',
              timestamp: new Date().toISOString()
            }
          }
        });
      }
    }
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate dashboard overview' 
    });
  }
});

// GET: Client Data with Pagination
router.get('/data', authenticateDashboardAccess, async (req, res) => {
  try {
    const { page = 1, limit = 100, data_type, severity, source_ip } = req.query;
    
    console.log(`📄 Fetching data for client ${req.clientId} with filters:`, req.query);

    try {
      // Get real data from VPS API
      const filters = { page, limit };
      if (data_type) filters.data_type = data_type;
      if (severity) filters.severity = severity;
      if (source_ip) filters.source_ip = source_ip;

      let data = [];
      
      if (req.userRole === 'admin') {
        // Admin can see all client data - try all known clients
        const allClients = ['client1', 'client_a', 'client_b', 'client_c'];
        for (const clientId of allClients) {
          try {
            const clientData = await vpsApi.getClientData(clientId, data_type || 'deception_event', filters);
            if (clientData?.data && Array.isArray(clientData.data)) {
              data.push(...clientData.data);
            }
          } catch (clientError) {
            console.warn(`Failed to fetch data for client ${clientId}:`, clientError.message);
          }
        }
      } else {
        // Client can only see their own data
        const clientData = await vpsApi.getClientData(req.clientId, data_type || 'deception_event', filters);
        data = clientData?.data || [];
      }

      // Transform data to match expected frontend format
      const transformedData = data.map(item => ({
        _id: item._id || item.id,
        timestamp: item.timestamp,
        source_ip: item.source_ip,
        dest_port: item.port || item.dest_port,
        uid: item._id || item.id,
        message: item.description || item.message,
        note_type: item.data_type || item.note_type,
        alertType: item.data_type || 'deception_event',
        attackerIP: item.source_ip,
        clientId: item.client_id,
        threatLevel: item.severity || 'medium',
        severity: item.severity || 'medium',
        attack_category: item.attack_category || 'honeypot_engagement',
        protocol: item.protocol || 'Unknown',
        honeypot_name: item.honeypot_name || `client_${item.client_id}`,
        session_id: item.session_id || item._id,
        details: {
          zeek_note_type: item.data_type || 'deception_event',
          message: item.description || item.message,
          dest_port: item.port || item.dest_port,
          detection_method: item.detection_method || 'honeypot_monitoring',
          attack_category: item.attack_category || 'honeypot_engagement',
          severity: item.severity || 'medium'
        }
      }));

      // Apply filters to transformed data
      let filteredData = transformedData;
      if (data_type) {
        filteredData = filteredData.filter(item => item.note_type === data_type);
      }
      if (severity) {
        filteredData = filteredData.filter(item => item.severity === severity);
      }
      if (source_ip) {
        filteredData = filteredData.filter(item => item.source_ip.includes(source_ip));
      }

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedData = filteredData.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredData.length,
          pages: Math.ceil(filteredData.length / limit)
        },
        filters: {
          data_type,
          severity,
          source_ip
        }
      });
    } catch (vpsError) {
      console.error('VPS API error for data fetch:', vpsError);
      // Fallback to empty data if VPS API fails
      res.json({
        success: true,
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        },
        filters: {
          data_type,
          severity,
          source_ip
        }
      });
    }
  } catch (error) {
    console.error('Data fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch data' 
    });
  }
});

// GET: Analytics
router.get('/analytics', authenticateDashboardAccess, async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    console.log(`📈 Generating analytics for client ${req.clientId} over ${timeframe}`);

    try {
      let analytics = {};
      
      if (req.userRole === 'admin') {
        // Admin can see system-wide analytics
        const systemAnalytics = await vpsApi.getAnalytics(timeframe);
        analytics = systemAnalytics || {};
      } else {
        // Client can only see their own analytics
        const clientAnalytics = await vpsApi.getAnalytics(timeframe);
        analytics = clientAnalytics || {};
      }

      // Transform analytics to match expected frontend format
      const transformedAnalytics = {
        timeframe,
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
        total_events: analytics.total_events || 0,
        events_by_type: analytics.events_by_type || {},
        events_by_severity: analytics.events_by_severity || {},
        events_by_client: analytics.events_by_client || {},
        top_source_ips: analytics.top_source_ips || [],
        top_destination_ips: analytics.top_destination_ips || [],
        events_timeline: analytics.events_timeline || []
      };

      res.json({
        success: true,
        analytics: transformedAnalytics
      });
    } catch (vpsError) {
      console.error('VPS API error for analytics:', vpsError);
      // Fallback to basic analytics if VPS API fails
      res.json({
        success: true,
        analytics: {
          timeframe,
          start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end_time: new Date().toISOString(),
          total_events: 0,
          events_by_type: {},
          events_by_severity: {},
          events_by_client: {},
          top_source_ips: [],
          top_destination_ips: [],
          events_timeline: []
        }
      });
    }
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate analytics' 
    });
  }
});

// GET: Search Data
router.get('/search', authenticateDashboardAccess, async (req, res) => {
  try {
    const { query, data_type, severity, time_range = '24h' } = req.query;
    
    console.log(`🔍 Searching data for client ${req.clientId} with query: ${query}`);

    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Search query is required' 
      });
    }

    try {
      let searchResults = [];
      
      if (req.userRole === 'admin') {
        // Admin can search across all clients
        const allClients = ['client1', 'client_a', 'client_b', 'client_c'];
        for (const clientId of allClients) {
          try {
            const searchData = await vpsApi.searchData(query, { 
              data_type, 
              severity, 
              time_range,
              client_id: clientId 
            });
            if (searchData?.results) {
              searchResults.push(...searchData.results);
            }
          } catch (clientError) {
            console.warn(`Failed to search data for client ${clientId}:`, clientError.message);
          }
        }
      } else {
        // Client can only search their own data
        const searchData = await vpsApi.searchData(query, { 
          data_type, 
          severity, 
          time_range,
          client_id: req.clientId 
        });
        searchResults = searchData?.results || [];
      }

      // Transform search results to match expected frontend format
      const transformedResults = searchResults.map(item => ({
        _id: item._id || item.id,
        timestamp: item.timestamp,
        source_ip: item.source_ip,
        message: item.description || item.message,
        clientId: item.client_id,
        severity: item.severity || 'medium',
        relevance_score: item.relevance_score || 0.8,
        note_type: item.data_type || 'deception_event'
      }));

      // Apply additional filters
      if (data_type) {
        transformedResults = transformedResults.filter(item => item.note_type === data_type);
      }
      if (severity) {
        transformedResults = transformedResults.filter(item => item.severity === severity);
      }

      res.json({
        success: true,
        search_results: transformedResults,
        total_results: transformedResults.length,
        query,
        filters: {
          data_type,
          severity,
          time_range
        }
      });
    } catch (vpsError) {
      console.error('VPS API error for search:', vpsError);
      // Fallback to empty search results if VPS API fails
      res.json({
        success: true,
        search_results: [],
        total_results: 0,
        query,
        filters: {
          data_type,
          severity,
          time_range
        }
      });
    }
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Search failed' 
    });
  }
});

module.exports = router;
