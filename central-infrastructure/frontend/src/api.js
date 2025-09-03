import axios from 'axios';

// Smart API base URL detection for distributed architecture
const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 getApiBaseUrl called with:', {
      hasWindow: typeof window !== 'undefined',
      hasLocation: typeof window !== 'undefined' && window.location,
      envApiUrl: process.env.REACT_APP_API_URL,
      envWsUrl: process.env.REACT_APP_WS_URL
    });
  }

  // If we're in a browser environment, dynamically determine from current page location
  if (typeof window !== 'undefined' && window.location) {
    // Use environment variable if set, otherwise dynamically determine from current location
    if (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL !== 'undefined') {
      console.log('🔧 Using environment variable for API URL:', process.env.REACT_APP_API_URL);
      return process.env.REACT_APP_API_URL;
    }
    
    console.log('🔧 No environment variable set, using dynamic detection');
    
    // Get current host and construct backend URL
    const { protocol, hostname } = window.location;
    
    // Special handling for distributed architecture
    let targetHost = hostname;
    let apiUrl;
    
    if (hostname === '10.0.44.3') {
      // If accessing from client VM, use central backend IP
      targetHost = '10.0.44.32';
      apiUrl = `${protocol}//${targetHost}/api`; // Use nginx port 80
      console.log('🔧 Client VM detected, routing to central backend via nginx:', targetHost);
    } else if (hostname.startsWith('10.0.44.') || hostname === 'localhost') {
      // For external IP access, use relative URLs to avoid CORS issues
      apiUrl = `/api`;
      console.log('🔧 External access detected, using relative API URLs to avoid CORS');
    } else {
      // Fallback to relative URLs for development
      apiUrl = `/api`;
      console.log('🔧 Development access, using relative API URLs');
    }
    
    const dynamicUrl = apiUrl;
    console.log('🔧 Dynamic API URL detected:', {
      currentLocation: window.location.href,
      protocol,
      hostname,
      targetHost,
      constructedUrl: dynamicUrl,
      architecture: 'distributed'
    });
    return dynamicUrl;
  }
  
  // Fallback for SSR or when window.location is not available
  const fallbackUrl = process.env.REACT_APP_API_URL || 'http://backend/api';
  console.log('🔧 Using fallback API URL:', fallbackUrl);
  return fallbackUrl;
};

// Initialize API_BASE_URL
let API_BASE_URL = getApiBaseUrl();

// Function to update API_BASE_URL dynamically (useful for debugging)
export const updateApiBaseUrl = () => {
  API_BASE_URL = getApiBaseUrl();
  console.log('🔧 Updated API_BASE_URL to:', API_BASE_URL);
  
  // Update axios baseURL
  apiClient.defaults.baseURL = API_BASE_URL;
  return API_BASE_URL;
};

// Function to get current API base URL
export const getCurrentApiBaseUrl = () => {
  return API_BASE_URL;
};

// Function to force refresh API configuration (useful when page loads)
export const refreshApiConfiguration = () => {
  console.log('🔧 Refreshing API configuration...');
  return updateApiBaseUrl();
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Increased timeout for health checks that include HoneypotManager
  headers: {
    'Content-Type': 'application/json',
  }
});

// Log the initial configuration
console.log('🔧 Axios client created with baseURL:', API_BASE_URL);

// Add retry logic for container network issues
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // Retry for network errors or 5xx server errors
    if (
      !originalRequest._retry &&
      (error.code === 'ECONNABORTED' || 
       error.response?.status >= 500 || 
       error.code === 'NETWORK_ERROR')
    ) {
      originalRequest._retry = true;
      console.log('Retrying request due to network error...');
      
      // Wait 1 second before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      return apiClient.request(originalRequest);
    }
    
    return Promise.reject(error);
  }
);

// Set auth token from localStorage
const token = localStorage.getItem('authToken');
if (token) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export const setAuthToken = (token) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('authToken', token);
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    localStorage.removeItem('authToken');
  }
};

// --- Health Check ---
export const checkHealth = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

export const checkQuickHealth = async () => {
  const response = await apiClient.get('/health/quick');
  return response.data;
};

// --- Auth ---
export const login = async (username, password) => {
  // Use the new dashboard-login endpoint for enhanced response format
  const response = await apiClient.post('/auth/dashboard-login', { username, password });
  return response.data;
};

// --- Honeypots ---
export const fetchHoneypots = async () => {
  const response = await apiClient.get('/honeypots');
  return response.data;
};

export const startHoneypot = async (id) => {
  const response = await apiClient.post(`/honeypots/control/${id}/start`);
  return response.data;
};

export const stopHoneypot = async (id) => {
  const response = await apiClient.post(`/honeypots/control/${id}/stop`);
  return response.data;
};

