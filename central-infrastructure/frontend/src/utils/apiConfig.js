/**
 * Dynamic API Configuration Utility
 * Automatically determines the API base URL from the current page location
 */

// Get the current host (IP or domain) and port from the browser
const getCurrentHost = () => {
  const { protocol, hostname, port } = window.location;
  
  // If we're accessing the frontend on a specific port, use nginx proxy (port 80)
  // Backend is exposed through nginx on port 80
  
  // Construct the backend URL using nginx proxy
  return `${protocol}//${hostname}`;
};

// API base URL - dynamically determined
export const API_BASE_URL = getCurrentHost();

// WebSocket base URL - dynamically determined
export const WS_BASE_URL = getCurrentHost();

// Full API endpoint URLs
export const API_ENDPOINTS = {
  // Network Security
  DASHBOARD_SUMMARY: `${API_BASE_URL}/api/network-security/dashboard-summary`,
  THREAT_FEED: `${API_BASE_URL}/api/network-security/threat-feed`,
  ATTACK_PATTERNS: `${API_BASE_URL}/api/network-security/attack-patterns`,
  CLIENT_STATUS: `${API_BASE_URL}/api/network-security/client-status`,
  
  // Honeypots
  HONEYPOTS: `${API_BASE_URL}/api/honeypots`,
  EVENTS: `${API_BASE_URL}/api/events`,
  OT_HONEYPOTS: `${API_BASE_URL}/api/honeypots/ot`,
  
  // Enhanced APIs (when available)
  ENHANCED_EVENTS: `${API_BASE_URL}/api/enhanced/events`,
  ENHANCED_ANALYTICS: `${API_BASE_URL}/api/enhanced/analytics`,
  
  // Health
  HEALTH: `${API_BASE_URL}/api/health`,
};

// WebSocket endpoint
export const WS_ENDPOINT = `${WS_BASE_URL}/socket.io`;

// Debug logging (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 API Configuration:', {
    currentLocation: window.location.href,
    apiBaseUrl: API_BASE_URL,
    wsBaseUrl: WS_BASE_URL,
    endpoints: API_ENDPOINTS
  });
}
