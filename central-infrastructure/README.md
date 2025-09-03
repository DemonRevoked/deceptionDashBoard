# 🚀 AdvDeception Multi-Tenant Security Platform

A comprehensive, multi-tenant security platform that provides centralized management of deception technologies, threat detection, and security analytics. Built with a modern microservices architecture using React frontend, Node.js backend, and VPS-based data storage.

## 🎯 Project Purpose

**AdvDeception** is designed to serve multiple security clients (organizations) from a single centralized platform, providing:

- **Centralized Security Management**: Single dashboard for managing multiple client security infrastructures
- **Multi-Tenant Architecture**: Complete data isolation between clients while sharing platform resources
- **Deception Technology Integration**: Honeypots, decoys, and deception mechanisms for threat detection
- **Real-time Threat Intelligence**: Live monitoring and alerting of security events
- **Scalable Infrastructure**: Cloud-ready architecture that can grow with client needs

## 🏗️ System Architecture

### High-Level Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                    Client Organizations                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │  Client A   │  │  Client B   │  │  Client C   │           │
│  │ (Company 1) │  │ (Company 2) │  │ (Company 3) │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                Central Infrastructure Server                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │  Frontend   │  │   Backend   │  │ Load Bal.   │           │
│  │  (React)    │  │  (Node.js)  │  │  (Nginx)    │           │
│  │  Port 3000  │  │  Port 5000  │  │  Port 80    │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VPS Backend Server                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │   MongoDB   │  │  Client     │  │   Admin     │           │
│  │  Database   │  │   APIs      │  │    APIs     │           │
│  │  Port 27017 │  │ Port 8080   │  │ Port 8080   │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture
```
Client Security Tools → VPS Backend → MongoDB → Central Backend → Frontend Dashboard
                                    ↓
                              Client Data Isolation
                                    ↓
                              Role-Based Access Control
```

## 🔐 Multi-Tenant Security Model

### Client Isolation
- **Complete Data Separation**: Each client's data is stored in separate MongoDB collections
- **API Key Authentication**: Unique API keys for each client organization
- **JWT Token Validation**: Secure authentication with client ID embedded in tokens
- **Access Control**: Clients can only access their own data and systems

### Authentication Levels
1. **Client Users**: Access only their organization's data
2. **Client Admins**: Manage their organization's security infrastructure
3. **Platform Admins**: Access system-wide overview and manage all clients

## 🚀 Core Components

### 1. Frontend (React Application)
- **Port**: 3000 (direct access) / 80 (through load balancer)
- **Technology**: React 18 with modern hooks and context
- **Features**:
  - Responsive dashboard for security monitoring
  - Real-time threat visualization
  - Client-specific data views
  - Role-based access control
  - Interactive security analytics

### 2. Backend API Server (Node.js)
- **Port**: 5000
- **Technology**: Express.js with JWT authentication
- **Features**:
  - Client authentication and authorization
  - VPS API integration
  - WebSocket support for real-time updates
  - Rate limiting and security middleware
  - Health monitoring and logging

### 3. Load Balancer (Nginx)
- **Port**: 80 (HTTP) / 443 (HTTPS)
- **Purpose**: Route traffic between frontend and backend
- **Features**:
  - Reverse proxy configuration
  - SSL termination (when configured)
  - Load distribution
  - Health checking

### 4. VPS Backend Server
- **Port**: 8080
- **Technology**: Node.js with MongoDB
- **Purpose**: Store and manage client security data
- **Features**:
  - Multi-tenant database design
  - Client API endpoints
  - Admin dashboard APIs
  - Data processing and analytics

## 📊 Data Architecture

### Local Database (Central Server)
- **Purpose**: User authentication, session management, system configuration
- **Data Types**:
  - User accounts and credentials
  - Client organization details
  - System settings and configurations
  - Authentication tokens and sessions

### VPS Database (Remote Server)
- **Purpose**: Client security data, threat intelligence, event logs
- **Data Types**:
  - Security event logs
  - Honeypot interaction data
  - Threat intelligence feeds
  - Network scan results
  - Deception technology events

### Data Separation Strategy
```
Central Server (Local)
├── User Management
├── Authentication
├── System Configuration
└── Client Metadata

VPS Server (Remote)
├── Client A Security Data
├── Client B Security Data
├── Client C Security Data
└── Cross-Client Analytics (Admin Only)
```

## 🔧 Technology Stack

