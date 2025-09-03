const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = function(db) {
  const deceptionDetectionCol = db.collection('deception_detection');  // Use streamlined collection

  // Fetch honeypot events (filterable by protocol, honeypot, source_ip, event_type, category)
  router.get('/', async (req, res) => {
    try {
      console.log('Fetching deception detection events with query:', req.query);
      const { protocol, honeypot_id, source_ip, event_type, category, limit = 100 } = req.query;
      const query = {};
      if (protocol) query.protocol = protocol;
      if (category) query.category = category;
      if (honeypot_id) {
        // Try both string and ObjectId matching for honeypot_id, and also check honeypot_name
        if (ObjectId.isValid(honeypot_id)) {
          query.$or = [
            { honeypot_id: honeypot_id }, // Match string
            { honeypot_id: new ObjectId(honeypot_id) }, // Match ObjectId
            { honeypot_name: honeypot_id } // Match OT honeypot name
          ];
          console.log('Using honeypot_id:', honeypot_id);
          console.log('Query with $or:', JSON.stringify(query.$or, null, 2));
        } else {
          query.$or = [
            { honeypot_id: honeypot_id },
            { honeypot_name: honeypot_id }
          ];
        }
      }
      if (source_ip) query.source_ip = source_ip;
      if (event_type) query.event_type = event_type;

      console.log('MongoDB query:', JSON.stringify(query, null, 2));
      const events = await deceptionDetectionCol
        .find(query)
        .sort({ timestamp: -1 })
        .limit(Number(limit))
        .toArray();

      console.log(`Found ${events.length} deception detection events`);
      
      // Convert MongoDB timestamps to ISO strings for consistent handling
      const formattedEvents = events.map(event => ({
        ...event,
        _id: event._id.toString(),
        honeypot_id: event.honeypot_id?.toString() || event.honeypot_name || null,
        raw_log_id: event.raw_log_id?.toString() || null,
        timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp,
        start_time: event.start_time instanceof Date ? event.start_time.toISOString() : event.start_time,
        end_time: event.end_time instanceof Date ? event.end_time.toISOString() : event.end_time
      }));

      res.json(formattedEvents);
    } catch (e) {
      console.error('Error fetching deception detection events:', e);
      res.status(500).json({ error: 'Failed to fetch deception detection events' });
    }
  });

  // Fetch raw session logs (for auditing/debugging)
  router.get('/raw-logs', async (req, res) => {
    try {
      console.log('Fetching raw logs with query:', req.query);
      const { protocol, honeypot_id, source_ip, limit = 100 } = req.query;
      const query = {};
      if (protocol) query.protocol = protocol;
      if (honeypot_id && ObjectId.isValid(honeypot_id)) query.honeypot_id = new ObjectId(honeypot_id);
      if (source_ip) query.source_ip = source_ip;

      console.log('MongoDB query:', query);
      const logs = await db.collection('raw_logs')
        .find(query)
        .sort({ timestamp: -1 })
        .limit(Number(limit))
        .toArray();

      console.log(`Found ${logs.length} raw logs`);
      
      // Convert MongoDB timestamps to ISO strings
      const formattedLogs = logs.map(log => ({
        ...log,
        timestamp: log.timestamp instanceof Date ? log.timestamp.toISOString() : log.timestamp
      }));

      res.json(formattedLogs);
    } catch (e) {
      console.error('Error fetching raw logs:', e);
      res.status(500).json({ error: 'Failed to fetch raw session logs' });
    }
  });

  // Fetch recent events (last 24 hours by default)
  router.get('/recent', async (req, res) => {
    try {
      console.log('Fetching recent deception detection events with query:', req.query);
      const { 
        protocol, 
        honeypot_id, 
        source_ip, 
        event_type, 
        category, 
        hours = 24, 
        limit = 100 
      } = req.query;

      // Calculate time filter for recent events
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - Number(hours));

      const query = {
        timestamp: { $gte: hoursAgo.toISOString() }
      };

      if (protocol) query.protocol = protocol;
      if (category) query.category = category;
      if (honeypot_id) {
        if (ObjectId.isValid(honeypot_id)) {
          query.$or = [
            { honeypot_id: honeypot_id },
            { honeypot_id: new ObjectId(honeypot_id) },
            { honeypot_name: honeypot_id }
          ];
        } else {
          query.$or = [
            { honeypot_id: honeypot_id },
            { honeypot_name: honeypot_id }
          ];
        }
      }
      if (source_ip) query.source_ip = source_ip;
      if (event_type) query.event_type = event_type;

      console.log('Recent events MongoDB query:', JSON.stringify(query, null, 2));
      const events = await deceptionDetectionCol
        .find(query)
        .sort({ timestamp: -1 })
        .limit(Number(limit))
        .toArray();

      console.log(`Found ${events.length} recent deception detection events`);
      
      // Convert MongoDB timestamps to ISO strings for consistent handling
      const formattedEvents = events.map(event => ({
        ...event,
        _id: event._id.toString(),
        honeypot_id: event.honeypot_id?.toString() || event.honeypot_name || null,
        raw_log_id: event.raw_log_id?.toString() || null,
        timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp,
        start_time: event.start_time instanceof Date ? event.start_time.toISOString() : event.start_time,
        end_time: event.end_time instanceof Date ? event.end_time.toISOString() : event.end_time
      }));

      res.json(formattedEvents);
    } catch (e) {
      console.error('Error fetching recent deception detection events:', e);
      res.status(500).json({ error: 'Failed to fetch recent deception detection events' });
    }
  });

  // Fetch specific event by ID
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid event ID' });
      }

      const event = await deceptionDetectionCol.findOne({ _id: new ObjectId(id) });
      if (!event) {
        return res.status(404).json({ error: 'Deception detection event not found' });
      }

      // Convert MongoDB timestamps to ISO strings
      const formattedEvent = {
        ...event,
        _id: event._id.toString(),
        honeypot_id: event.honeypot_id?.toString() || event.honeypot_name || null,
        raw_log_id: event.raw_log_id?.toString() || null,
        timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp,
        start_time: event.start_time instanceof Date ? event.start_time.toISOString() : event.start_time,
        end_time: event.end_time instanceof Date ? event.end_time.toISOString() : event.end_time
      };

      res.json(formattedEvent);
    } catch (e) {
      console.error('Error fetching deception detection event:', e);
      res.status(500).json({ error: 'Failed to fetch deception detection event details' });
    }
  });

  return router;
}; 