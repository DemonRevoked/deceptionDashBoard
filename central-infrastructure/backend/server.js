// switch to CommonJS (or add "type":"module" in package.json if you prefer ESM)

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createServer } = require('http');
const { initializeWebSocket } = require('./websocket');

// Import modular routes
const authRouter = require('./routes/auth');
const { authenticateToken } = require('./middleware/auth');
const honeypotsRouter = require('./routes/honeypots');
const eventsRouter = require('./routes/events');
const honeypotEventsRouter = require('./routes/honeypotEvents');
const enhancedEventsRouter = require('./routes/enhancedEvents');
const analysisRouter = require('./routes/honeypotAnalysis');
const honeypotControlRouter = require('./routes/honeypotControl');
const otHoneypotsRouter = require('./routes/otHoneypots');
const networkSecurityRouter = require('./routes/networkSecurity');
const clientDashboardRouter = require('./routes/clientDashboard');

// Import VPS API service
const VpsApiService = require('./services/vpsApi');

require('dotenv').config();

const app = express();
const httpServer = createServer(app);

// Initialize VPS API service
const vpsApi = new VpsApiService();

// Environment validation happens at startup

// Configure CORS
app.use(cors({
  origin: ['http://10.0.44.3:3000', 'http://10.0.44.32:3000', 'http://10.0.44.32', 'http://10.0.44.77:3000', 'http://localhost:3000', 'http://localhost:80', 'http://frontend:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(bodyParser.json());

// Quick health check (no external services)
app.get('/api/health/quick', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Basic health response
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        backend: {
          status: 'running',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          responseTime: Date.now() - startTime
        },
        vpsApi: {
          status: 'checking',
          lastChecked: new Date().toISOString(),
          note: 'VPS API connection status'
        },
        websocket: {
          status: global.io ? 'active' : 'inactive',
          connections: global.io ? global.io.sockets.sockets.size : 0,
          lastChecked: new Date().toISOString(),
          note: global.io ? undefined : 'WebSocket available but limited functionality'
        }
      }
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Full health check (includes external services)
app.get('/api/health', async (req, res) => {
  try {
    const startTime = Date.now();
    const health = {
      status: 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        backend: {
          status: 'running',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          responseTime: 0
        },
        vpsApi: {
          status: 'checking',
          lastChecked: new Date().toISOString(),
          responseTime: 0,
          note: 'Checking VPS API connection'
        },
        websocket: {
          status: global.io ? 'active' : 'inactive',
          connections: global.io ? global.io.sockets.sockets.size : 0,
          lastChecked: new Date().toISOString(),
          note: global.io ? undefined : 'WebSocket disabled'
        }
      }
    };

    // Check VPS API health
    try {
      const vpsHealth = await vpsApi.checkHealth();
      health.services.vpsApi = {
        ...health.services.vpsApi,
        status: vpsHealth.status,
        vpsStatus: vpsHealth.vpsStatus,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      health.services.vpsApi = {
        ...health.services.vpsApi,
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }

    // Calculate overall health status
    const services = health.services;
    const criticalServices = ['backend'];
    const criticalDown = criticalServices.some(service => 
      services[service].status === 'error' || services[service].status === 'disconnected'
    );
    
    if (criticalDown) {
      health.status = 'unhealthy';
    } else if (services.vpsApi.status === 'unhealthy') {
      health.status = 'degraded'; // VPS API is down, so degraded
    } else {
      health.status = 'healthy';
    }

    // Add response time
    health.services.backend.responseTime = Date.now() - startTime;

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        backend: { status: 'error', error: error.message }
      }
    });
  }
});

// Basic info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    service: 'AdvDeception Backend',
    mode: 'vps-api-connected',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    note: 'Running with VPS API connection (client data isolated)'
  });
});

// Mount basic routes (always available)
app.use('/api/auth', authRouter);

// Test endpoint for basic functionality
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is running with VPS API',
    timestamp: new Date().toISOString(),
    status: 'operational',
    vpsApi: 'connected',
    websocket: global.io ? 'available' : 'disabled'
  });
});

