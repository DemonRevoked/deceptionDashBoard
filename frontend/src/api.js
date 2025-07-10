import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://10.0.44.32:5000/api',
});

const token = localStorage.getItem('authToken');
if (token) apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

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

// --- Events ---
export const fetchEvents = async (filters = {}) => {
  const params = { ...filters };
  console.log('Fetching events with params:', params);
  const response = await apiClient.get('/events', { params });
  console.log('Events API response:', response.data);
  return response.data;
};

// --- Sessions ---
export const fetchSessions = async (filters = {}) => {
  const params = { ...filters };
  console.log('Fetching sessions with params:', params);
  const response = await apiClient.get('/events', { 
    params: { ...params, event_type: 'session' }
  });
  console.log('Sessions API response:', response.data);
  return response.data;
};

export const fetchSessionById = async (sessionId) => {
  const response = await apiClient.get(`/events/${sessionId}`);
  return response.data;
};

// --- Raw Logs ---
export const fetchRawLogs = async (filters = {}) => {
  const params = { ...filters };
  const response = await apiClient.get('/events/raw-logs', { params });
  return response.data;
};

// --- Honeypots ---
export const fetchHoneypots = async () => {
  const response = await apiClient.get('/honeypots');
  return response.data;
};

// --- Analysis ---
export const analyzeSession = async (sessionId) => {
  const response = await apiClient.post(`/analysis/analyze`, { session_id: sessionId });
  return response.data;
};

export const fetchAnalyses = async (filters = {}) => {
  const params = { ...filters };
  const response = await apiClient.get('/analyses', { params });
    return response.data;
};