### Frontend
- **React 18**: Modern UI framework
- **Material-UI**: Component library
- **Axios**: HTTP client for API calls
- **Socket.io**: Real-time WebSocket communication
- **Chart.js**: Data visualization

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **JWT**: Authentication tokens
- **Socket.io**: WebSocket server
- **Axios**: HTTP client for VPS API calls

### Infrastructure
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **Nginx**: Load balancer and reverse proxy
- **MongoDB**: Database (both local and VPS)

## 🚀 Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for development)
- Access to VPS server with MongoDB

### Quick Start
```bash
# 1. Clone the repository
git clone <repository-url>
cd central-infrastructure

# 2. Configure environment variables
cp env.vps-api.yml .env
# Edit .env with your VPS details

# 3. Start all services
docker-compose -f docker-compose-vps-api.yml --env-file .env up -d

# 4. Access the application
# Frontend: http://your-server-ip:80
# Backend API: http://your-server-ip:5000
```

### Environment Configuration
```bash
# VPS API Configuration
VPS_API_URL=http://your-vps-ip:8080
VPS_ADMIN_API_KEY=your_admin_api_key
VPS_CLIENT_A_API_KEY=client_a_api_key
VPS_CLIENT_B_API_KEY=client_b_api_key
VPS_CLIENT_C_API_KEY=client_c_api_key

# JWT Configuration
JWT_SECRET=your_jwt_secret

# Server Configuration
BACKEND_PORT=5000
FRONTEND_PORT=3000
LOAD_BALANCER_PORT=80
```

## 🔍 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Token verification

### Health Monitoring
- `GET /api/health/quick` - Basic health check
- `GET /api/health` - Full system health status

### Client Data (Protected)
- `GET /api/events` - Security events (client-isolated)
- `GET /api/honeypots` - Honeypot status (client-isolated)
- `GET /api/analytics` - Security analytics (client-isolated)

### Admin Endpoints (Admin Only)
- `GET /api/admin/overview` - System-wide overview
- `GET /api/admin/clients` - All client information
- `GET /api/admin/analytics` - Cross-client analytics

## 🛡️ Security Features

### Authentication & Authorization
- JWT-based token authentication
- Role-based access control (RBAC)
- API key validation for VPS communication
- Session management and timeout

### Data Protection
- Client data isolation at database level
- Encrypted API communication
- Rate limiting and DDoS protection
- Audit logging for all operations

### Network Security
- CORS configuration for cross-origin requests
- HTTPS support (when configured)
- Firewall rules and network segmentation
- Secure WebSocket connections

## 📈 Monitoring & Health

### System Health Checks
- Container health monitoring
- API endpoint availability
- Database connection status
- VPS API connectivity

### Logging & Debugging
- Structured logging with timestamps
- Error tracking and reporting
- Performance metrics
- Security event logging

## 🔄 Development Workflow

### Local Development
```bash
# Start development environment
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Docker Development
```bash
# Start services with hot reload
docker-compose -f docker-compose-vps-api.yml up

# View logs
docker-compose logs -f

# Rebuild and restart
docker-compose up --build
```

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check CORS configuration in backend
   - Verify frontend URL is in allowed origins

2. **VPS API Connection Failed**
   - Verify VPS server is running
   - Check API keys and network connectivity
   - Ensure firewall allows port 8080

3. **Authentication Issues**
   - Verify JWT secret configuration
   - Check user credentials in database
   - Ensure client exists in VPS system

### Debug Commands
```bash
# Check service status
docker ps

# View backend logs
docker logs advdeception-backend-vps-api

# Test VPS connectivity
curl http://your-vps-ip:8080/health

# Check API endpoints
curl http://localhost:5000/api/health
```

## 🔮 Future Enhancements

### Phase 2 Features
- Real-time threat intelligence feeds
- Advanced analytics and machine learning
- Automated threat response
- Multi-VPS support and failover

### Phase 3 Features
- Mobile application support
- Advanced reporting and compliance
- Integration with SIEM systems
- AI-powered threat detection

## 📞 Support & Contributing

### Getting Help
- Check the troubleshooting section
- Review logs and error messages
- Test individual components
- Verify configuration files

### Contributing
- Follow the established architecture patterns
- Update documentation for new features
- Test thoroughly before submitting
- Maintain backward compatibility

---

**Project Status**: Production Ready  
**Last Updated**: August 31, 2024  
**Version**: 2.0.0  
**License**: Proprietary - AdvDeception Security Platform
