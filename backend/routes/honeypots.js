const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = function(db) {
  const honeypotsCol = db.collection('honeypots');

  // List all honeypots
  router.get('/', async (req, res) => {
    try {
      const honeypots = await honeypotsCol.find().toArray();
      // Convert ObjectIds to strings
      const formattedHoneypots = honeypots.map(hp => ({
        ...hp,
        _id: hp._id.toString()
      }));
      res.json(formattedHoneypots);
    } catch (e) {
      console.error('Error fetching honeypots:', e);
      res.status(500).json({ error: 'Failed to fetch honeypots' });
    }
  });

  // Update honeypot status/config
  router.patch('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const update = req.body;
      if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid honeypot ID' });
      await honeypotsCol.updateOne({ _id: new ObjectId(id) }, { $set: update });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to update honeypot' });
    }
  });

  return router;
}; 