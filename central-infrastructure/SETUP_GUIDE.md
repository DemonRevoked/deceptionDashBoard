# 🚀 AdvDeception Setup Guide

## Prerequisites

Before setting up AdvDeception, ensure you have the following:

### System Requirements
- **Operating System**: Linux (Ubuntu 20.04+ recommended)
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 20GB free space
- **Network**: Access to ports 80, 443, 3000, 5000

### Software Requirements
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Git**: For cloning the repository
- **Node.js**: Version 18+ (for development)

### Network Requirements
- **VPS Server**: Accessible on port 8080
- **MongoDB**: Running on VPS server
- **API Keys**: VPS backend API keys configured

## 🏗️ Installation Steps

### Step 1: Clone the Repository
```bash
# Clone the repository
git clone <repository-url>
cd distributed-architecture/central-infrastructure

# Verify the structure
ls -la
```

### Step 2: Configure Environment Variables
```bash
# Copy the environment template
cp env.example .env

# Edit the environment file
nano .env
```

**Required Environment Variables**:
```bash
# VPS API Configuration
VPS_API_URL=http://YOUR_VPS_IP:8080
VPS_ADMIN_API_KEY=admin_secure_key_here_change_in_production
VPS_CLIENT_A_API_KEY=client_a_secure_key_123
VPS_CLIENT_B_API_KEY=client_b_secure_key_456
VPS_CLIENT_C_API_KEY=client_c_secure_key_789

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_change_this_in_production

# Server Configuration
BACKEND_PORT=5000
FRONTEND_PORT=3000
LOAD_BALANCER_PORT=80

# Database Configuration (Local)
MONGO_URI=mongodb://admin:password@localhost:27017/advdeception?authSource=admin
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=password

# Admin User Configuration
ADMIN_USERNAME=demon
ADMIN_PASSWORD=shadow@123
```

### Step 3: Start the Services
```bash
# Start all services
docker-compose --env-file .env up -d

# Alternatively, use the provided script
./start.sh

# Check service status
docker ps

# View logs
docker-compose logs -f
```

### Step 4: Verify Installation
```bash
# Test frontend access
curl http://localhost:80

# Test backend health
curl http://localhost:5000/api/health/quick

# Test VPS connectivity
curl http://YOUR_VPS_IP:8080/health
```

## 🔧 Configuration Details

### Frontend Configuration
The frontend automatically detects the API URL based on the current location:
- **Development**: `http://localhost:5000/api`
- **Production**: `http://YOUR_SERVER_IP:5000/api`

### Backend Configuration
- **Port**: 5000 (configurable via environment)
- **CORS**: Configured for multiple origins
- **Authentication**: JWT-based with role-based access

### Load Balancer Configuration
- **Port**: 80 (HTTP) / 443 (HTTPS)
- **Routing**: Frontend on port 3000, Backend on port 5000
- **Health Checks**: Automatic health monitoring

## 🗄️ Database Setup

### Local Database (Central Server)
The local database stores:
- User accounts and authentication
- Client organization information
- System configuration
- Session management

**Initial Setup**:
```bash
# Access the backend container
docker exec -it advdeception-backend-vps-api bash

# Initialize the database
node init-db.js
```

### VPS Database (Remote Server)
The VPS database stores:
- Client security events
- Threat intelligence data
- Honeypot interaction logs
- Analytics and reporting data

**VPS Database Collections**:
```
client_a_security_events
client_b_security_events
client_c_security_events
threat_intelligence
system_analytics
```

## 👥 User Management

### Creating Admin Users
```bash
# Access the backend container
docker exec -it advdeception-backend-vps-api bash

# Create admin user
node -e "
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

async function createAdmin() {
  const client = new MongoClient('mongodb://admin:password@localhost:27017/advdeception?authSource=admin');
  await client.connect();
  
  const db = client.db('advdeception');
  const usersCol = db.collection('users');
  
  const hashedPassword = await bcrypt.hash('admin_password', 10);
  
  await usersCol.insertOne({
    username: 'admin',
    email: 'admin@advdeception.com',
    password: hashedPassword,
    role: 'admin',
    status: 'active',
    created_at: new Date()
  });
  
  console.log('Admin user created successfully');
  await client.close();
}

createAdmin();
"
```

