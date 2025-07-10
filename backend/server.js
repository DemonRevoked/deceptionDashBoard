// switch to CommonJS (or add "type":"module" in package.json if you prefer ESM)
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const validateEnv = require('./validateEnv');

// Import modular routes
const { router: authRouter, verifyToken } = require('./routes/auth');
const honeypotsRouter = require('./routes/honeypots');
const eventsRouter = require('./routes/honeypotEvents');
const analysisRouter = require('./routes/honeypotAnalysis');

require('dotenv').config();
validateEnv();

const app = express();
app.use(cors());
app.use(bodyParser.json());

(async () => {
  const client = new MongoClient(process.env.MONGO_URI || 'mongodb://mongo:27017/advdeception');
  await client.connect();
  const db = client.db('advdeception');  // Explicitly use advdeception database

  // Initialize routes with database connection
  const honeypotsRoutes = honeypotsRouter(db);
  const eventsRoutes = eventsRouter(db);
  const analysisRoutes = analysisRouter(db);

  // Mount routes
  app.use('/api', authRouter);
  app.use('/api/honeypots', verifyToken, honeypotsRoutes);
  app.use('/api/events', verifyToken, eventsRoutes);
  app.use('/api', verifyToken, analysisRoutes);

  app.listen(5000, () => console.log('API listening on port 5000'));
})();
