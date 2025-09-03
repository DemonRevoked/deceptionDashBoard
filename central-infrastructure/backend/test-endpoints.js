const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testEndpoints() {
  console.log('🧪 Testing API endpoints...\n');
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/health/quick`);
    console.log('✅ Health check response:', {
      status: healthResponse.data.status,
      database: healthResponse.data.services?.database?.status,
      websocket: healthResponse.data.services?.websocket?.status
    });
    
    // Test 2: Scan alerts
    console.log('\n2️⃣ Testing scan alerts endpoint...');
    const scanAlertsResponse = await axios.get(`${BASE_URL}/network-security/scan-alerts?hours=24&limit=10`);
    console.log('✅ Scan alerts response:', {
      count: scanAlertsResponse.data.length,
      sample: scanAlertsResponse.data[0] ? {
        id: scanAlertsResponse.data[0].id,
        note_type: scanAlertsResponse.data[0].note_type,
        source_ip: scanAlertsResponse.data[0].source_ip
      } : 'No data'
    });
    
    // Test 3: Scan alerts stats
    console.log('\n3️⃣ Testing scan alerts stats...');
    const statsResponse = await axios.get(`${BASE_URL}/network-security/scan-alerts/stats?hours=24`);
    console.log('✅ Stats response:', statsResponse.data);
    
    // Test 4: Deception activity
    console.log('\n4️⃣ Testing deception activity endpoint...');
    const deceptionResponse = await axios.get(`${BASE_URL}/network-security/deception-activity?hours=24&limit=10`);
    console.log('✅ Deception activity response:', {
      count: deceptionResponse.data.length,
      sample: deceptionResponse.data[0] ? {
        id: deceptionResponse.data[0].id,
        note_type: deceptionResponse.data[0].note_type,
        source_ip: deceptionResponse.data[0].source_ip
      } : 'No data'
    });
    
    // Test 5: Deception activity stats
    console.log('\n5️⃣ Testing deception activity stats...');
    const deceptionStatsResponse = await axios.get(`${BASE_URL}/network-security/deception-activity/stats?hours=24`);
    console.log('✅ Deception stats response:', deceptionStatsResponse.data);
    
    console.log('\n🎉 All endpoint tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testEndpoints();