export const fetchHoneypotStatuses = async () => {
  const response = await apiClient.get('/honeypots/control/status');
  return response.data;
};

// --- Plugin Management ---
export const fetchHoneypotPlugins = async (id) => {
  const response = await apiClient.get(`/honeypots/${id}/plugins`);
  return response.data;
};

export const updateHoneypotPlugins = async (id, config) => {
  const response = await apiClient.put(`/honeypots/${id}/plugins`, config);
  return response.data;
};

export const rebuildHoneypot = async (id) => {
  const response = await apiClient.post(`/honeypots/${id}/rebuild`);
  return response.data;
};

// --- Events (Primary Collection as per Connection.md) ---
export const fetchEvents = async (params = {}) => {
  console.warn('fetchEvents is deprecated - use fetchCombinedThreatData instead');
  // Redirect to the new function
  const data = await fetchCombinedThreatData(24, params);
  return data.scanAlerts || [];
};

export const fetchEventsStats = async (params = {}) => {
  console.warn('fetchEventsStats is deprecated - use fetchScanAlertsStats instead');
  // Redirect to the new function
  return await fetchScanAlertsStats(params);
};

export const fetchEventsTimeline = async (params = {}) => {
  console.warn('fetchEventsTimeline is deprecated - use fetchScanAlerts with time filtering instead');
  // Return mock data for now
  return [];
};

export const fetchEventById = async (eventId) => {
  const response = await apiClient.get(`/events/${eventId}`);
  return response.data;
};

// Legacy honeypot events (secondary collection)
export const fetchHoneypotEvents = async (params = {}) => {
  const response = await apiClient.get('/honeypot-events', { params });
  return response.data;
};

export const fetchHoneypotEventsStats = async (params = {}) => {
  const response = await apiClient.get('/honeypot-events/stats', { params });
  return response.data;
};

// --- Scan Alerts (Primary Data Source) ---
export const fetchScanAlerts = async (params = {}) => {
  console.log('🔧 fetchScanAlerts called with params:', params);
  // Use the new client dashboard data endpoint
  const response = await apiClient.get('/client-dashboard/data', { 
    params: { 
      ...params, 
      data_type: 'scan_alert' 
    } 
  });
  console.log('🔧 fetchScanAlerts response:', response.data.data?.length || 0, 'items');
  return response.data.data || [];
};

// --- Scan Alerts Statistics ---
export const fetchScanAlertsStats = async (params = {}) => {
  console.log('🔧 fetchScanAlertsStats called with params:', params);
  // Use the new client dashboard analytics endpoint
  const response = await apiClient.get('/client-dashboard/analytics', { 
    params: { 
      ...params, 
      timeframe: params.hours ? `${params.hours}h` : '24h'
    } 
  });
  console.log('🔧 fetchScanAlertsStats response:', response.data);
  return response.data.analytics || {};
};

// --- Deception Detection Stats ---
export const fetchDeceptionDetectionStats = async (params = {}) => {
  console.log('🔧 fetchDeceptionDetectionStats called with params:', params);
  // Use the new client dashboard analytics endpoint
  const response = await apiClient.get('/client-dashboard/analytics', { 
    params: { 
      ...params, 
      timeframe: params.hours ? `${params.hours}h` : '24h'
    } 
  });
  console.log('🔧 fetchDeceptionDetectionStats response:', response.data);
  return response.data.analytics || {};
};

// --- Deception Activity (Primary Data Source) ---
export const fetchDeceptionActivity = async (params = {}) => {
  console.log('🔧 fetchDeceptionActivity called with params:', params);
  // Use the new client dashboard data endpoint
  const response = await apiClient.get('/client-dashboard/data', { 
    params: { 
      ...params, 
      data_type: 'deception_event' 
    } 
  });
  console.log('🔧 fetchDeceptionActivity response:', response.data.data?.length || 0, 'items');
  return response.data.data || [];
};

// --- Legacy Functions (Maintained for backward compatibility) ---
export const fetchZeekAlerts = async (params = {}) => {
  // Redirect to new scan alerts endpoint
  return fetchScanAlerts(params);
};

export const fetchZeekAlertsStats = async (params = {}) => {
  // Redirect to new alerts stats endpoint
  return fetchScanAlertsStats(params);
};

