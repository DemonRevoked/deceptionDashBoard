import axios from 'axios';

const apiClient = axios.create({
  // Use the backend's address. This is configured to work with the docker-compose setup.
  baseURL: 'http://10.0.44.32:5000/api',
});

// Immediately set the token from localStorage if it exists.
// This ensures that the authorization header is set on the apiClient instance
// right when the application loads, before any components try to make API calls.
const token = localStorage.getItem('authToken');
if (token) apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

/**
 * Sets the Authorization header for all subsequent API requests.
 * @param {string|null} token The JWT token.
 */
export const setAuthToken = (token) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// --- Auth ---
export const login = async (username, password) => {
  const response = await apiClient.post('/login', { username, password });
  return response.data;
};

// --- Sessions ---
export const fetchSessions = async () => {
  const response = await apiClient.get('/sessions');
  return response.data;
};

export const fetchSession = async (id) => {
  const response = await apiClient.get(`/sessions/${id}`);
  return response.data;
};

// --- NTP ---
export const fetchNtpRequests = async () => {
  const response = await apiClient.get('/ntp-logs');
  return response.data;
};

// --- Analysis ---
export const analyzeIp = async (ip) => {
    const response = await apiClient.post('/analyze', { ip });
    return response.data;
};