// Initialize server with VPS API connection
(async () => {
  try {
    console.log('🔄 Initializing VPS API connection...');
    
    // Test VPS API connection
    const vpsHealth = await vpsApi.checkHealth();
    if (vpsHealth.status === 'healthy') {
      console.log('✅ VPS API connection successful');
      global.vpsApiStatus = 'connected';
    } else {
      console.warn('⚠️ VPS API connection failed:', vpsHealth.error);
      global.vpsApiStatus = 'disconnected';
    }

    // Initialize WebSocket server only once
    if (!global.io) {
      console.log('🔄 Initializing WebSocket server...');
      const io = initializeWebSocket(httpServer, null); // No database needed
      global.io = io;
      console.log('✅ WebSocket server initialized');
    } else {
      console.log('⚠️  WebSocket server already initialized, skipping...');
    }

    // Initialize routes with VPS API (no database parameter needed)
    // Comment out routes that still expect database connection
    // const honeypotsRoutes = honeypotsRouter();
    // const eventsRoutes = eventsRouter();  // Primary events collection (Connection.md)
    // const honeypotEventsRoutes = honeypotEventsRouter(); // This expects db parameter
    // const analysisRoutes = analysisRouter();
    // const controlRoutes = honeypotControlRouter();
    // const otHoneypotsRoutes = otHoneypotsRouter();
    // const networkSecurityRoutes = networkSecurityRouter();
    const enhancedEventsRoutes = enhancedEventsRouter(vpsApi); // Pass VPS API instance

    // Mount routes with proper authentication
    // Temporarily commenting out problematic routes until they're updated for VPS API
    // app.use('/api/honeypots/control', authenticateToken, controlRoutes);
    // app.use('/api/honeypots/ot', authenticateToken, otHoneypotsRoutes);
    // app.use('/api/honeypots', authenticateToken, honeypotsRoutes);
    // app.use('/api/events', eventsRoutes);  // Primary events collection (Connection.md)
    // app.use('/api/honeypot-events', honeypotEventsRoutes);
    // app.use('/api/analysis', authenticateToken, analysisRoutes);
    app.use('/api/network-security', networkSecurityRouter(vpsApi)); // Enable network security routes with VPS API
    app.use('/api/enhanced/events', enhancedEventsRoutes); // Enable enhanced events with VPS API (has its own auth)
    app.use('/api/client-dashboard', clientDashboardRouter); // Enable client dashboard routes

    // Test endpoint to manually trigger WebSocket event (for debugging)
    app.post('/api/test/websocket', authenticateToken, async (req, res) => {
      try {
        const testEvent = {
          _id: new Date().getTime().toString(),
          honeypot_id: "test",
          protocol: "test",
          event_type: "test_event",
          timestamp: new Date().toISOString(),
          source_ip: "127.0.0.1",
          severity: "medium",
          data: { message: "Test WebSocket event" }
        };
        
        // Manually emit via WebSocket
        if (global.io) {
          global.io.emit('new-event', testEvent);
          console.log('📡 Test event emitted via WebSocket');
        }
        
        res.json({ success: true, event: testEvent });
      } catch (error) {
        console.error('Test WebSocket error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Test VPS API data retrieval
    app.get('/api/test/vps-data', async (req, res) => {
      try {
        console.log('🔍 Testing VPS API data retrieval...');
        
        // Get system overview
        const overview = await vpsApi.getSystemOverview();
        console.log('📊 System overview retrieved');
        
        // Get collections list
        const collections = await vpsApi.getCollectionsList();
        console.log('📚 Collections list retrieved');
        
        // Get analytics
        const analytics = await vpsApi.getAnalytics('24h');
        console.log('📈 Analytics retrieved');
        
        // Get sample data from first collection
        let sampleData = null;
        if (collections.collections && collections.collections.length > 0) {
          const firstCollection = collections.collections[0];
          sampleData = await vpsApi.getCollectionDetails(firstCollection.name, { limit: 5 });
          console.log(`📄 Sample data from ${firstCollection.name} retrieved`);
        }
        
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          vpsApi: 'connected',
          data: {
            overview,
            collections,
            analytics,
            sampleData
          }
        });
      } catch (error) {
        console.error('VPS API test error:', error);
        res.status(500).json({ 
          error: 'Failed to retrieve VPS API data',
          details: error.message 
        });
      }
    });

    // Test deception detection data (no auth required for development)
    app.get('/api/test/deception-detection', async (req, res) => {
      try {
        console.log('🔍 Testing deception detection data retrieval...');
        
        // Get collections list from VPS API
        const collections = await vpsApi.getCollectionsList();
        
        // Filter for deception-related collections
        const deceptionCollections = (collections.collections || []).filter(c =>
          c.name === 'deception_detection' || c.name.startsWith('client_')
        );
        
        let allDeceptionEvents = [];
        
        // Fetch deception events from relevant collections
        for (const collection of deceptionCollections) {
          try {
            const collectionData = await vpsApi.getCollectionDetails(collection.name, {
              limit: 10,
              data_type: 'deception_event'
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
                clientId: event.client_id || 'test',
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
        
        console.log(`🍯 Retrieved ${allDeceptionEvents.length} deception detection events for testing`);
        
        res.json(allDeceptionEvents);
        
      } catch (error) {
        console.error('❌ Error fetching deception detection data:', error);
        res.status(500).json({ 
          error: 'Failed to fetch deception detection data',
          details: error.message 
        });
      }
    });

    // Test deception detection stats (no auth required for development)
    app.get('/api/test/deception-detection/stats', async (req, res) => {
      try {
        console.log('📊 Testing deception detection stats retrieval...');
        
        // Get collections list from VPS API
        const collections = await vpsApi.getCollectionsList();
        
        // Filter for deception-related collections
        const deceptionCollections = (collections.collections || []).filter(c =>
          c.name === 'deception_detection' || c.name.startsWith('client_')
        );
        
        const stats = {
          total: 0,
          by_severity: {},
          by_note_type: {},
          unique_ips: 0,
          time_range: '24h'
        };

        let allEvents = [];
        const uniqueIPs = new Set();
        
        // Fetch events from all collections for statistics
        for (const collection of deceptionCollections) {
          try {
            const collectionData = await vpsApi.getCollectionDetails(collection.name, {
              limit: 100, // Get more data for accurate stats
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
        console.error('❌ Error fetching deception detection stats:', error);
        res.status(500).json({ 
          error: 'Failed to fetch deception detection stats',
          details: error.message 
        });
      }
    });

    console.log('✅ VPS API routes mounted successfully');
    
  } catch (error) {
    console.warn('⚠️  Failed to initialize VPS API connection:', error.message);
    console.log('🔄 Continuing with limited functionality...');
    console.log('📋 Only basic endpoints available: /api/health, /api/info, /api/test, /api/auth/*');
    
    // Set global variables to indicate VPS API status
    global.vpsApiStatus = 'disconnected';
    
    // Initialize WebSocket server without VPS API (limited functionality)
    try {
      if (!global.io) {
        console.log('🔄 Initializing WebSocket server without VPS API...');
        const io = initializeWebSocket(httpServer, null);
        global.io = io;
        console.log('✅ WebSocket server initialized (limited functionality)');
      } else {
        console.log('⚠️  WebSocket server already initialized, skipping...');
      }
    } catch (wsError) {
      console.warn('⚠️  Failed to initialize WebSocket server:', wsError.message);
      global.io = null;
    }
  }

  // Start server regardless of VPS API connection status
  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    if (global.vpsApiStatus === 'connected') {
      console.log(`🚀 AdvDeception Backend ready on port ${PORT} (with VPS API)`);
      console.log('🔒 Client data isolation enabled');
    } else {
      console.log(`🚀 AdvDeception Backend ready on port ${PORT} (without VPS API)`);
      console.log('⚠️  Running in degraded mode - VPS API features unavailable');
      console.log('📋 Available endpoints: /api/health, /api/info, /api/test, /api/auth/*');
      if (global.io) {
        console.log('🔌 WebSocket server available (limited functionality)');
      }
    }
  });
})();
