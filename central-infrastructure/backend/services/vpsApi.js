const axios = require('axios');

class VpsApiService {
  constructor() {
    this.baseUrl = process.env.VPS_API_URL || 'http://localhost:8080';
    this.adminKey = process.env.VPS_ADMIN_API_KEY || 'admin_secure_key_here_change_in_production';
    this.clientKeys = {
      client1: 'client_client1_t06tl77s9t',
      client_a: process.env.VPS_CLIENT_A_API_KEY || 'client_a_secure_key_123',
      client_b: process.env.VPS_CLIENT_B_API_KEY || 'client_b_secure_key_456',
      client_c: process.env.VPS_CLIENT_C_API_KEY || 'client_c_secure_key_789'
    };
    
    // Create axios instance with default config
    this.api = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000, // Increased timeout for dashboard calls
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Helper method to get client API key
  getClientApiKey(clientId) {
    return this.clientKeys[clientId] || null;
  }

  // Health check for VPS API
  async checkHealth() {
    try {
      const response = await this.api.get('/health');
      return {
        status: 'healthy',
        vpsStatus: response.data.status,
        timestamp: response.data.timestamp
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Client API Methods
  async submitClientData(clientId, data) {
    try {
      const apiKey = this.getClientApiKey(clientId);
      if (!apiKey) {
        throw new Error(`Invalid client ID: ${clientId}`);
      }

      const response = await this.api.post('/api/client/submit', data, {
        headers: {
          'x-api-key': apiKey,
          'x-client-id': clientId
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`VPS API Error: ${error.response?.data?.error || error.message}`);
    }
  }

  async getClientStatus(clientId) {
    try {
      const apiKey = this.getClientApiKey(clientId);
      if (!apiKey) {
        throw new Error(`Invalid client ID: ${clientId}`);
      }

      const response = await this.api.get('/api/client/status', {
        headers: {
          'x-api-key': apiKey,
          'x-client-id': clientId
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`VPS API Error: ${error.response?.data?.error || error.message}`);
    }
  }

  async getClientData(clientId, dataType, filters = {}) {
    try {
      const apiKey = this.getClientApiKey(clientId);
      if (!apiKey) {
        throw new Error(`Invalid client ID: ${clientId}`);
      }

      const params = new URLSearchParams(filters);
      const response = await this.api.get(`/api/client/data/${dataType}?${params}`, {
        headers: {
          'x-api-key': apiKey,
          'x-client-id': clientId
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`VPS API Error: ${error.response?.data?.error || error.message}`);
    }
  }

  // Dashboard API Methods (Admin access)
  async getSystemOverview() {
    try {
      console.log('🔧 VPS API: Calling /api/dashboard/overview...');
      const startTime = Date.now();
      
      const response = await this.api.get('/api/dashboard/overview', {
        headers: {
          'x-admin-key': this.adminKey
        }
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ VPS API: /api/dashboard/overview completed in ${duration}ms`);
      
      return response.data;
    } catch (error) {
      console.error('❌ VPS API Error in getSystemOverview:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        timeout: error.code === 'ECONNABORTED'
      });
      throw new Error(`VPS API Error: ${error.response?.data?.error || error.message}`);
    }
  }

  async getCollectionsList() {
    try {
      console.log('🔧 VPS API: Calling /api/dashboard/collections...');
      const startTime = Date.now();
      
      const response = await this.api.get('/api/dashboard/collections', {
        headers: {
          'x-admin-key': this.adminKey
        }
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ VPS API: /api/dashboard/collections completed in ${duration}ms`);
      
      return response.data;
    } catch (error) {
      console.error('❌ VPS API Error in getCollectionsList:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        timeout: error.code === 'ECONNABORTED'
      });
      throw new Error(`VPS API Error: ${error.response?.data?.error || error.message}`);
    }
  }

  async getCollectionDetails(collectionName, filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await this.api.get(`/api/dashboard/collection/${collectionName}?${params}`, {
        headers: {
          'x-admin-key': this.adminKey
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`VPS API Error: ${error.response?.data?.error || error.message}`);
    }
  }

  async getAnalytics(timeframe = '24h', dataType = null) {
    try {
      const params = new URLSearchParams({ timeframe });
      if (dataType) params.append('data_type', dataType);
      
      const response = await this.api.get(`/api/dashboard/analytics?${params}`, {
        headers: {
          'x-admin-key': this.adminKey
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`VPS API Error: ${error.response?.data?.error || error.message}`);
    }
  }

  async searchData(query, filters = {}) {
    try {
      const params = new URLSearchParams({ query, ...filters });
      const response = await this.api.get(`/api/dashboard/search?${params}`, {
        headers: {
          'x-admin-key': this.adminKey
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`VPS API Error: ${error.response?.data?.error || error.message}`);
    }
  }

  // Data transformation methods to maintain compatibility with existing frontend
  transformEventData(vpsEvent) {
    return {
      id: vpsEvent._id || vpsEvent.data_id,
      timestamp: vpsEvent.timestamp,
      sourceIP: vpsEvent.source_ip,
      destinationIP: vpsEvent.destination_ip,
      port: vpsEvent.port,
      protocol: vpsEvent.protocol,
      severityLevel: vpsEvent.severity,
      eventType: vpsEvent.data_type,
      description: vpsEvent.description,
      payload: vpsEvent.payload,
      metadata: vpsEvent.metadata,
      clientId: vpsEvent.client_id,
      createdAt: vpsEvent.created_at,
      processed: vpsEvent.processed,
      vpnServerId: vpsEvent.vpn_server_id
    };
  }

  transformScanAlert(vpsAlert) {
    return {
      id: vpsAlert._id || vpsAlert.data_id,
      timestamp: vpsAlert.timestamp,
      sourceIP: vpsAlert.source_ip,
      destinationIP: vpsAlert.destination_ip,
      port: vpsAlert.port,
      protocol: vpsAlert.protocol,
      severityLevel: vpsAlert.severity,
      eventType: vpsAlert.data_type,
      description: vpsAlert.description,
      payload: vpsAlert.payload,
      metadata: vpsAlert.metadata,
      clientId: vpsAlert.client_id,
      createdAt: vpsAlert.created_at,
      processed: vpsAlert.processed,
      vpnServerId: vpsAlert.vpn_server_id
    };
  }
}

module.exports = VpsApiService;
