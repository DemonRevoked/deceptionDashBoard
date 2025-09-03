// switch to CommonJS (or add "type":"module" in package.json if you prefer ESM)

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createServer } = require('http');

// Import modular routes (without database dependency)
const authRouter = require('./routes/auth');
const { authenticateToken } = require('./middleware/auth');

require('dotenv').config();

const app = express();
const httpServer = createServer(app);

// Environment validation happens at startup

// Configure CORS
app.use(cors({
  origin: ['http://10.0.44.3:3000', 'http://10.0.44.32:3000', 'http://localhost:3000', 'http://frontend:3000'],
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
        database: {
          status: 'disconnected',
          lastChecked: new Date().toISOString(),
          note: 'Running in no-database mode'
        },
        websocket: {
          status: 'inactive',
          connections: 0,
          lastChecked: new Date().toISOString(),
          note: 'WebSocket disabled in no-database mode'
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
        database: {
          status: 'disconnected',
          lastChecked: new Date().toISOString(),
          responseTime: 0,
          note: 'Running in no-database mode'
        },
        websocket: {
          status: 'inactive',
          connections: 0,
          lastChecked: new Date().toISOString(),
          note: 'WebSocket disabled in no-database mode'
        }
      }
    };

    // Calculate overall health status
    const services = health.services;
    const criticalServices = ['backend'];
    const criticalDown = criticalServices.some(service => 
      services[service].status === 'error' || services[service].status === 'disconnected'
    );
    
    if (criticalDown) {
      health.status = 'unhealthy';
    } else {
      health.status = 'degraded'; // Database is disconnected, so degraded
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
    mode: 'no-database',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    note: 'Running without database connection for testing purposes'
  });
});

// Mount basic routes (without database dependency)
app.use('/api/auth', authRouter);

// Test endpoint for basic functionality
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is running without database',
    timestamp: new Date().toISOString(),
    status: 'operational'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message,
    mode: 'no-database'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    message: 'This endpoint is not available in no-database mode',
    available_endpoints: [
      '/api/health',
      '/api/health/quick',
      '/api/info',
      '/api/test',
      '/api/auth/*'
    ]
  });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AdvDeception Backend (No-DB Mode) ready on port ${PORT}`);
  console.log('⚠️  Running without database connection');
  console.log('📋 Available endpoints: /api/health, /api/info, /api/test, /api/auth/*');
});
