const express = require('express');
const router = express.Router();

module.exports = function(vpsApi) {
  // Use VPS API instead of local database collections
  // No need for indexes when using VPS API

  // ===== STREAMLINED DASHBOARD ENDPOINTS =====
  
  // GET: Fetch scan alerts for dashboard
  router.get('/scan-alerts', async (req, res) => {
    try {
      const { hours = 24, limit = 500, clientId = 'client-a' } = req.query;
      
      console.log(`🔍 Fetching scan alerts for client ${clientId} over ${hours} hours`);
      
      // Get collections list from VPS API
      const collections = await vpsApi.getCollectionsList();
      
      // Filter collections based on client
      let clientCollections;
      if (clientId === 'admin' || clientId === 'all') {
        clientCollections = (collections.collections || []).filter(c =>
          c.name === 'scan_alerts' || c.name.startsWith('client_')
        );
      } else {
        clientCollections = (collections.collections || []).filter(c => 
          c.name === 'scan_alerts' ||
          c.name === `client_${clientId}`
        );
      }

      let allScanAlerts = [];
      
      // Fetch scan alerts from relevant collections
      for (const collection of clientCollections) {
        try {
          const collectionData = await vpsApi.getCollectionDetails(collection.name, {
            limit: Math.ceil(parseInt(limit) / clientCollections.length)
          });
          
          if (collectionData.success && collectionData.data) {
            // Filter for scan alert type events
            const scanAlertEvents = collectionData.data.filter(event => {
              const eventType = event.data_type || event.note_type;
              return eventType === 'scan_alert' || eventType === 'scan_alerts' || 
                     event.attack_category === 'reconnaissance' || 
                     event.attack_category === 'network_scan';
            });
            
            // Transform VPS API data to frontend-compatible format
            const transformedEvents = scanAlertEvents.map(event => ({
              _id: event._id || event.data_id,
              id: event._id || event.data_id,
              timestamp: event.timestamp,
              source_ip: event.source_ip,
              dest_port: event.port || event.dest_port,
              uid: event.uid || event.session_id || event._id,
              message: event.description || event.message || 'Scan alert detected',
              note_type: event.data_type || event.note_type || 'scan_alert',
              alertType: event.data_type || event.note_type || 'scan_alert',
              attackerIP: event.source_ip,
              clientId: event.client_id || clientId,
              threatLevel: event.severity || 'medium',
              severity: event.severity || 'medium',
              attack_category: event.attack_category || 'network_scan',
              protocol: event.protocol || 'tcp',
              session_id: event.session_id || event.uid || event._id,
              details: {
                zeek_note_type: event.data_type || event.note_type,
                message: event.description || event.message,
                dest_port: event.port || event.dest_port,
                uid: event.uid || event.session_id,
                detection_method: 'network_monitoring',
                attack_category: event.attack_category || 'network_scan',
                severity: event.severity || 'medium'
              }
            }));
            
            allScanAlerts = allScanAlerts.concat(transformedEvents);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to retrieve data from collection ${collection.name}:`, error.message);
        }
      }

      // Sort by timestamp (newest first)
      allScanAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Apply limit
      if (limit) {
        allScanAlerts = allScanAlerts.slice(0, parseInt(limit));
      }
      
      console.log(`📊 Fetched ${allScanAlerts.length} scan alerts for dashboard`);
      
      // Emit real-time update via WebSocket
      if (global.io) {
        global.io.emit('dashboard-update', {
          type: 'scan-alerts',
          count: allScanAlerts.length,
          timestamp: new Date().toISOString()
        });
      }
      
      res.json(allScanAlerts);
    } catch (error) {
      console.error('Error fetching scan alerts:', error);
      res.status(500).json({ error: 'Failed to fetch scan alerts' });
    }
  });

  // GET: Fetch scan alerts statistics for dashboard
  router.get('/scan-alerts/stats', async (req, res) => {
    try {
      const { hours = 24, clientId = 'client-a' } = req.query;
      
      console.log(`📊 Fetching scan alerts stats for client ${clientId} over ${hours} hours`);
      
      // Get collections list from VPS API
      const collections = await vpsApi.getCollectionsList();
      
      // Filter collections based on client
      let clientCollections;
      if (clientId === 'admin' || clientId === 'all') {
        clientCollections = (collections.collections || []).filter(c =>
          c.name === 'scan_alerts' || c.name.startsWith('client_')
        );
      } else {
        clientCollections = (collections.collections || []).filter(c => 
          c.name === 'scan_alerts' ||
          c.name === `client_${clientId}`
        );
      }

      const stats = {
        total: 0,
        by_severity: {},
        by_category: {},
        by_note_type: {},
        unique_ips: 0,
        time_range: `${hours}h`
      };

      let allEvents = [];
      const uniqueIPs = new Set();
      
      // Fetch events from all collections for statistics
      for (const collection of clientCollections) {
        try {
          const collectionData = await vpsApi.getCollectionDetails(collection.name, {
            limit: 1000, // Get more data for accurate stats
            data_type: 'scan_alert'
          });
          
          if (collectionData.success && collectionData.data) {
            collectionData.data.forEach(event => {
              allEvents.push(event);
              if (event.source_ip) uniqueIPs.add(event.source_ip);
              
              // Severity stats
              const severity = event.severity || 'unknown';
              stats.by_severity[severity] = (stats.by_severity[severity] || 0) + 1;
              
              // Category stats
              const category = event.attack_category || 'unknown';
              stats.by_category[category] = (stats.by_category[category] || 0) + 1;
              
              // Note type stats
              const noteType = event.data_type || event.note_type || 'unknown';
              stats.by_note_type[noteType] = (stats.by_note_type[noteType] || 0) + 1;
            });
          }
        } catch (error) {
          console.warn(`⚠️ Failed to retrieve stats from collection ${collection.name}:`, error.message);
        }
      }

      stats.total = allEvents.length;
      stats.unique_ips = uniqueIPs.size;

      console.log(`📊 Scan alerts stats: ${stats.total} total events, ${stats.unique_ips} unique IPs`);
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching scan alerts stats:', error);
      res.status(500).json({ error: 'Failed to fetch scan alerts stats' });
    }
  });

  // GET: Fetch deception detection events for dashboard
  router.get('/deception-detection', async (req, res) => {
    try {
      const { hours = 24, limit = 500, clientId = 'client-a' } = req.query;
      
      console.log(`🍯 Fetching deception detection events for client ${clientId} over ${hours} hours`);
      
      // Get collections list from VPS API
      const collections = await vpsApi.getCollectionsList();
      
      // Filter collections based on client
      let clientCollections;
      if (clientId === 'admin' || clientId === 'all') {
        clientCollections = (collections.collections || []).filter(c =>
          c.name === 'deception_detection' || c.name.startsWith('client_')
        );
      } else {
        clientCollections = (collections.collections || []).filter(c => 
          c.name === 'deception_detection' ||
          c.name === `client_${clientId}`
        );
      }

      let allDeceptionEvents = [];
      
      // Fetch deception events from relevant collections
      for (const collection of clientCollections) {
        try {
          const collectionData = await vpsApi.getCollectionDetails(collection.name, {
            limit: Math.ceil(parseInt(limit) / clientCollections.length)
          });
          
          if (collectionData.success && collectionData.data) {
            // Transform VPS API data to frontend-compatible format
            const transformedEvents = collectionData.data.map(event => ({
              _id: event._id || event.data_id,
              id: event._id || event.data_id,
              timestamp: event.timestamp,
              source_ip: event.source_ip,
              dest_port: event.port || event.dest_port,
              uid: event.uid || event.session_id || event._id,
              message: event.description || event.message || 'Deception event detected',
              note_type: event.data_type || event.note_type || 'deception_event',
              alertType: event.data_type || event.note_type || 'deception_event',
              attackerIP: event.source_ip,
              clientId: event.client_id || clientId,
              threatLevel: event.severity || 'medium',
              severity: event.severity || 'medium',
              attack_category: event.attack_category || 'honeypot_engagement',
              protocol: event.protocol || 'tcp',
              honeypot_id: event.honeypot_id || event.dest_port,
              honeypot_name: event.honeypot_name || collection.name,
              session_id: event.session_id || event.uid || event._id,
              details: {
                zeek_note_type: event.data_type || event.note_type,
                message: event.description || event.message,
                dest_port: event.port || event.dest_port,
                uid: event.uid || event.session_id,
                detection_method: 'honeypot_monitoring',
                attack_category: event.attack_category || 'honeypot_engagement',
                severity: event.severity || 'medium'
              }
            }));
            
            allDeceptionEvents = allDeceptionEvents.concat(transformedEvents);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to retrieve data from collection ${collection.name}:`, error.message);
        }
      }

      // Sort by timestamp (newest first)
      allDeceptionEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Apply limit
      if (limit) {
        allDeceptionEvents = allDeceptionEvents.slice(0, parseInt(limit));
      }

      console.log(`🍯 Fetched ${allDeceptionEvents.length} deception detection events for dashboard`);
      
      // Emit real-time update via WebSocket
      if (global.io) {
        global.io.emit('dashboard-update', {
          type: 'deception-detection',
          count: allDeceptionEvents.length,
          timestamp: new Date().toISOString()
        });
      }
      
      res.json(allDeceptionEvents);
    } catch (error) {
      console.error('Error fetching deception detection events:', error);
      res.status(500).json({ error: 'Failed to fetch deception detection events' });
    }
  });

  // GET: Fetch deception detection statistics
  router.get('/deception-detection/stats', async (req, res) => {
    try {
      const { hours = 24, clientId = 'client-a' } = req.query;
      
      console.log(`📊 Fetching deception detection stats for client ${clientId} over ${hours} hours`);
      
      // Get collections list from VPS API
      const collections = await vpsApi.getCollectionsList();
      
      // Filter collections based on client
      let clientCollections;
      if (clientId === 'admin' || clientId === 'all') {
        clientCollections = (collections.collections || []).filter(c =>
          c.name === 'deception_detection' || c.name.startsWith('client_')
        );
      } else {
        clientCollections = (collections.collections || []).filter(c => 
          c.name === 'deception_detection' ||
          c.name === `client_${clientId}`
        );
      }

      const stats = {
        total: 0,
        by_severity: {},
        by_note_type: {},
        unique_ips: 0,
        time_range: `${hours}h`
      };

      let allEvents = [];
      const uniqueIPs = new Set();
      
      // Fetch events from all collections for statistics
      for (const collection of clientCollections) {
        try {
          const collectionData = await vpsApi.getCollectionDetails(collection.name, {
            limit: 1000, // Get more data for accurate stats
            data_type: 'deception_event'
          });
          
          if (collectionData.success && collectionData.data) {
            collectionData.data.forEach(event => {
              allEvents.push(event);
              if (event.source_ip) uniqueIPs.add(event.source_ip);
              
              // Severity stats
              const severity = event.severity || 'unknown';
              stats.by_severity[severity] = (stats.by_severity[severity] || 0) + 1;
              
              // Note type stats
              const noteType = event.data_type || event.note_type || 'unknown';
              stats.by_note_type[noteType] = (stats.by_note_type[noteType] || 0) + 1;
            });
          }
        } catch (error) {
          console.warn(`⚠️ Failed to retrieve stats from collection ${collection.name}:`, error.message);
        }
      }

      stats.total = allEvents.length;
      stats.unique_ips = uniqueIPs.size;

      console.log(`📊 Deception detection stats: ${stats.total} total events, ${stats.unique_ips} unique IPs`);
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching deception detection stats:', error);
      res.status(500).json({ error: 'Failed to fetch deception detection stats' });
    }
  });

  // GET: Fetch raw logs for dashboard
  router.get('/raw-logs', async (req, res) => {
    try {
      const { hours = 24, limit = 500, clientId = 'client-a' } = req.query;
      
      console.log(`📝 Fetching raw logs for client ${clientId} over ${hours} hours`);
      
      // Get collections list from VPS API
      const collections = await vpsApi.getCollectionsList();
      
      // Filter collections based on client
      let clientCollections;
      if (clientId === 'admin' || clientId === 'all') {
        clientCollections = (collections.collections || []).filter(c =>
          c.name === 'raw_logs' || c.name.startsWith('client_')
        );
      } else {
        clientCollections = (collections.collections || []).filter(c => 
          c.name === 'raw_logs' ||
          c.name === `client_${clientId}`
        );
      }

      let allRawLogs = [];
      
      // Fetch raw logs from relevant collections
      for (const collection of clientCollections) {
        try {
          const collectionData = await vpsApi.getCollectionDetails(collection.name, {
            limit: Math.ceil(parseInt(limit) / clientCollections.length),
            data_type: 'raw_log'
          });
          
          if (collectionData.success && collectionData.data) {
            // Transform VPS API data to frontend-compatible format
            const transformedLogs = collectionData.data.map(log => ({
              _id: log._id || log.data_id,
              id: log._id || log.data_id,
              timestamp: log.timestamp,
              source: log.source || collection.name,
              message: log.description || log.message || log.data || 'Raw log entry',
              level: log.severity || log.level || 'info',
              client_id: log.client_id || clientId,
              details: {
                raw_data: log.data || log.message,
                source: log.source || collection.name,
                timestamp: log.timestamp
              }
            }));
            
            allRawLogs = allRawLogs.concat(transformedLogs);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to retrieve data from collection ${collection.name}:`, error.message);
        }
      }

      // Sort by timestamp (newest first)
      allRawLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Apply limit
      if (limit) {
        allRawLogs = allRawLogs.slice(0, parseInt(limit));
      }

      console.log(`📝 Fetched ${allRawLogs.length} raw logs for dashboard`);
      
      res.json(allRawLogs);
    } catch (error) {
      console.error('Error fetching raw logs:', error);
      res.status(500).json({ error: 'Failed to fetch raw logs' });
    }
  });

  // GET: Fetch consolidated network security overview
  router.get('/dashboard-summary', async (req, res) => {
    try {
      const { hours = 24, clientId = 'client-a' } = req.query;
      
      console.log(`📊 Fetching dashboard summary for client ${clientId} over ${hours} hours`);
      
      // Get collections list from VPS API
      const collections = await vpsApi.getCollectionsList();
      
      // Filter collections based on client
      let clientCollections;
      if (clientId === 'admin' || clientId === 'all') {
        clientCollections = (collections.collections || []).filter(c =>
          c.name === 'scan_alerts' || c.name === 'deception_detection' || c.name === 'raw_logs' || c.name.startsWith('client_')
        );
      } else {
        clientCollections = (collections.collections || []).filter(c => 
          c.name === 'scan_alerts' ||
          c.name === 'deception_detection' ||
          c.name === 'raw_logs' ||
          c.name === `client_${clientId}`
        );
      }

      const summary = {
        total_events: 0,
        scan_alerts: 0,
        deception_events: 0,
        raw_logs: 0,
        unique_ips: new Set(),
        severity_breakdown: {},
        time_range: `${hours}h`,
        last_updated: new Date().toISOString()
      };

      // Fetch data from all collections for summary
      for (const collection of clientCollections) {
        try {
          const collectionData = await vpsApi.getCollectionDetails(collection.name, {
            limit: 1000 // Get more data for accurate summary
          });
          
          if (collectionData.success && collectionData.data) {
            collectionData.data.forEach(event => {
              summary.total_events++;
              
              if (event.source_ip) summary.unique_ips.add(event.source_ip);
              
              // Count by type
              const eventType = event.data_type || event.note_type;
              if (eventType === 'scan_alert') {
                summary.scan_alerts++;
              } else if (eventType === 'deception_event') {
                summary.deception_events++;
              } else if (eventType === 'raw_log') {
                summary.raw_logs++;
              }
              
              // Severity breakdown
              const severity = event.severity || 'unknown';
              summary.severity_breakdown[severity] = (summary.severity_breakdown[severity] || 0) + 1;
            });
          }
        } catch (error) {
          console.warn(`⚠️ Failed to retrieve summary from collection ${collection.name}:`, error.message);
        }
      }

      // Convert Set to count
      summary.unique_ips = summary.unique_ips.size;

      console.log(`📊 Dashboard summary: ${summary.total_events} total events, ${summary.unique_ips} unique IPs`);
      
      res.json(summary);
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard summary' });
    }
  });

  return router;
}; 