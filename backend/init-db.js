const { MongoClient } = require('mongodb');
require('dotenv').config();

async function initDatabase() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Initialize honeypots collection
    const honeypotsCol = db.collection('honeypots');
    
    // Check if honeypots already exist
    const existingHoneypots = await honeypotsCol.find().toArray();
    
    if (existingHoneypots.length === 0) {
      console.log('Initializing honeypots collection...');
      
      // Insert default SSH honeypot
      await honeypotsCol.insertOne({
        name: 'ssh-honeypot',
        protocol: 'ssh',
        type: 'IT',
        status: 'running',
        host: '10.0.44.32',
        port: 2222,
        config: {
          timer: 3600,
          custom_setting: 'default'
        },
        last_heartbeat: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      });
      
      console.log('Default SSH honeypot created successfully!');
    } else {
      console.log('Honeypots collection already has data, skipping initialization.');
    }
    
    // Create indexes for better performance
    await db.collection('events').createIndex({ timestamp: -1 });
    await db.collection('events').createIndex({ honeypot_id: 1 });
    await db.collection('events').createIndex({ protocol: 1 });
    await db.collection('raw_logs').createIndex({ timestamp: -1 });
    await db.collection('analyses').createIndex({ source_ip: 1, protocol: 1 });
    
    console.log('Database initialization completed!');
    
  } catch (error) {
    console.error('Database initialization failed:', error);
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase; 