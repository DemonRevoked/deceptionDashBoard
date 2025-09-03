const jwt = require('jsonwebtoken');
const VpsApiService = require('../services/vpsApi');

const vpsApi = new VpsApiService();

// Middleware to authenticate client and ensure data isolation
const authenticateClient = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Check if user has a client_id
    if (!req.user.client_id) {
      return res.status(403).json({ message: 'Access denied: No client ID associated with user' });
    }

    // Store client ID for route handlers
    req.clientId = req.user.client_id;

    // Verify client exists and is active
    try {
      const clientStatus = await vpsApi.getClientStatus(req.user.client_id);
      if (!clientStatus.success) {
        return res.status(403).json({ message: 'Access denied: Invalid client' });
      }
    } catch (error) {
      return res.status(403).json({ message: 'Access denied: Client verification failed' });
    }

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Token expired' });
    }
    return res.status(500).json({ message: 'Authentication error' });
  }
};

// Middleware to ensure admin access
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admin privileges required' });
    }

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Token expired' });
    }
    return res.status(500).json({ message: 'Authentication error' });
  }
};

// Middleware to check if user can access specific client data
const canAccessClientData = (targetClientId) => {
  return (req, res, next) => {
    // Admin can access all client data
    if (req.user.role === 'admin') {
      return next();
    }

    // Regular users can only access their own client data
    if (req.user.client_id === targetClientId) {
      return next();
    }

    return res.status(403).json({ message: 'Access denied: Cannot access other client data' });
  };
};

module.exports = {
  authenticateClient,
  authenticateAdmin,
  canAccessClientData
};
