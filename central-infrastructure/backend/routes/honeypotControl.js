const express = require('express');
const { ObjectId } = require('mongodb');
const axios = require('axios');
const router = express.Router();

module.exports = function(db) {
  const honeypotsCol = db.collection('honeypots');

  // Helper function to make requests to Honeypot Manager
  async function managerRequest(method, path, data = null) {
    const baseURL = process.env.HONEYPOT_MANAGER_URL || 'http://10.0.44.32:6000';
    const headers = {
      'X-Api-Secret': process.env.HONEYPOT_MANAGER_SECRET || 'your_secure_secret_here'
    };

    try {
      const response = await axios({
        method,
        url: `${baseURL}${path}`,
        headers,
        data,
        timeout: 5000 // 5 second timeout
      });
      return response.data;
    } catch (error) {
      console.error(`Error in Honeypot Manager request: ${error.message}`);
      
      // Return proper error when honeypot manager is unavailable
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        throw new Error('Honeypot Manager is not available. Please ensure the honeypot manager service is running.');
      }
      
      throw error;
    }
  }

  // Get all honeypots
  router.get('/', async (req, res) => {
    try {
      const honeypots = await honeypotsCol.find().toArray();
      res.json(honeypots);
    } catch (error) {
      console.error('Error fetching honeypots:', error);
      res.status(500).json({ error: 'Failed to fetch honeypots' });
    }
  });

  // Get honeypot statuses
  router.get('/status', async (req, res) => {
    try {
      const statuses = await managerRequest('GET', '/status');
      res.json(statuses);
    } catch (error) {
      console.error('Error fetching honeypot statuses:', error);
      res.status(503).json({ 
        error: 'Honeypot Manager unavailable', 
        details: error.message 
      });
    }
  });

  // Start honeypot
  router.post('/start/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await managerRequest('POST', '/start', { honeypot_id: id });
      res.json(result);
    } catch (error) {
      console.error('Error starting honeypot:', error);
      res.status(503).json({ 
        error: 'Failed to start honeypot', 
        details: error.message 
      });
    }
  });

  // Stop honeypot
  router.post('/stop/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await managerRequest('POST', '/stop', { honeypot_id: id });
      res.json(result);
    } catch (error) {
      console.error('Error stopping honeypot:', error);
      res.status(503).json({ 
        error: 'Failed to stop honeypot', 
        details: error.message 
      });
    }
  });

  return router;
}; 