// --- Enhanced Events API (New Primary Function) ---
export const fetchEnhancedDashboardData = async (timeRange = 24, params = {}) => {
  try {
    console.log('🔧 fetchEnhancedDashboardData called with:', { timeRange, params });
    
    // Use the new client dashboard API to get dashboard data
    const response = await fetch(`${getApiBaseUrl()}/client-dashboard/overview`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('🔧 Dashboard overview data received:', data);

    // Transform dashboard data to match expected format
    const transformedData = {
      scanAlerts: [], // Will be populated from separate data endpoint
      deceptionActivity: [], // Will be populated from separate data endpoint
      alertsStats: {
        total: data.overview?.total_records || 0,
        bySeverity: {},
        byType: {},
        byProtocol: data.analytics?.protocol_distribution || {}
      },
      lastUpdated: new Date().toISOString(),
      enhancedData: data // Keep the original enhanced data for advanced features
    };

    console.log('🔧 Transformed dashboard data:', transformedData);
    return transformedData;

  } catch (error) {
    console.error('❌ Error fetching enhanced dashboard data:', error);
    // Fallback to empty data structure
    return {
      scanAlerts: [],
      deceptionActivity: [],
      alertsStats: {
        total: 0,
        bySeverity: {},
        byType: {},
        byProtocol: {}
      },
      lastUpdated: new Date().toISOString(),
      enhancedData: null
    };
  }
};

// --- Combined Threat Data (Primary Function) ---
export const fetchCombinedThreatData = async (timeframe = 24, params = {}) => {
  try {
    console.log('🔧 fetchCombinedThreatData called with:', { timeframe, params });
    
    // Extract and validate parameters
    let hours, limit;
    
    if (typeof timeframe === 'object' && timeframe !== null) {
      // Called with object: fetchCombinedThreatData({ hours: 24, limit: 500 })
      hours = timeframe.hours || 24;
      limit = timeframe.limit || 500;
      // Extract any additional params from the object
      params = { ...timeframe, ...params };
    } else {
      // Called with separate params: fetchCombinedThreatData(24, { limit: 500 })
      hours = Number(timeframe) || 24;
      limit = 500;
    }
    
    // Clean params object to prevent malformed query strings
    const cleanParams = {
      hours: hours,
      limit: limit
    };
    
    // Only add additional params if they're valid
    if (typeof params === 'object' && params !== null) {
      Object.keys(params).forEach(key => {
        if (key !== 'hours' && key !== 'limit' && params[key] !== undefined) {
          cleanParams[key] = params[key];
        }
      });
    }
    
    console.log('🔧 Cleaned params for API calls:', cleanParams);
    
    // Fetch data from existing endpoints
    const [scanAlertsData, deceptionActivityData, alertsStatsData] = await Promise.allSettled([
      fetchScanAlerts(cleanParams),
      fetchDeceptionActivity(cleanParams),
      fetchScanAlertsStats(cleanParams)
    ]);

    console.log('🔧 API responses:', {
      scanAlertsData: {
        status: scanAlertsData.status,
        value: scanAlertsData.status === 'fulfilled' ? scanAlertsData.value : scanAlertsData.reason,
        count: scanAlertsData.status === 'fulfilled' ? scanAlertsData.value?.length : 0
      },
      deceptionActivityData: {
        status: deceptionActivityData.status,
        value: deceptionActivityData.status === 'fulfilled' ? deceptionActivityData.value : deceptionActivityData.reason,
        count: deceptionActivityData.status === 'fulfilled' ? deceptionActivityData.value?.length : 0
      },
      alertsStatsData: {
        status: alertsStatsData.status,
        value: alertsStatsData.status === 'fulfilled' ? alertsStatsData.value : alertsStatsData.reason
      }
    });

    // Transform scan alerts (scan_alerts collection) to expected format
    const scanAlerts = scanAlertsData.status === 'fulfilled' ? 
      scanAlertsData.value.map(alert => {
        const transformed = {
          ...alert,
          collection: 'scan_alerts', // Always set collection explicitly
          // The backend already returns the correct structure, just ensure collection is set
          note_type: alert.note_type || alert.alertType,
          source_ip: alert.source_ip || alert.attackerIP,
          dest_port: alert.dest_port,
          uid: alert.uid,
          message: alert.message || alert.description,
          threatLevel: alert.threatLevel || alert.severity,
          severity: alert.severity || alert.threatLevel || 'medium',
          timestamp: alert.timestamp,
          attack_category: alert.attack_category || 'network_scan'
        };
        console.log('🔧 Transformed scan alert:', { original: alert, transformed });
        return transformed;
      }) : [];

    console.log('🔧 Final scan alerts count:', scanAlerts.length);
    if (scanAlerts.length > 0) {
      console.log('🔧 First scan alert sample:', scanAlerts[0]);
    }

    // Transform deception activity (deception_detection collection) to expected format
    const deceptionActivity = deceptionActivityData.status === 'fulfilled' ? 
      deceptionActivityData.value.map(alert => {
        const transformed = {
          ...alert,
          collection: 'deception_detection', // Always set collection explicitly
          // The backend already returns the correct structure, just ensure collection is set
          note_type: alert.note_type || alert.alertType,
          source_ip: alert.source_ip || alert.attackerIP,
          dest_port: alert.dest_port,
          uid: alert.uid || alert.id,
          message: alert.message || alert.description,
          threatLevel: alert.threatLevel || alert.severity || 'medium',
          severity: alert.severity || alert.threatLevel || 'medium',
          timestamp: alert.timestamp,
          attack_category: alert.attack_category || 'honeypot_engagement'
        };
        console.log('🔧 Transformed deception activity:', { original: alert, transformed });
        return transformed;
      }) : [];

    console.log('🔧 Final deception activity count:', deceptionActivity.length);
    if (deceptionActivity.length > 0) {
      console.log('🔧 First deception activity sample:', deceptionActivity[0]);
    }

    // Transform alerts stats to expected format
    const alertsStats = alertsStatsData.status === 'fulfilled' ? {
      total_alerts: alertsStatsData.value.total || 0,
      threat_levels: alertsStatsData.value,
      protocol_distribution: [],
      attack_trends: []
    } : {
      total_alerts: 0,
      threat_levels: { total: 0, high: 0, medium: 0, low: 0, critical: 0 },
      protocol_distribution: [],
      attack_trends: []
    };

    console.log('🔧 Combined threat data fetched successfully:', {
      scanAlerts: scanAlerts.length,
      deceptionActivity: deceptionActivity.length,
      alertsStats: alertsStats
    });

    return {
      scanAlerts,
      deceptionActivity,
      alertsStats,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error fetching combined threat data:', error);
    // Return empty data structure on error
    return {
      scanAlerts: [],
      deceptionActivity: [],
      alertsStats: {
        total_alerts: 0,
        threat_levels: { total: 0, high: 0, medium: 0, low: 0, critical: 0 },
        protocol_distribution: [],
        attack_trends: []
      },
      lastUpdated: new Date().toISOString()
    };
  }
};

export const fetchAttackPatterns = async (hours = 24) => {
  const response = await apiClient.get(`/network-security/attack-patterns?hours=${hours}`);
  return response.data;
};

export const fetchThreatFeed = async (limit = 50) => {
  const response = await apiClient.get(`/network-security/threat-feed?limit=${limit}`);
  return response.data;
};

// --- Attack Detail API ---
export const fetchAttackDetail = async (ip, hours = 24) => {
  const response = await apiClient.get(`/network-security/attack-detail/${ip}?hours=${hours}`);
  return response.data;
};

// --- Legacy API Functions (Deprecated - Coming Soon Features) ---
// These functions are kept for backward compatibility but will be removed
// when the respective features are implemented

export const fetchOTHoneypots = async (params = {}) => {
  console.warn('fetchOTHoneypots is deprecated - OT Honeypots feature coming soon');
  // Return mock data for now
  return [];
};

export const fetchOTDashboardStats = async (timeframe = '24h', params = {}) => {
  console.warn('fetchOTDashboardStats is deprecated - OT Dashboard feature coming soon');
  // Return mock data for now
  return {
    total_attacks: 0,
    threat_levels: [],
    protocol_distribution: [],
    attack_trends: []
  };
};

export const fetchOTThreats = async (timeframe = '24h', limit = 20, params = {}) => {
  console.warn('fetchOTThreats is deprecated - OT Threats feature coming soon');
  // Return mock data for now
  return [];
};

export const fetchOTSafetyIncidents = async (timeframe = '24h', limit = 10, params = {}) => {
  console.warn('fetchOTSafetyIncidents is deprecated - OT Safety feature coming soon');
  // Return mock data for now
  return [];
};

export const fetchOTAttackTimeline = async (timeframe = '24h', params = {}) => {
  console.warn('fetchOTAttackTimeline is deprecated - OT Timeline feature coming soon');
  // Return mock data for now
  return [];
};

export const fetchSessionById = async (sessionId, params = {}) => {
  console.warn('fetchSessionById is deprecated - Session Analysis feature coming soon');
  // Return mock data for now
  return {
    session_id: sessionId,
    source_ip: '0.0.0.0',
    start_time: new Date().toISOString(),
    end_time: new Date().toISOString(),
    duration: 0,
    exit_code: 0,
    active: false
  };
};

export const fetchRawLogs = async (params = {}) => {
  console.warn('fetchRawLogs is deprecated - Raw Logs feature coming soon');
  // Return mock data for now
  return [];
};

export const analyzeSession = async (sessionId, params = {}) => {
  console.warn('analyzeSession is deprecated - Session Analysis feature coming soon');
  // Return mock data for now
  return {
    session_id: sessionId,
    analysis: 'Session analysis feature coming soon',
    timestamp: new Date().toISOString()
  };
};

export const fetchDashboardSummary = async (timeframe = 24, params = {}) => {
  console.warn('fetchDashboardSummary is deprecated - use fetchCombinedThreatData instead');
  // Redirect to the new function
  return await fetchCombinedThreatData(timeframe, params);
};