### Creating Client Users
```bash
# Create client user (replace CLIENT_ID with actual client ID)
node -e "
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

async function createClientUser() {
  const client = new MongoClient('mongodb://admin:password@localhost:27017/advdeception?authSource=admin');
  await client.connect();
  
  const db = client.db('advdeception');
  const usersCol = db.collection('users');
  
  const hashedPassword = await bcrypt.hash('client_password', 10);
  
  await usersCol.insertOne({
    username: 'client_user',
    email: 'user@client.com',
    password: hashedPassword,
    role: 'user',
    client_id: 'CLIENT_ID',
    status: 'active',
    created_at: new Date()
  });
  
  console.log('Client user created successfully');
  await client.close();
}

createClientUser();
"
```

## 🔐 Security Configuration

### JWT Configuration
- **Secret**: Use a strong, random secret
- **Expiration**: Configure token lifetime
- **Refresh**: Implement token refresh mechanism

### API Key Security
- **VPS API Keys**: Store securely, rotate regularly
- **Client API Keys**: Unique per client organization
- **Access Control**: Limit API key permissions

### Network Security
- **Firewall**: Configure firewall rules
- **SSL/TLS**: Enable HTTPS for production
- **CORS**: Restrict allowed origins

## 📊 Monitoring Setup

### Health Checks
```bash
# Check all services
docker ps

# Check service health
curl http://localhost:5000/api/health

# Check container logs
docker logs advdeception-backend-vps-api
docker logs advdeception-frontend-vps-api
docker logs advdeception-loadbalancer-vps-api
```

### Log Monitoring
```bash
# Follow backend logs
docker logs -f advdeception-backend-vps-api

# Follow frontend logs
docker logs -f advdeception-frontend-vps-api

# Follow load balancer logs
docker logs -f advdeception-loadbalancer-vps-api
```

## 🚨 Troubleshooting

### Common Issues

#### 1. CORS Errors
**Symptoms**: Frontend can't connect to backend
**Solution**: Check CORS configuration in backend

#### 2. VPS API Connection Failed
**Symptoms**: Backend can't connect to VPS
**Solution**: Verify VPS server and API keys

#### 3. Database Connection Issues
**Symptoms**: Authentication failures
**Solution**: Check MongoDB connection and credentials

#### 4. Port Already in Use
**Symptoms**: Services won't start
**Solution**: Check for conflicting services

### Debug Commands
```bash
# Check network connectivity
netstat -tlnp | grep :80
netstat -tlnp | grep :5000
netstat -tlnp | grep :3000

# Check Docker networks
docker network ls
docker network inspect central-infrastructure_advdeception-net

# Check container resources
docker stats

# Test internal connectivity
docker exec advdeception-frontend-vps-api wget -qO- http://backend:5000/api/health
```

## 🔄 Maintenance

### Regular Tasks
- **Log Rotation**: Manage log file sizes
- **Database Backup**: Regular database backups
- **Security Updates**: Keep dependencies updated
- **Performance Monitoring**: Monitor system resources

### Backup Procedures
```bash
# Backup local database
docker exec advdeception-backend-vps-api mongodump --uri="mongodb://admin:password@localhost:27017/advdeception?authSource=admin" --out=/backup

# Backup configuration files
tar -czf config-backup-$(date +%Y%m%d).tar.gz .env docker-compose-*.yml

# Backup application data
tar -czf app-backup-$(date +%Y%m%d).tar.gz backend/ frontend/
```

### Update Procedures
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart services
docker-compose -f docker-compose-vps-api.yml --env-file .env down
docker-compose -f docker-compose-vps-api.yml --env-file .env up -d --build
```

## 📚 Additional Resources

### Documentation
- **README.md**: Project overview and quick start
- **ARCHITECTURE.md**: Technical architecture details
- **API_DOCS.md**: API endpoint documentation

### Support
- **Logs**: Check container logs for errors
- **Health Checks**: Use health endpoints for diagnostics
- **Configuration**: Verify environment variables

---

**Setup Guide Version**: 2.0.0  
**Last Updated**: August 31, 2024  
**Status**: Production Ready
