const requiredEnv = [
  'MONGO_URI',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'JWT_SECRET',
  'OPENAI_API_KEY'
];

function validateEnv() {
  const missingEnv = requiredEnv.filter(envVar => !process.env[envVar]);

  if (missingEnv.length > 0) {
    console.error(`FATAL ERROR: Missing required environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
  }
  console.log('Environment variables validated successfully.');
}

module.exports = validateEnv;