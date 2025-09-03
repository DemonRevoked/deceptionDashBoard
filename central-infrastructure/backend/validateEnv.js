const requiredEnv = [
  'VPS_API_URL',
  'VPS_ADMIN_API_KEY',
  'VPS_CLIENT_A_API_KEY',
  'VPS_CLIENT_B_API_KEY',
  'VPS_CLIENT_C_API_KEY',
  'JWT_SECRET',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD'
];

const optionalEnv = [
  'OPENAI_API_KEY',
  'HONEYPOT_MANAGER_URL',
  'HONEYPOT_MANAGER_SECRET'
];

function validateEnv() {
  const missingEnv = requiredEnv.filter(envVar => !process.env[envVar]);

  if (missingEnv.length > 0) {
    console.error(`FATAL ERROR: Missing required environment variables: ${missingEnv.join(', ')}`);
    console.error('Please check the VPS API configuration in your .env file');
    process.exit(1);
  }

  // Check optional environment variables
  const missingOptionalEnv = optionalEnv.filter(envVar => !process.env[envVar]);
  if (missingOptionalEnv.length > 0) {
    console.warn(`WARNING: Missing optional environment variables: ${missingOptionalEnv.join(', ')}`);
    console.warn('Some features may not work without these variables');
  }

  // Environment validated
  console.log('✅ Environment variables validated successfully');
  console.log(`🌐 VPS API URL: ${process.env.VPS_API_URL}`);
  console.log(`🔑 Admin API Key: ${process.env.VPS_ADMIN_API_KEY ? 'Set' : 'Missing'}`);
  console.log(`🔑 Client A API Key: ${process.env.VPS_CLIENT_A_API_KEY ? 'Set' : 'Missing'}`);
  console.log(`🔑 Client B API Key: ${process.env.VPS_CLIENT_B_API_KEY ? 'Set' : 'Missing'}`);
  console.log(`🔑 Client C API Key: ${process.env.VPS_CLIENT_C_API_KEY ? 'Set' : 'Missing'}`);
}

module.exports = validateEnv;