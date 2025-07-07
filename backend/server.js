// switch to CommonJS (or add "type":"module" in package.json if you prefer ESM)
const express        = require('express');
const bodyParser     = require('body-parser');
const cors           = require('cors');
const { MongoClient, ObjectId }= require('mongodb');
const OpenAI         = require('openai').default;
const jwt            = require('jsonwebtoken');
const validateEnv    = require('./validateEnv'); // Import the validator
require('dotenv').config();

// Validate required environment variables on startup
validateEnv();

const app = express();
// In a production environment, it's more secure to restrict CORS to your frontend's domain.
// For example:
// const corsOptions = {
//   origin: 'http://your-frontend-app.com'
// };
// app.use(cors(corsOptions));
app.use(cors()); // Current setting allows all origins, fine for development.
app.use(bodyParser.json());

(async () => {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db           = client.db();
  const sessionsCol  = db.collection('sessions');
  const ntpCol       = db.collection('ntp_requests');
  const analysisCol  = db.collection('analyses');
  const openai       = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Public login route
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      // Credentials are correct, sign a new token
      const token = jwt.sign({ username: username }, process.env.JWT_SECRET, { expiresIn: '8h' });
      return res.json({ token });
    }
    // Invalid credentials
    return res.status(401).json({ error: 'Invalid credentials' });
  });

  // Middleware to verify JWT on protected routes
  const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <TOKEN>"

    if (!token) {
      return res.status(401).json({ error: 'A token is required for authentication' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      return res.status(403).json({ error: 'Invalid Token' });
    }
    return next();
  };

  // fetch sessions + merge in any existing verdict
  app.get('/api/sessions', verifyToken, async (req, res) => {
    try {
      // Use a MongoDB aggregation pipeline to efficiently join sessions with analyses
      const sessions = await sessionsCol.aggregate([
        { $sort: { start_time: -1 } },
        {
          $lookup: {
            from: 'analyses', // the collection to join
            localField: 'source_ip', // field from the input documents (sessions)
            foreignField: 'ip', // field from the documents of the "from" collection (analyses)
            as: 'analysis' // output array field name
          }
        },
        {
          $addFields: {
            // If analysis array is not empty, take the verdict from the first element, otherwise null
            aiVerdict: { $ifNull: [ { $arrayElemAt: ['$analysis.verdict', 0] }, null ] }
          }
        },
        {
          $project: {
            analysis: 0 // Clean up by removing the temporary analysis array
          }
        }
      ]).toArray();
      res.json(sessions);
    } catch (e) {
      console.error("Error fetching sessions:", e);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  // fetch a single session by its _id
  app.get('/api/sessions/:id', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      // It's best practice to validate the ID format before querying the database.
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid session ID format' });
      }
      const session = await sessionsCol.findOne({ _id: new ObjectId(id) });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json(session);
    } catch (e) {
      console.error(`Error fetching session ${req.params.id}:`, e);
      res.status(500).json({ error: 'Failed to fetch session' });
    }
  });

  // fetch ntp logs. Renamed from /ntp_requests to avoid ad-blocker issues.
  app.get('/api/ntp-logs', verifyToken, async (req, res) => {
    try {
      const requests = await ntpCol.find().sort({ timestamp: -1 }).toArray();
      res.json(requests);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch NTP requests' });
    }
  });

  // analyze endpoint: return existing if present, else call OpenAI & upsert
  app.post('/api/analyze', verifyToken, async (req, res) => {
    const { ip } = req.body;
    try {
      if (!ip) return res.status(400).json({ error: 'Missing ip' });

      // check existing
      const existing = await analysisCol.findOne({ ip });
      if (existing) {
        return res.json({ ip, verdict: existing.verdict });
      }

      // pull last 5 sessions
      const sess = await sessionsCol
        .find({ source_ip: ip })
        .sort({ start_time: -1 })
        .limit(5)
        .toArray();

      if (sess.length === 0) {
        return res.json({ ip, verdict: "No SSH sessions found for this IP to analyze." });
      }

      const lines = sess.map(s =>
        `• ${new Date(s.start_time).toISOString()}: ${s.commands.join(', ') || '[no commands]'}`
      ).join('\n');

      const prompt = `
You are a security honeypot analyst. Given these SSH session summaries from IP ${ip}:
${lines}

Please write a few phrases describing the likely attacker’s intention or behavior.
      `;

      const chat = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful security analyst.' },
          { role: 'user',   content: prompt.trim() }
        ],
        temperature: 0.7,
        max_tokens: 256
      });

      const verdict = chat.choices[0].message.content.trim();

      await analysisCol.updateOne(
        { ip },
        { $set: { ip, verdict, updatedAt: new Date() } },
        { upsert: true }
      );

      res.json({ ip, verdict });
    } catch (e) {
      console.error(`Error analyzing IP ${ip}:`, e);
      res.status(500).json({ error: 'Failed to analyze IP' });
    }
  });

  app.listen(5000, () => console.log('API listening on port 5000'));
})();
