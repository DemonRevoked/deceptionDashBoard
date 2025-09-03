const express = require('express');
const { authenticateClient, authenticateAdmin } = require('../middleware/clientAuth');
const VpsApiService = require('../services/vpsApi');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');

module.exports = function() {
  const vpsApi = new VpsApiService();

  // List all honeypots derived from deception detection events (client isolated)
  router.get('/', authenticateClient, async (req, res) => {
    try {
      const { category, status, type } = req.query;
      
      // Get honeypot data from VPS API for the authenticated client
      const clientData = await vpsApi.getClientData(req.clientId, 'deception_event', {
        limit: 1000 // Get more data for aggregation
      });
      
      if (!clientData.success) {
        return res.status(500).json({ error: 'Failed to fetch data from VPS API' });
      }

      // Process deception events to extract honeypot information
      const honeypotMap = new Map();
      
      clientData.data.forEach(event => {
        const port = event.dest_port || event.port || 'unknown';
        const key = `${port}_${event.note_type || event.data_type}`;
        
        if (!honeypotMap.has(key)) {
          honeypotMap.set(key, {
            _id: key,
            honeypot_name: event.note_type || event.data_type || 'Unknown',
            category: event.attack_category || 'Unknown',
            status: 'active',
            type: event.note_type || event.data_type || 'Unknown',
            last_interaction: event.timestamp,
            interaction_count: 0,
            source_ips: new Set()
          });
        }
        
        const honeypot = honeypotMap.get(key);
        honeypot.interaction_count++;
        honeypot.source_ips.add(event.source_ip);
        
        if (new Date(event.timestamp) > new Date(honeypot.last_interaction)) {
          honeypot.last_interaction = event.timestamp;
        }
      });

      // Convert to array and format
      let honeypots = Array.from(honeypotMap.values()).map(hp => ({
        ...hp,
        _id: hp._id,
        name: hp.honeypot_name,
        category: hp.category,
        status: hp.interaction_count > 0 ? 'active' : 'inactive',
        type: hp.type,
        last_interaction: hp.last_interaction,
        interaction_count: hp.interaction_count,
        unique_attackers: hp.source_ips.size,
        port: hp._id.split('_')[0]
      }));
      
      // Apply filters
      if (category) {
        honeypots = honeypots.filter(hp => hp.category === category);
      }
      if (status) {
        honeypots = honeypots.filter(hp => hp.status === status);
      }
      if (type) {
        honeypots = honeypots.filter(hp => hp.type === type);
      }
      
      // Add synthetic IDs for frontend compatibility
      const formattedHoneypots = honeypots.map((hp, index) => ({
        ...hp,
        _id: `honeypot_${index + 1}`,
        port: hp.port
      }));
      
      res.json(formattedHoneypots);
    } catch (e) {
      console.error('Error fetching honeypots:', e);
      res.status(500).json({ error: 'Failed to fetch honeypots' });
    }
  });

  // Get honeypots by category (OT, IT, etc.) - client isolated
  router.get('/category/:category', authenticateClient, async (req, res) => {
    try {
      const { category } = req.params;
      
      // Get deception events for the specific category
      const clientData = await vpsApi.getClientData(req.clientId, 'deception_event', {
        limit: 1000
      });
      
      if (!clientData.success) {
        return res.status(500).json({ error: 'Failed to fetch data from VPS API' });
      }

      // Filter by category and process
      const categoryEvents = clientData.data.filter(event => 
        event.attack_category === category
      );

      const honeypotMap = new Map();
      
      categoryEvents.forEach(event => {
        const port = event.dest_port || event.port || 'unknown';
        const key = `${port}_${event.note_type || event.data_type}`;
        
        if (!honeypotMap.has(key)) {
          honeypotMap.set(key, {
            _id: key,
            honeypot_name: event.note_type || event.data_type || 'Unknown',
            category: event.attack_category || 'Unknown',
            status: 'active',
            type: event.note_type || event.data_type || 'Unknown',
            last_interaction: event.timestamp,
            interaction_count: 0,
            source_ips: new Set()
          });
        }
        
        const honeypot = honeypotMap.get(key);
        honeypot.interaction_count++;
        honeypot.source_ips.add(event.source_ip);
        
        if (new Date(event.timestamp) > new Date(honeypot.last_interaction)) {
          honeypot.last_interaction = event.timestamp;
        }
      });

      const honeypots = Array.from(honeypotMap.values()).map(hp => ({
        ...hp,
        _id: hp._id,
        name: hp.honeypot_name,
        category: hp.category,
        status: hp.interaction_count > 0 ? 'active' : 'inactive',
        type: hp.type,
        last_interaction: hp.last_interaction,
        interaction_count: hp.interaction_count,
        unique_attackers: hp.source_ips.size,
        port: hp._id.split('_')[0]
      }));

      res.json(honeypots);
    } catch (e) {
      console.error('Error fetching honeypots by category:', e);
      res.status(500).json({ error: 'Failed to fetch honeypots by category' });
    }
  });

  // Get honeypot details by ID - client isolated
  router.get('/:id', authenticateClient, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Search for honeypot events in client data
      const searchResults = await vpsApi.searchData(id, { 
        client_id: req.clientId,
        data_type: 'deception_event'
      });
      
      if (!searchResults.success || !searchResults.results || searchResults.results.length === 0) {
        return res.status(404).json({ error: 'Honeypot not found' });
      }

      // Find the specific honeypot
      const honeypotEvent = searchResults.results.find(e => 
        e._id === id || e.dest_port === id || e.port === id
      );

      if (!honeypotEvent) {
        return res.status(404).json({ error: 'Honeypot not found' });
      }

      // Ensure the event belongs to the authenticated client
      if (honeypotEvent.client_id !== req.clientId) {
        return res.status(403).json({ error: 'Access denied: Cannot access other client data' });
      }

      // Get all events for this honeypot
      const honeypotEvents = await vpsApi.getClientData(req.clientId, 'deception_event', {
        source_ip: honeypotEvent.source_ip,
        limit: 100
      });

      const formattedHoneypot = {
        _id: honeypotEvent._id || honeypotEvent.dest_port || honeypotEvent.port,
        name: honeypotEvent.note_type || honeypotEvent.data_type || 'Unknown',
        category: honeypotEvent.attack_category || 'Unknown',
        status: 'active',
        type: honeypotEvent.note_type || honeypotEvent.data_type || 'Unknown',
        last_interaction: honeypotEvent.timestamp,
        interaction_count: honeypotEvents.data ? honeypotEvents.data.length : 0,
        unique_attackers: new Set(honeypotEvents.data?.map(e => e.source_ip) || []).size,
        port: honeypotEvent.dest_port || honeypotEvent.port || 'unknown',
        events: honeypotEvents.data || []
      };

      res.json(formattedHoneypot);
    } catch (e) {
      console.error('Error fetching honeypot details:', e);
      res.status(500).json({ error: 'Failed to fetch honeypot details' });
    }
  });

  // Get honeypot statistics - client isolated
  router.get('/stats/summary', authenticateClient, async (req, res) => {
    try {
      const { hours = 24 } = req.query;
      
      // Get deception events for statistics
      const filters = { limit: 1000 };
      if (hours && hours !== 'all') {
        const hoursAgo = new Date();
        hoursAgo.setHours(hoursAgo.getHours() - Number(hours));
        filters.start_date = hoursAgo.toISOString();
        filters.end_date = new Date().toISOString();
      }

      const clientData = await vpsApi.getClientData(req.clientId, 'deception_event', filters);
      
      if (!clientData.success) {
        return res.status(500).json({ error: 'Failed to fetch data from VPS API' });
      }

      // Calculate statistics
      const stats = {
        total_honeypots: 0,
        active_honeypots: 0,
        total_interactions: 0,
        unique_attackers: new Set(),
        by_category: {},
        by_severity: {},
        time_range: `${hours}h`
      };

      const honeypotMap = new Map();
      
      clientData.data.forEach(event => {
        const port = event.dest_port || event.port || 'unknown';
        const key = `${port}_${event.note_type || event.data_type}`;
        
        if (!honeypotMap.has(key)) {
          honeypotMap.set(key, { interactions: 0, attackers: new Set() });
        }
        
        const honeypot = honeypotMap.get(key);
        honeypot.interactions++;
        honeypot.attackers.add(event.source_ip);
        stats.unique_attackers.add(event.source_ip);
        
        // Category stats
        const category = event.attack_category || 'Unknown';
        stats.by_category[category] = (stats.by_category[category] || 0) + 1;
        
        // Severity stats
        const severity = event.severity || 'unknown';
        stats.by_severity[severity] = (stats.by_severity[severity] || 0) + 1;
      });

      stats.total_honeypots = honeypotMap.size;
      stats.active_honeypots = Array.from(honeypotMap.values()).filter(hp => hp.interactions > 0).length;
      stats.total_interactions = clientData.data.length;
      stats.unique_attackers = stats.unique_attackers.size;

      res.json(stats);
    } catch (e) {
      console.error('Error fetching honeypot statistics:', e);
      res.status(500).json({ error: 'Failed to fetch honeypot statistics' });
    }
  });

  // Admin endpoint for cross-client honeypot overview
  router.get('/admin/overview', authenticateAdmin, async (req, res) => {
    try {
      // Get system overview from VPS API
      const overview = await vpsApi.getSystemOverview();
      
      if (!overview.success) {
        return res.status(500).json({ error: 'Failed to fetch system overview from VPS API' });
      }

      res.json({
        success: true,
        overview: overview.overview,
        total_honeypots: overview.overview.total_collections || 0,
        total_clients: overview.overview.total_clients || 0
      });
    } catch (e) {
      console.error('Error fetching admin honeypot overview:', e);
      res.status(500).json({ error: 'Failed to fetch admin overview' });
    }
  });

  return router;
};