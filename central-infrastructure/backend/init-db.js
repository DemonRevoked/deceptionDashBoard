const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function initDatabase() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://mongo:27017/advdeception';
  console.log('🔄 Initializing AdvDeception database with URI:', mongoUri);
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB successfully');
    
    const db = client.db('advdeception');
    console.log('📊 Using database: advdeception');
    
    // ========== STREAMLINED 5-COLLECTION ARCHITECTURE ==========
    console.log('📚 Creating streamlined 5-collection structure...');
    
    // 1. Users Collection - User authentication and management
    const usersCol = db.collection('users');
    const existingUsers = await usersCol.find().toArray();

    if (existingUsers.length === 0) {
      console.log('👤 No existing users found. Creating default admin user...');
      
      // Hash default admin password
      const salt = await bcrypt.genSalt(10);
      const defaultPassword = process.env.ADMIN_PASSWORD || 'shadow@123';
      const defaultUsername = process.env.ADMIN_USERNAME || 'demon';
      
      console.log(`🔐 Creating admin user with username: ${defaultUsername}`);
      const hashedPassword = await bcrypt.hash(defaultPassword, salt);
      
      // Insert default admin user
      await usersCol.insertOne({
        username: defaultUsername,
        email: 'admin@deception.com',
        password: hashedPassword,
        role: 'admin',
        permissions: ['read', 'write', 'delete', 'admin'],
        created_at: new Date(),
        status: 'active'
      });
      
      console.log('✅ Default admin user created successfully!');
    } else {
      console.log(`👥 Found ${existingUsers.length} existing users, skipping user creation.`);
    }

    // 2. Scan Alerts Collection - Primary threat detection data
    const scanAlertsCol = db.collection('scan_alerts');
    const existingScanAlerts = await scanAlertsCol.find().toArray();
    
    if (existingScanAlerts.length === 0) {
      console.log('📊 Initializing scan_alerts collection with sample data...');
      
      const sampleScanAlerts = [
        {
          id: 'zeek_client-a_1755712793_12345',
          timestamp: new Date().toISOString(),
          note_type: 'Port_Scan',
          message: 'High number of failed connections from 10.0.44.189 - 27 failed attempts',
          source_ip: '10.0.44.189',
          dest_port: '1900/udp',
          uid: 'C8IVqD3W4lQu8tD3tb',
          attack_category: 'reconnaissance',
          severity: 'medium',
          detection_time: '1755712793',
          alertType: 'Port_Scan',
          attackerIP: '10.0.44.189',
          clientId: 'client-a',
          threatLevel: 'medium',
          details: {
            zeek_note_type: 'Port_Scan',
            message: 'High number of failed connections from 10.0.44.189 - 27 failed attempts',
            dest_port: '1900/udp',
            uid: 'C8IVqD3W4lQu8tD3tb',
            detection_method: 'enhanced_zeek_analysis',
            attack_category: 'reconnaissance',
            severity: 'medium'
          }
        },
        {
          id: 'zeek_client-a_1755712793_12346',
          timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          note_type: 'DDoS_Attack',
          message: 'Potential DDoS attack from 10.0.44.189 - 87 connections in 60 seconds',
          source_ip: '10.0.44.189',
          dest_port: '1900/udp',
          uid: 'C2HL2a1Vc1Q10Xz6Yh',
          attack_category: 'availability_attack',
          severity: 'critical',
          detection_time: '1755712793',
          alertType: 'DDoS_Attack',
          attackerIP: '10.0.44.189',
          clientId: 'client-a',
          threatLevel: 'critical',
          details: {
            zeek_note_type: 'DDoS_Attack',
            message: 'Potential DDoS attack from 10.0.44.189 - 87 connections in 60 seconds',
            dest_port: '1900/udp',
            uid: 'C2HL2a1Vc1Q10Xz6Yh',
            detection_method: 'enhanced_zeek_analysis',
            attack_category: 'availability_attack',
            severity: 'critical'
          }
        },
        {
          id: 'zeek_client-a_1755712793_12347',
          timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          note_type: 'Nmap_Scan',
          message: 'Nmap reconnaissance scan detected from 10.0.44.190',
          source_ip: '10.0.44.190',
          dest_port: '443/tcp',
          uid: 'CVxCxR2zQ1oyyTbmL9',
          attack_category: 'reconnaissance',
          severity: 'high',
          detection_time: '1755712793',
          alertType: 'Nmap_Scan',
          attackerIP: '10.0.44.190',
          clientId: 'client-a',
          threatLevel: 'high',
          details: {
            zeek_note_type: 'Nmap_Scan',
            message: 'Nmap reconnaissance scan detected from 10.0.44.190',
            dest_port: '443/tcp',
            uid: 'CVxCxR2zQ1oyyTbmL9',
            detection_method: 'enhanced_zeek_analysis',
            attack_category: 'reconnaissance',
            severity: 'high'
          }
        }
      ];
      
      await scanAlertsCol.insertMany(sampleScanAlerts);
      console.log(`✅ Scan alerts collection initialized with ${sampleScanAlerts.length} sample alerts!`);
    } else {
      console.log(`📊 Found ${existingScanAlerts.length} existing scan alerts, skipping sample data creation.`);
    }

    // 3. Deception Detection Collection - Honeypot activity data
    const deceptionDetectionCol = db.collection('deception_detection');
    const existingDeceptionDetection = await deceptionDetectionCol.find().toArray();
    
    if (existingDeceptionDetection.length === 0) {
      console.log('🍯 Initializing deception_detection collection with sample data...');
      
      const sampleDeceptionDetection = [
        {
          id: 'zeek_client-a_1755712793_12348',
          timestamp: new Date().toISOString(),
          note_type: 'Honeypot_Interaction',
          message: 'Honeypot interaction on port 443 from 10.0.44.3',
          source_ip: '10.0.44.3',
          dest_port: '443/tcp',
          uid: 'CVxCxR2zQ1oyyTbmL9',
          attack_category: 'honeypot_engagement',
          severity: 'medium',
          detection_time: '1755712793',
          alertType: 'Honeypot_Interaction',
          attackerIP: '10.0.44.3',
          clientId: 'client-a',
          threatLevel: 'medium',
          details: {
            zeek_note_type: 'Honeypot_Interaction',
            message: 'Honeypot interaction on port 443 from 10.0.44.3',
            dest_port: '443/tcp',
            uid: 'CVxCxR2zQ1oyyTbmL9',
            detection_method: 'honeypot_monitoring',
            attack_category: 'honeypot_engagement',
            severity: 'medium'
          }
        }
      ];
      
      await deceptionDetectionCol.insertMany(sampleDeceptionDetection);
      console.log(`✅ Deception detection collection initialized with ${sampleDeceptionDetection.length} sample events!`);
    } else {
      console.log(`🍯 Found ${existingDeceptionDetection.length} existing deception detection events, skipping sample data creation.`);
    }

    // 4. Raw Logs Collection - Raw alert data storage
    const rawLogsCol = db.collection('raw_logs');
    const existingRawLogs = await rawLogsCol.find().toArray();
    
    if (existingRawLogs.length === 0) {
      console.log('📝 Initializing raw_logs collection with sample data...');
      
      const sampleRawLogs = [
        {
          timestamp: new Date().toISOString(),
          raw_alert: {
            timestamp: new Date().toISOString(),
            note_type: 'Port_Scan',
            message: 'High number of failed connections from 10.0.44.189 - 27 failed attempts',
            source_ip: '10.0.44.189',
            dest_port: '1900/udp',
            uid: 'C8IVqD3W4lQu8tD3tb',
            attack_category: 'reconnaissance',
            severity: 'medium',
            detection_time: '1755712793'
          },
          source: 'zeek_enhanced',
          client_id: 'client-a'
        }
      ];
      
      await rawLogsCol.insertMany(sampleRawLogs);
      console.log(`✅ Raw logs collection initialized with ${sampleRawLogs.length} sample logs!`);
    } else {
      console.log(`📝 Found ${existingRawLogs.length} existing raw logs, skipping sample data creation.`);
    }

    // 5. AI Response Collection - AI-generated threat analysis
    const aiResponseCol = db.collection('ai_response');
    const existingAiResponses = await aiResponseCol.find().toArray();
    
    if (existingAiResponses.length === 0) {
      console.log('🤖 Initializing ai_response collection with sample data...');
      
      const sampleAiResponse = [
        {
          query_id: 'sample_001',
          query_type: 'threat_analysis',
          query_text: 'Analyze recent port scan activity',
          ai_response: 'Sample AI response for threat analysis',
          confidence_score: 0.95,
          created_at: new Date(),
          status: 'completed'
        }
      ];
      
      await aiResponseCol.insertMany(sampleAiResponse);
      console.log(`✅ AI response collection initialized with ${sampleAiResponse.length} sample responses!`);
    } else {
      console.log(`🤖 Found ${existingAiResponses.length} existing AI responses, skipping sample data creation.`);
    }

    // ========== CREATE COLLECTIONS AND INDEXES ==========
    
    console.log('📚 Creating collections and indexes...');
    
    // Ensure all collections exist
    await db.createCollection('scan_alerts', { strict: false }).catch(() => {});
    await db.createCollection('deception_detection', { strict: false }).catch(() => {});
    await db.createCollection('raw_logs', { strict: false }).catch(() => {});
    await db.createCollection('ai_response', { strict: false }).catch(() => {});
    await db.createCollection('users', { strict: false }).catch(() => {});

    // Create performance indexes
    console.log('🔍 Creating database indexes...');
    
    // Scan alerts indexes
    await db.collection('scan_alerts').createIndex({ timestamp: -1 });
    await db.collection('scan_alerts').createIndex({ source_ip: 1 });
    await db.collection('scan_alerts').createIndex({ severity: 1 });
    await db.collection('scan_alerts').createIndex({ note_type: 1 });
    await db.collection('scan_alerts').createIndex({ clientId: 1 });
    await db.collection('scan_alerts').createIndex({ attack_category: 1 });
    
    // Deception detection indexes
    await db.collection('deception_detection').createIndex({ timestamp: -1 });
    await db.collection('deception_detection').createIndex({ source_ip: 1 });
    await db.collection('deception_detection').createIndex({ severity: 1 });
    await db.collection('deception_detection').createIndex({ note_type: 1 });
    
    // Raw logs indexes
    await db.collection('raw_logs').createIndex({ timestamp: -1 });
    await db.collection('raw_logs').createIndex({ client_id: 1 });
    await db.collection('raw_logs').createIndex({ source: 1 });
    
    // AI response indexes
    await db.collection('ai_response').createIndex({ created_at: -1 });
    await db.collection('ai_response').createIndex({ query_type: 1 });
    await db.collection('ai_response').createIndex({ status: 1 });
    
    // Users indexes
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ status: 1 });

    console.log('🎉 Database initialization completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Database Summary:');
    console.log(`   👥 Users: ${(await usersCol.countDocuments())} created`);
    console.log(`   📊 Scan Alerts: ${(await scanAlertsCol.countDocuments())} created`);
    console.log(`   🍯 Deception Detection: ${(await deceptionDetectionCol.countDocuments())} created`);
    console.log(`   📝 Raw Logs: ${(await rawLogsCol.countDocuments())} created`);
    console.log(`   🤖 AI Responses: ${(await aiResponseCol.countDocuments())} created`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Streamlined 5-collection architecture ready!');
    console.log('📚 Collections: users, scan_alerts, deception_detection, raw_logs, ai_response');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  initDatabase().catch(error => {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  });
}

module.exports = initDatabase; 