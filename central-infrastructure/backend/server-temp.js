// Temporary backend server for testing frontend login
// This server runs without database connection to test frontend functionality

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createServer } = require('http');

require('dotenv').config();

const app = express();
const httpServer = createServer(app);

// Configure CORS
app.use(cors({
  origin: ['http://10.0.44.3:3000', 'http://10.0.44.32:3000', 'http://10.0.44.77:3000', 'http://localhost:3000', 'http://frontend:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(bodyParser.json());

// Mock authentication endpoint for testing
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Login attempt:', { username, timestamp: new Date().toISOString() });
    
    // Mock authentication - accept any credentials for testing
    if (username && password) {
      const mockToken = 'mock_jwt_token_' + Date.now();
      const mockUser = {
        id: 'mock_user_id',
        username: username,
        role: 'admin',
        permissions: ['read', 'write', 'admin']
      };
      
      console.log('✅ Mock login successful for:', username);
      
      res.json({
        success: true,
        token: mockToken,
        user: mockUser,
        message: 'Mock authentication successful (for testing purposes)'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }
  } catch (error) {
    console.error('❌ Mock login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Mock health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        backend: {
          status: 'running',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          note: 'Mock backend server for testing'
        },
        database: {
          status: 'disconnected',
          lastChecked: new Date().toISOString(),
          note: 'Mock server - no database connection'
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

// Mock info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'AdvDeception Mock Backend',
    version: '1.0.0',
    status: 'running',
    mode: 'mock',
    note: 'This is a temporary mock server for testing frontend functionality'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Mock backend is working!',
    timestamp: new Date().toISOString(),
    note: 'This server is running without database connection for testing purposes'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Mock AdvDeception Backend running on port ${PORT}`);
  console.log('⚠️  This is a temporary mock server for testing frontend functionality');
  console.log('📋 Available endpoints:');
  console.log('   - POST /api/auth/login (mock authentication)');
  console.log('   - GET /api/health (health check)');
  console.log('   - GET /api/info (server info)');
  console.log('   - GET /api/test (test endpoint)');
  console.log('');
  console.log('🔍 Frontend can now test login functionality');
  console.log('💡 To connect to VPS database, resolve authentication issues first');
});
