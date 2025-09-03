const { MongoClient } = require('mongodb');
require('dotenv').config();

async function cleanupDatabase() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://mongo:27017/advdeception';
  console.log('🧹 Cleaning up AdvDeception database...');
  console.log('📊 Database URI:', mongoUri);
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB successfully');
    
    const db = client.db('advdeception');
    console.log('📊 Using database: advdeception');
    
    // Get all collections in the database
    const collections = await db.listCollections().toArray();
    console.log(`📚 Found ${collections.length} collections in database`);
    
    // Define the 5 collections we want to keep
    const keepCollections = [
      'users',
      'scan_alerts', 
      'deception_detection',
      'raw_logs',
      'ai_response'
    ];
    
    // Collections to drop (old architecture)
    const dropCollections = [
      'honeypots',
      'honeypot_events',
      'threat_signatures',
      'honeypot_categories',
      'events',
      'zeek_alerts',
      'network_alerts',
      'network_reports',
      'client_status',
      'security_events'
    ];
    
    console.log('\n🔍 Analyzing collections...');
    console.log('✅ Collections to KEEP:');
    keepCollections.forEach(col => {
      const exists = collections.some(c => c.name === col);
      console.log(`   ${exists ? '✅' : '❌'} ${col}`);
    });
    
    console.log('\n🗑️  Collections to DROP:');
    dropCollections.forEach(col => {
      const exists = collections.some(c => c.name === col);
      console.log(`   ${exists ? '🗑️' : '❌'} ${col}`);
    });
    
    // Drop old collections that exist
    console.log('\n🧹 Starting cleanup process...');
    let droppedCount = 0;
    
    for (const collectionName of dropCollections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        
        if (count > 0) {
          console.log(`🗑️  Dropping collection: ${collectionName} (${count} documents)`);
          await collection.drop();
          console.log(`✅ Successfully dropped: ${collectionName}`);
          droppedCount++;
        } else {
          console.log(`ℹ️  Collection ${collectionName} is empty or doesn't exist, skipping`);
        }
      } catch (error) {
        if (error.code === 26) {
          console.log(`ℹ️  Collection ${collectionName} doesn't exist, skipping`);
        } else {
          console.error(`❌ Error dropping collection ${collectionName}:`, error.message);
        }
      }
    }
    
    // Verify final state
    const finalCollections = await db.listCollections().toArray();
    console.log('\n📊 Cleanup completed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🗑️  Dropped ${droppedCount} old collections`);
    console.log(`📚 Final collection count: ${finalCollections.length}`);
    console.log('\n✅ Remaining collections:');
    finalCollections.forEach(col => {
      console.log(`   📚 ${col.name}`);
    });
    
    // Verify all required collections exist
    const missingCollections = keepCollections.filter(required => 
      !finalCollections.some(col => col.name === required)
    );
    
    if (missingCollections.length > 0) {
      console.log('\n⚠️  WARNING: Missing required collections:');
      missingCollections.forEach(col => console.log(`   ❌ ${col}`));
      console.log('💡 Run init-db.js to create missing collections');
    } else {
      console.log('\n🎉 All required collections are present!');
      console.log('✅ Database cleanup completed successfully');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Database cleanup error:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  cleanupDatabase().catch(error => {
    console.error('❌ Failed to cleanup database:', error);
    process.exit(1);
  });
}

module.exports = cleanupDatabase;
