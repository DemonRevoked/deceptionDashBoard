const express = require('express');
const { authenticateClient, authenticateAdmin, canAccessClientData } = require('../middleware/clientAuth');
const VpsApiService = require('../services/vpsApi');

const router = express.Router();

module.exports = function() {
  const vpsApi = new VpsApiService();

  // GET: Consolidated events from VPS API with client isolation
  router.get('/', authenticateClient, async (req, res) => {
    try {
      const { 
        protocol, 
        honeypot_id, 
        source_ip, 
        event_type, 
        severity,
        limit = 100,
        hours = 24,
        include_raw = false
      } = req.query;

      // Build filters for VPS API
      const filters = {
        page: 1,
        limit: Number(limit)
      };
      
      if (severity) filters.severity = severity;
      if (source_ip) filters.source_ip = source_ip;
      if (hours && hours !== 'all') {
        const hoursAgo = new Date();
        hoursAgo.setHours(hoursAgo.getHours() - Number(hours));
        filters.start_date = hoursAgo.toISOString();
        filters.end_date = new Date().toISOString();
      }

      console.log(`Fetching events for client ${req.clientId} with filters:`, filters);
      
      // Fetch events from VPS API for the authenticated client
      const clientData = await vpsApi.getClientData(req.clientId, 'scan_alert', filters);
      
      if (!clientData.success) {
        return res.status(500).json({ error: 'Failed to fetch data from VPS API' });
      }

      // Transform VPS data to match frontend expectations
      const formattedEvents = clientData.data.map(event => vpsApi.transformScanAlert(event));

      // Apply additional client-side filtering
      let filteredEvents = formattedEvents;
      
      if (protocol) {
        filteredEvents = filteredEvents.filter(event => event.protocol === protocol);
      }
      
      if (honeypot_id) {
        filteredEvents = filteredEvents.filter(event => 
          event.metadata?.honeypot_id === honeypot_id || 
          event.description?.includes(honeypot_id)
        );
      }
      
      if (event_type) {
        filteredEvents = filteredEvents.filter(event => 
          event.eventType === event_type || 
          event.description?.includes(event_type)
        );
      }

      // Sort by timestamp and limit results
      const sortedEvents = filteredEvents
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, Number(limit));

      console.log(`Found ${sortedEvents.length} events for client ${req.clientId}`);

      res.json(sortedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET: Get specific event by ID (with client isolation)
  router.get('/:id', authenticateClient, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Search for the specific event in client data
      const filters = { query: id };
      const searchResults = await vpsApi.searchData(id, { client_id: req.clientId });
      
      if (!searchResults.success || !searchResults.results || searchResults.results.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Find the exact event by ID
      const event = searchResults.results.find(e => 
        e._id === id || e.data_id === id || e.id === id
      );

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Ensure the event belongs to the authenticated client
      if (event.client_id !== req.clientId) {
        return res.status(403).json({ error: 'Access denied: Cannot access other client data' });
      }

      const formattedEvent = vpsApi.transformScanAlert(event);
      res.json(formattedEvent);
    } catch (error) {
      console.error('Error fetching event:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST: Submit new event data to VPS API
  router.post('/', authenticateClient, async (req, res) => {
    try {
      const eventData = {
        ...req.body,
        client_id: req.clientId,
        timestamp: req.body.timestamp || new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      // Submit to VPS API
      const result = await vpsApi.submitClientData(req.clientId, eventData);
      
      if (!result.success) {
        return res.status(500).json({ error: 'Failed to submit data to VPS API' });
      }

      res.status(201).json({
        success: true,
        message: 'Event submitted successfully',
        data_id: result.data_id,
        timestamp: result.timestamp
      });
    } catch (error) {
      console.error('Error submitting event:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET: Get events by severity (with client isolation)
  router.get('/severity/:level', authenticateClient, async (req, res) => {
    try {
      const { level } = req.params;
      const { limit = 100 } = req.query;

      const filters = {
        severity: level,
        limit: Number(limit)
      };

      const clientData = await vpsApi.getClientData(req.clientId, 'scan_alert', filters);
      
      if (!clientData.success) {
        return res.status(500).json({ error: 'Failed to fetch data from VPS API' });
      }

      const formattedEvents = clientData.data.map(event => vpsApi.transformScanAlert(event));
      
      res.json(formattedEvents);
    } catch (error) {
      console.error('Error fetching events by severity:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET: Get events by source IP (with client isolation)
  router.get('/source/:ip', authenticateClient, async (req, res) => {
    try {
      const { ip } = req.params;
      const { limit = 100 } = req.query;

      const filters = {
        source_ip: ip,
        limit: Number(limit)
      };

      const clientData = await vpsApi.getClientData(req.clientId, 'scan_alert', filters);
      
      if (!clientData.success) {
        return res.status(500).json({ error: 'Failed to fetch data from VPS API' });
      }

      const formattedEvents = clientData.data.map(event => vpsApi.transformScanAlert(event));
      
      res.json(formattedEvents);
    } catch (error) {
      console.error('Error fetching events by source IP:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET: Get client statistics (with client isolation)
  router.get('/stats/summary', authenticateClient, async (req, res) => {
    try {
      const clientStatus = await vpsApi.getClientStatus(req.clientId);
      
      if (!clientStatus.success) {
        return res.status(500).json({ error: 'Failed to fetch client status from VPS API' });
      }

      res.json({
        success: true,
        client_id: req.clientId,
        statistics: clientStatus.statistics || [],
        recent_submissions: clientStatus.recent_submissions || [],
        total_submissions: clientStatus.total_submissions || 0
      });
    } catch (error) {
      console.error('Error fetching client statistics:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin endpoints for cross-client data access
  router.get('/admin/all', authenticateAdmin, async (req, res) => {
    try {
      const { limit = 100, hours = 24 } = req.query;
      
      // Get system overview from VPS API
      const overview = await vpsApi.getSystemOverview();
      
      if (!overview.success) {
        return res.status(500).json({ error: 'Failed to fetch system overview from VPS API' });
      }

      res.json({
        success: true,
        overview: overview.overview,
        total_records: overview.overview.total_records,
        total_clients: overview.overview.total_clients
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
