const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testDatabase() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://mongo:27017/advdeception';
  console.log('🧪 Testing database connection with URI:', mongoUri);
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB successfully');
    
    const db = client.db('advdeception');
    console.log('📊 Using database: advdeception');
    
    // Test scan_alerts collection
    const scanAlertsCol = db.collection('scan_alerts');
    const scanAlertsCount = await scanAlertsCol.countDocuments();
    console.log(`📊 Scan alerts collection: ${scanAlertsCount} documents`);
    
    if (scanAlertsCount > 0) {
      const sampleAlert = await scanAlertsCol.findOne();
      console.log('📊 Sample scan alert:', {
        id: sampleAlert.id,
        note_type: sampleAlert.note_type,
        source_ip: sampleAlert.source_ip,
        severity: sampleAlert.severity,
        timestamp: sampleAlert.timestamp
      });
    }
    
    // Test deception_detection collection
    const deceptionDetectionCol = db.collection('deception_detection');
    const deceptionDetectionCount = await deceptionDetectionCol.countDocuments();
    console.log(`🍯 Deception detection collection: ${deceptionDetectionCount} documents`);
    
    if (deceptionDetectionCount > 0) {
      const sampleDetection = await deceptionDetectionCol.findOne();
      console.log('🍯 Sample deception detection:', {
        id: sampleDetection.id,
        note_type: sampleDetection.note_type,
        source_ip: sampleDetection.source_ip,
        attack_category: sampleDetection.attack_category,
        timestamp: sampleDetection.timestamp
      });
    }
    
    // Test other collections
    const collections = await db.listCollections().toArray();
    console.log('📚 Available collections:', collections.map(c => c.name));
    
    console.log('✅ Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await client.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the test
testDatabase();
