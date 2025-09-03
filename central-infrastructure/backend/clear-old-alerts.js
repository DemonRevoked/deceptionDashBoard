const { MongoClient } = require('mongodb');

async function clearOldAlerts() {
    const mongoUri = 'mongodb://admin:admin123@mongo:27017/advdeception?authSource=admin';
    const client = new MongoClient(mongoUri);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('advdeception');
        const securityEventsCol = db.collection('security_events');
        
        // Delete old tcpdump_scan alerts
        const result = await securityEventsCol.deleteMany({ alertType: 'tcpdump_scan' });
        
        console.log(`Deleted ${result.deletedCount} old tcpdump_scan alerts`);
        
        // Check remaining alerts
        const remainingAlerts = await securityEventsCol.find({}).toArray();
        console.log(`Remaining alerts: ${remainingAlerts.length}`);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

clearOldAlerts(); 