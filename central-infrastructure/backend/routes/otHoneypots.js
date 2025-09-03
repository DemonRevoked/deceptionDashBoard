const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = function(db) {
  const deceptionDetectionCol = db.collection('deception_detection');
  const scanAlertsCol = db.collection('scan_alerts');

  // Get all OT honeypots derived from deception detection events
  router.get('/', async (req, res) => {
    try {
      const { type, status } = req.query;
      
      // Get OT honeypot information from deception detection events
      const pipeline = [
        {
          $match: { 
            attack_category: 'ot_honeypot_engagement',
            note_type: { $regex: /OT|ot/, i: true }
          }
        },
        {
          $group: {
            _id: '$dest_port',
            honeypot_name: { $first: '$note_type' },
            category: { $first: '$attack_category' },
            status: { $first: '$status' },
            type: { $first: '$note_type' },
            last_interaction: { $max: '$timestamp' },
            interaction_count: { $sum: 1 },
            source_ips: { $addToSet: '$source_ip' }
          }
        },
        {
          $project: {
            _id: 1,
            name: '$honeypot_name',
            category: '$category',
            status: { $cond: [{ $gt: ['$interaction_count', 0] }, 'active', 'inactive'] },
            type: '$type',
            last_interaction: '$last_interaction',
            interaction_count: '$interaction_count',
            unique_attackers: { $size: '$source_ips' }
          }
        }
      ];
      
      let honeypots = await deceptionDetectionCol.aggregate(pipeline).toArray();
      
      // Apply filters
      if (type) {
        honeypots = honeypots.filter(hp => hp.type === type);
      }
      if (status) {
        honeypots = honeypots.filter(hp => hp.status === status);
      }
      
      // Convert ObjectIds to strings and add synthetic IDs
      const formattedHoneypots = honeypots.map((hp, index) => ({
        ...hp,
        _id: `ot_honeypot_${index + 1}`,
        port: hp._id
      }));
      
      res.json(formattedHoneypots);
    } catch (e) {
      console.error('Error fetching OT honeypots:', e);
      res.status(500).json({ error: 'Failed to fetch OT honeypots' });
    }
  });

  // Get OT honeypot dashboard statistics
  router.get('/dashboard-stats', async (req, res) => {
    try {
      const { timeframe = '24h' } = req.query;
      
      // Calculate time filter
      const now = new Date();
      let startTime;
      switch (timeframe) {
        case '1h':
          startTime = new Date(now - 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(now - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now - 24 * 60 * 60 * 1000);
      }
      
      // Get OT honeypot counts from deception detection
      const otCounts = await deceptionDetectionCol.aggregate([
        { 
          $match: { 
            attack_category: 'ot_honeypot_engagement',
            timestamp: { $gte: startTime.toISOString() }
          } 
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]).toArray();
      
      // Get threat levels for OT events
      const recentThreats = await deceptionDetectionCol.aggregate([
        { 
          $match: { 
            attack_category: 'ot_honeypot_engagement',
            timestamp: { $gte: startTime.toISOString() },
            severity: { $exists: true }
          } 
        },
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 }
          }
        }
      ]).toArray();
      
      // Get OT attack patterns
      const attackPatterns = await deceptionDetectionCol.aggregate([
        { 
          $match: { 
            attack_category: 'ot_honeypot_engagement',
            timestamp: { $gte: startTime.toISOString() },
            note_type: { $exists: true }
          } 
        },
        {
          $group: {
            _id: '$note_type',
            count: { $sum: 1 }
          }
        }
      ]).toArray();
      
      // Get unique attackers
      const uniqueAttackers = await deceptionDetectionCol.aggregate([
        { 
          $match: { 
            attack_category: 'ot_honeypot_engagement',
            timestamp: { $gte: startTime.toISOString() }
          } 
        },
        {
          $group: {
            _id: '$source_ip'
          }
        },
        {
          $count: 'uniqueAttackers'
        }
      ]).toArray();
      
      const stats = {
        timeframe,
        ot_honeypot_counts: otCounts,
        threat_levels: recentThreats,
        attack_patterns: attackPatterns,
        unique_attackers: uniqueAttackers[0]?.uniqueAttackers || 0,
        total_events: 0
      };
      
      // Calculate total events
      otCounts.forEach(item => {
        stats.total_events += item.count;
      });
      
      res.json(stats);
    } catch (e) {
      console.error('Error fetching OT honeypot dashboard stats:', e);
      res.status(500).json({ error: 'Failed to fetch OT honeypot dashboard stats' });
    }
  });

  // Get OT honeypot by ID (port)
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get OT honeypot information from deception detection events
      const pipeline = [
        {
          $match: { 
            dest_port: id,
            attack_category: 'ot_honeypot_engagement'
          }
        },
        {
          $group: {
            _id: '$dest_port',
            honeypot_name: { $first: '$note_type' },
            category: { $first: '$attack_category' },
            status: { $first: '$status' },
            type: { $first: '$note_type' },
            last_interaction: { $max: '$timestamp' },
            interaction_count: { $sum: 1 },
            source_ips: { $addToSet: '$source_ip' },
            recent_events: { $push: '$$ROOT' }
          }
        },
        {
          $project: {
            _id: 1,
            name: '$honeypot_name',
            category: '$category',
            status: { $cond: [{ $gt: ['$interaction_count', 0] }, 'active', 'inactive'] },
            type: '$type',
            last_interaction: '$last_interaction',
            interaction_count: '$interaction_count',
            unique_attackers: { $size: '$source_ips' },
            recent_events: { $slice: ['$recent_events', 10] }
          }
        }
      ];
      
      const honeypots = await deceptionDetectionCol.aggregate(pipeline).toArray();
      
      if (honeypots.length === 0) {
        return res.status(404).json({ error: 'OT honeypot not found' });
      }
      
      const honeypot = honeypots[0];
      
      // Convert ObjectIds to strings
      const formattedHoneypot = {
        ...honeypot,
        _id: honeypot._id.toString(),
        port: honeypot._id,
        recent_events: honeypot.recent_events.map(event => ({
          ...event,
          _id: event._id.toString()
        }))
      };
      
      res.json(formattedHoneypot);
    } catch (e) {
      console.error('Error fetching OT honeypot:', e);
      res.status(500).json({ error: 'Failed to fetch OT honeypot' });
    }
  });

  // Get OT honeypot events
  router.get('/:id/events', async (req, res) => {
    try {
      const { id } = req.params;
      const { limit = 100 } = req.query;
      
      const events = await deceptionDetectionCol
        .find({ 
          dest_port: id,
          attack_category: 'ot_honeypot_engagement'
        })
        .sort({ timestamp: -1 })
        .limit(Number(limit))
        .toArray();
      
      // Convert ObjectIds to strings
      const formattedEvents = events.map(event => ({
        ...event,
        _id: event._id.toString()
      }));
      
      res.json(formattedEvents);
    } catch (e) {
      console.error('Error fetching OT honeypot events:', e);
      res.status(500).json({ error: 'Failed to fetch OT honeypot events' });
    }
  });

  // Get OT honeypot statistics
  router.get('/:id/stats', async (req, res) => {
    try {
      const { id } = req.params;
      const { hours = 24 } = req.query;
      
      const timeFilter = new Date();
      timeFilter.setHours(timeFilter.getHours() - Number(hours));
      
      const query = {
        dest_port: id,
        attack_category: 'ot_honeypot_engagement',
        timestamp: { $gte: timeFilter.toISOString() }
      };
      
      const pipeline = [
        { $match: query },
        {
          $group: {
            _id: null,
            total_events: { $sum: 1 },
            unique_attackers: { $addToSet: '$source_ip' },
            severity_distribution: {
              $push: '$severity'
            },
            attack_patterns: {
              $addToSet: '$note_type'
            }
          }
        },
        {
          $project: {
            _id: 0,
            total_events: 1,
            unique_attackers: { $size: '$unique_attackers' },
            severity_distribution: 1,
            attack_patterns: 1
          }
        }
      ];
      
      const stats = await deceptionDetectionCol.aggregate(pipeline).toArray();
      
      if (stats.length === 0) {
        return res.json({
          total_events: 0,
          unique_attackers: 0,
          severity_distribution: [],
          attack_patterns: []
        });
      }
      
      res.json(stats[0]);
    } catch (e) {
      console.error('Error fetching OT honeypot stats:', e);
      res.status(500).json({ error: 'Failed to fetch OT honeypot stats' });
    }
  });

  return router;
}; 