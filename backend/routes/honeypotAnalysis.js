const express = require('express');
const { ObjectId } = require('mongodb');
const OpenAI = require('openai').default;
const router = express.Router();

module.exports = function(db) {
  const eventsCol = db.collection('events');
  const analysisCol = db.collection('analyses');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Analyze honeypot session for potential threats
  router.post('/analyze', async (req, res) => {
    const { session_id } = req.body;
    try {
      if (!session_id) {
        return res.status(400).json({ error: 'Missing session_id' });
      }

      // Check existing analysis
      const existing = await analysisCol.findOne({ session_id });
      if (existing) {
        return res.json({ session_id, verdict: existing.verdict });
      }

      // Get session details
      const session = await eventsCol.findOne({ 
        'data.session_id': session_id,
        'event_type': 'session'
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Prepare session summary for analysis
      const commands = session.data.commands || [];
      const duration = session.data.duration;
      const sourceIp = session.source_ip;
      
      const prompt = `
        Analyze this SSH honeypot session for potential threats:
        - Source IP: ${sourceIp}
        - Duration: ${duration} seconds
        - Commands executed:
        ${commands.map(cmd => `  $ ${cmd}`).join('\n')}

        Provide a brief assessment of:
        1. The likely intention of the attacker
        2. The potential threat level
        3. Any notable patterns or behaviors
      `;
      
      const chat = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a cybersecurity analyst specializing in honeypot threat assessment.' },
          { role: 'user', content: prompt.trim() }
        ],
        temperature: 0.7,
        max_tokens: 256
      });
      
      const verdict = chat.choices[0].message.content.trim();
      
      // Store analysis result
      await analysisCol.updateOne(
        { session_id },
        { 
          $set: { 
            session_id,
            source_ip: sourceIp,
            verdict,
            commands_analyzed: commands,
            created_at: new Date(),
            updated_at: new Date()
          } 
        },
        { upsert: true }
      );
      
      res.json({ session_id, verdict });
    } catch (e) {
      console.error('Analysis error:', e);
      res.status(500).json({ error: 'Failed to analyze session' });
    }
  });

  // Get previous analyses
  router.get('/analyses', async (req, res) => {
    try {
      const { session_id, source_ip, limit = 100 } = req.query;
      const query = {};
      if (session_id) query.session_id = session_id;
      if (source_ip) query.source_ip = source_ip;
      
      const analyses = await analysisCol
        .find(query)
        .sort({ updated_at: -1 })
        .limit(Number(limit))
        .toArray();
      
      res.json(analyses);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch analyses' });
    }
  });

  return router;
}; 