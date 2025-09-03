// Dynamic API configuration for distributed architecture
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    const { protocol, hostname } = window.location;
    
    // Special handling for distributed architecture
    // If accessing from client VM (10.0.44.3), use central backend IP (10.0.44.32)
    let targetHost = hostname;
    if (hostname === '10.0.44.3') {
      targetHost = '10.0.44.32';
      console.log('🔧 Enhanced API: Client VM detected, routing to central backend:', targetHost);
    }
    
    return `${protocol}//${targetHost}/api`;
  }
  return process.env.REACT_APP_API_URL || 'http://backend/api';
};

const API_BASE_URL = getApiBaseUrl();

// Enhanced Events API
export const enhancedEventsApi = {
  // Fetch enhanced events with processed data
  async getEvents(options = {}) {
    const {
      protocol,
      honeypot_id,
      source_ip,
      event_type,
      category,
      severity,
      limit = 100,
      include_insights = true,
      include_analytics = true
    } = options;

    const params = new URLSearchParams();
    if (protocol) params.append('protocol', protocol);
    if (honeypot_id) params.append('honeypot_id', honeypot_id);
    if (source_ip) params.append('source_ip', source_ip);
    if (event_type) params.append('event_type', event_type);
    if (category) params.append('category', category);
    if (severity) params.append('severity', severity);
    if (limit) params.append('limit', limit);
    if (include_insights !== undefined) params.append('include_insights', include_insights);
    if (include_analytics !== undefined) params.append('include_analytics', include_analytics);

    const response = await fetch(`${API_BASE_URL}/enhanced/events?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch enhanced recent events
  async getRecentEvents(options = {}) {
    const {
      hours = 24,
      limit = 100,
      include_insights = true,
      include_analytics = true
    } = options;

    const params = new URLSearchParams();
    if (hours) params.append('hours', hours);
    if (limit) params.append('limit', limit);
    if (include_insights !== undefined) params.append('include_insights', include_insights);
    if (include_analytics !== undefined) params.append('include_analytics', include_analytics);

    const response = await fetch(`${API_BASE_URL}/enhanced/events/recent?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch enhanced event by ID
  async getEventById(id, options = {}) {
    const {
      include_insights = true,
      include_correlations = true
    } = options;

    const params = new URLSearchParams();
    if (include_insights !== undefined) params.append('include_insights', include_insights);
    if (include_correlations !== undefined) params.append('include_correlations', include_correlations);

    const response = await fetch(`${API_BASE_URL}/enhanced/events/${id}?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch enhanced dashboard summary
  async getDashboardSummary(timeRange = 24) {
    const response = await fetch(`${API_BASE_URL}/enhanced/events/dashboard/summary?time_range=${timeRange}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch enhanced threat intelligence summary
  async getThreatIntelligenceSummary(timeRange = 24, limit = 50) {
    const response = await fetch(`${API_BASE_URL}/enhanced/events/threat-intelligence/summary?time_range=${timeRange}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch enhanced attack pattern analysis
  async getAttackPatternAnalysis(timeRange = 24, minOccurrences = 2) {
    const response = await fetch(`${API_BASE_URL}/enhanced/events/analysis/attack-patterns?time_range=${timeRange}&min_occurrences=${minOccurrences}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch active IPs for TTP analysis
  async getActiveIPs(options = {}) {
    const { time_range = 24, min_events = 2 } = options;

    const params = new URLSearchParams();
    if (time_range) params.append('time_range', time_range);
    if (min_events) params.append('min_events', min_events);

    const response = await fetch(`${API_BASE_URL}/enhanced/events/analysis/active-ips?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch IP activity timeline for TTP analysis
  async getIPTimeline(ip, options = {}) {
    const { time_range = 24 } = options;

    const params = new URLSearchParams();
    if (time_range) params.append('time_range', time_range);

    const response = await fetch(`${API_BASE_URL}/enhanced/events/analysis/ip-timeline/${encodeURIComponent(ip)}?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }
};

// Enhanced Analytics API
export const enhancedAnalyticsApi = {
  // Fetch comprehensive security analytics
  async getComprehensiveAnalytics(timeRange = 24) {
    const response = await fetch(`${API_BASE_URL}/enhanced/analytics/comprehensive?time_range=${timeRange}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch overview analytics
  async getOverviewAnalytics(timeRange = 24) {
    const response = await fetch(`${API_BASE_URL}/enhanced/analytics/overview?time_range=${timeRange}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch threat analysis
  async getThreatAnalysis(timeRange = 24) {
    const response = await fetch(`${API_BASE_URL}/enhanced/analytics/threats?time_range=${timeRange}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch attack pattern analysis
  async getAttackPatternAnalytics(timeRange = 24) {
    const response = await fetch(`${API_BASE_URL}/enhanced/analytics/attack-patterns?time_range=${timeRange}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch geographic analysis
  async getGeographicAnalysis(timeRange = 24) {
    const response = await fetch(`${API_BASE_URL}/enhanced/analytics/geographic?time_range=${timeRange}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch protocol analysis
  async getProtocolAnalysis(timeRange = 24) {
    const response = await fetch(`${API_BASE_URL}/enhanced/analytics/protocols?time_range=${timeRange}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch honeypot analysis
  async getHoneypotAnalysis(timeRange = 24) {
    const response = await fetch(`${API_BASE_URL}/enhanced/analytics/honeypots?time_range=${timeRange}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch correlation analysis
  async getCorrelationAnalysis(timeRange = 24) {
    const response = await fetch(`${API_BASE_URL}/enhanced/analytics/correlations?time_range=${timeRange}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch risk assessment
  async getRiskAssessment(timeRange = 24) {
    const response = await fetch(`${API_BASE_URL}/enhanced/analytics/risk-assessment?time_range=${timeRange}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch trend analysis
  async getTrendAnalysis(timeRange = 24) {
    const response = await fetch(`${API_BASE_URL}/enhanced/analytics/trends?time_range=${timeRange}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch security recommendations
  async getSecurityRecommendations(timeRange = 24) {
    const response = await fetch(`${API_BASE_URL}/enhanced/analytics/recommendations?time_range=${timeRange}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch real-time analytics dashboard
  async getRealTimeAnalytics(timeRange = 1) {
    const response = await fetch(`${API_BASE_URL}/enhanced/analytics/dashboard/real-time?time_range=${timeRange}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Custom analytics query
  async getCustomAnalytics(query) {
    const {
      time_range = 24,
      filters = {},
      metrics = [],
      group_by = [],
      sort_by = 'timestamp',
      sort_order = 'desc',
      limit = 100
    } = query;

    const response = await fetch(`${API_BASE_URL}/enhanced/analytics/custom`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        time_range,
        filters,
        metrics,
        group_by,
        sort_by,
        sort_order,
        limit
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }
};

// Utility functions for working with enhanced data

// Process enhanced event data for frontend consumption
export const processEnhancedEventData = (event) => {
  if (!event) return null;

  return {
    id: event._id,
    timestamp: event.timestamp,
    source_ip: event.normalized?.source_ip?.ip || event.source_ip,
    protocol: event.normalized?.protocol?.normalized || event.protocol,
    event_type: event.normalized?.event_type || event.event_type,
    severity: event.normalized?.severity || event.severity,
    honeypot: event.normalized?.honeypot_info?.name || event.honeypot_name,
    geolocation: event.normalized?.geolocation,
    attack_details: event.normalized?.attack_details,
    insights: event.insights,
    threat_intelligence: event.threat_intelligence,
    // Keep original data for backward compatibility
    ...event
  };
};

// Process enhanced events array
export const processEnhancedEventsData = (events) => {
  if (!Array.isArray(events)) return [];
  return events.map(processEnhancedEventData).filter(Boolean);
};

// Extract analytics data from enhanced response
export const extractAnalyticsData = (response) => {
  if (!response || !response.analytics) return null;
  
  return {
    threat_distribution: response.analytics.threat_distribution || {},
    attack_type_distribution: response.analytics.attack_type_distribution || {},
    geographic_distribution: response.analytics.geographic_distribution || {},
    protocol_distribution: response.analytics.protocol_distribution || {},
    top_attackers: response.analytics.top_attackers || [],
    time_series: response.analytics.time_series || [],
    recent_alerts: response.analytics.recent_alerts || []
  };
};

// Format enhanced data for charts
export const formatEnhancedDataForCharts = (data, chartType) => {
  switch (chartType) {
    case 'threat_distribution':
      return Object.entries(data.threat_distribution || {}).map(([level, count]) => ({
        name: level,
        value: count
      }));
    
    case 'attack_type_distribution':
      return Object.entries(data.attack_type_distribution || {}).map(([type, count]) => ({
        name: type,
        value: count
      }));
    
    case 'geographic_distribution':
      return Object.entries(data.geographic_distribution || {}).map(([country, count]) => ({
        name: country,
        value: count
      }));
    
    case 'protocol_distribution':
      return Object.entries(data.protocol_distribution || {}).map(([protocol, count]) => ({
        name: protocol,
        value: count
      }));
    
    case 'time_series':
      return data.time_series || [];
    
    case 'top_attackers':
      return data.top_attackers || [];
    
    default:
      return [];
  }
};

// Get threat level color
export const getThreatLevelColor = (level) => {
  const colors = {
    'Critical': '#dc2626',
    'High': '#ea580c',
    'Medium': '#d97706',
    'Low': '#2563eb',
    'Minimal': '#059669',
    'Unknown': '#6b7280'
  };
  
  return colors[level] || colors['Unknown'];
};

// Get severity color
export const getSeverityColor = (severity) => {
  return getThreatLevelColor(severity);
};

// Format timestamp for display
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Unknown';
  
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch (error) {
    return 'Invalid date';
  }
};

// Calculate risk score percentage
export const calculateRiskScorePercentage = (score, maxScore = 10) => {
  if (!score || !maxScore) return 0;
  return Math.round((score / maxScore) * 100);
};

// Get risk level from score
export const getRiskLevelFromScore = (score) => {
  if (score >= 8) return 'Critical';
  if (score >= 6) return 'High';
  if (score >= 4) return 'Medium';
  if (score >= 2) return 'Low';
  return 'Minimal';
};

// Export default API object
export default {
  events: enhancedEventsApi,
  analytics: enhancedAnalyticsApi,
  utils: {
    processEnhancedEventData,
    processEnhancedEventsData,
    extractAnalyticsData,
    formatEnhancedDataForCharts,
    getThreatLevelColor,
    getSeverityColor,
    formatTimestamp,
    calculateRiskScorePercentage,
    getRiskLevelFromScore
  }
};
