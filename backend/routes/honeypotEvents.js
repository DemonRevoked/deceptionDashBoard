const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = function(db) {
  const eventsCol = db.collection('events');
  const rawLogsCol = db.collection('raw_logs');

  // Fetch honeypot events (filterable by protocol, honeypot, source_ip, event_type)
  router.get('/', async (req, res) => {
    try {
      console.log('Fetching events with query:', req.query);
      const { protocol, honeypot_id, source_ip, event_type, limit = 100 } = req.query;
      const query = {};
      if (protocol) query.protocol = protocol;
      if (honeypot_id) {
        // Try both string and ObjectId matching for honeypot_id
        if (ObjectId.isValid(honeypot_id)) {
          query.$or = [
            { honeypot_id: honeypot_id }, // Match string
            { honeypot_id: new ObjectId(honeypot_id) } // Match ObjectId
          ];
          console.log('Using honeypot_id:', honeypot_id);
          console.log('Query with $or:', JSON.stringify(query.$or, null, 2));
        } else {
          query.honeypot_id = honeypot_id;
        }
      }
      if (source_ip) query.source_ip = source_ip;
      if (event_type) query.event_type = event_type;

      console.log('MongoDB query:', JSON.stringify(query, null, 2));
      const events = await eventsCol
        .find(query)
        .sort({ timestamp: -1 })
        .limit(Number(limit))
        .toArray();

      console.log(`Found ${events.length} events`);
      if (events.length === 0) {
        // Check if the honeypot exists
        const honeypotQuery = ObjectId.isValid(honeypot_id) 
          ? { $or: [{ _id: honeypot_id }, { _id: new ObjectId(honeypot_id) }] }
          : { _id: honeypot_id };
        const honeypot = await db.collection('honeypots').findOne(honeypotQuery);
        console.log('Honeypot exists?', !!honeypot);
        if (honeypot) {
          // Check all events for this honeypot without other filters
          const allEvents = await eventsCol.find({ honeypot_id: honeypot._id.toString() }).toArray();
          console.log(`Total events for this honeypot: ${allEvents.length}`);
        }
      }
      
      // Convert MongoDB timestamps to ISO strings for consistent handling
      const formattedEvents = events.map(event => ({
        ...event,
        _id: event._id.toString(),
        honeypot_id: event.honeypot_id.toString(),
        raw_log_id: event.raw_log_id?.toString(),
        timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp,
        start_time: event.start_time instanceof Date ? event.start_time.toISOString() : event.start_time,
        end_time: event.end_time instanceof Date ? event.end_time.toISOString() : event.end_time
      }));

      res.json(formattedEvents);
    } catch (e) {
      console.error('Error fetching events:', e);
      res.status(500).json({ error: 'Failed to fetch honeypot events' });
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
      const logs = await rawLogsCol
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

  // Fetch specific event by ID
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid event ID' });
      }

      const event = await eventsCol.findOne({ _id: new ObjectId(id) });
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Convert MongoDB timestamps to ISO strings
      const formattedEvent = {
        ...event,
        _id: event._id.toString(),
        honeypot_id: event.honeypot_id.toString(),
        raw_log_id: event.raw_log_id?.toString(),
        timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp,
        start_time: event.start_time instanceof Date ? event.start_time.toISOString() : event.start_time,
        end_time: event.end_time instanceof Date ? event.end_time.toISOString() : event.end_time
      };

      res.json(formattedEvent);
    } catch (e) {
      console.error('Error fetching event:', e);
      res.status(500).json({ error: 'Failed to fetch event details' });
    }
  });

  return router;
}; 