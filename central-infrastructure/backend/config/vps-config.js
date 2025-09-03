// VPS API Configuration
// Copy these environment variables to your .env file

module.exports = {
  // VPS API Configuration
  VPS_API_URL: process.env.VPS_API_URL || 'http://localhost:8080',
  VPS_ADMIN_API_KEY: process.env.VPS_ADMIN_API_KEY || 'admin_secure_key_here_change_in_production',
  VPS_CLIENT_A_API_KEY: process.env.VPS_CLIENT_A_API_KEY || 'client_a_secure_key_123',
  VPS_CLIENT_B_API_KEY: process.env.VPS_CLIENT_B_API_KEY || 'client_b_secure_key_456',
  VPS_CLIENT_C_API_KEY: process.env.VPS_CLIENT_C_API_KEY || 'client_c_secure_key_789',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_here_change_in_production',
  
  // Server Configuration
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Other Configuration (if needed)
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin_password',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'your_openai_api_key',
  HONEYPOT_MANAGER_URL: process.env.HONEYPOT_MANAGER_URL || 'http://honeypot-manager:3000',
  HONEYPOT_MANAGER_SECRET: process.env.HONEYPOT_MANAGER_SECRET || 'your_honeypot_manager_secret'
};

// Required environment variables for VPS API:
// VPS_API_URL - The URL of your VPS backend (e.g., http://YOUR_VPS_IP:8080)
// VPS_ADMIN_API_KEY - Admin API key from VPS backend
// VPS_CLIENT_A_API_KEY - Client A API key from VPS backend
// VPS_CLIENT_B_API_KEY - Client B API key from VPS backend
// VPS_CLIENT_C_API_KEY - Client C API key from VPS backend
// JWT_SECRET - Secret for JWT token generation and verification
