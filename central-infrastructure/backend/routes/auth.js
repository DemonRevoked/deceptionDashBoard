const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
const { authenticateToken, authenticateAdmin, authenticateUser } = require('../middleware/auth');
require('dotenv').config();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const user = await authenticateUser(username, password);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        username: user.username, 
        role: user.role,
        client_id: user.client_id || null
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        username: user.username,
        role: user.role,
        client_id: user.client_id || null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Dashboard-specific login endpoint with enhanced response format
router.post('/dashboard-login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Username and password are required' 
    });
  }

  try {
    const user = await authenticateUser(username, password);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    const token = jwt.sign(
      { 
        username: user.username, 
        role: user.role,
        client_id: user.client_id || null
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Enhanced response format for dashboard
    const response = {
      success: true,
      message: 'Login successful',
      token,
      user: {
        username: user.username,
        client_id: user.client_id,
        role: user.role,
        permissions: user.role === 'admin' ? ['read:all_data', 'admin'] : ['read:own_data']
      },
      expires_in: '24h'
    };

    // Add client info for client users
    if (user.role === 'client' && user.client_id) {
      response.user.client_info = {
        client_id: user.client_id,
        name: `${user.client_id.charAt(0).toUpperCase() + user.client_id.slice(1)} Client`,
        description: `Client for ${user.client_id} data access`,
        active: true,
        rate_limit: 5000
      };
    }

    res.json(response);
  } catch (error) {
    console.error('Dashboard login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Create new user (admin only)
router.post('/users', authenticateToken, authenticateAdmin, async (req, res) => {
  const { username, password, role, client_id } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Username, password, and role are required' });
  }

  // Validate role
  if (!['admin', 'client'].includes(role)) {
    return res.status(400).json({ message: 'Role must be either "admin" or "client"' });
  }

  // Validate client_id for client users
  if (role === 'client' && !client_id) {
    return res.status(400).json({ message: 'Client ID is required for client users' });
  }

  let client;
  try {
    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db();
    const usersCol = db.collection('users');

    // Check if user already exists
    const existingUser = await usersCol.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = {
      username,
      password: hashedPassword,
      role,
      client_id: role === 'client' ? client_id : null,
      created_at: new Date(),
      active: true
    };

    const result = await usersCol.insertOne(newUser);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: result.insertedId,
        username: newUser.username,
        role: newUser.role,
        client_id: newUser.client_id
      }
    });

  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
});

// List users (admin only)
router.get('/users', authenticateToken, authenticateAdmin, async (req, res) => {
  let client;
  try {
    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db();
    const usersCol = db.collection('users');

    const users = await usersCol.find({}, { projection: { password: 0 } }).toArray();

    res.json({
      users: users.map(user => ({
        id: user._id,
        username: user.username,
        role: user.role,
        client_id: user.client_id,
        created_at: user.created_at,
        active: user.active
      }))
    });

  } catch (error) {
    console.error('User listing error:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
});

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  let client;
  try {
    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db();
    const usersCol = db.collection('users');

    const user = await usersCol.findOne(
      { username: req.user.username },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        client_id: user.client_id,
        created_at: user.created_at,
        active: user.active
      }
    });

  } catch (error) {
    console.error('User info error:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
});

module.exports = router; 