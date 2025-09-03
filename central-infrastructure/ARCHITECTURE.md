# 🏗️ AdvDeception Technical Architecture

## System Overview

AdvDeception is a multi-tenant security platform that separates concerns between local authentication/management and remote security data storage. This architecture ensures data privacy while maintaining centralized control.

## 🔄 Data Flow Architecture

### 1. Authentication Flow
```
User Login Request → Frontend → Backend API → Local MongoDB → JWT Token → Frontend Storage
```

### 2. Data Access Flow
```
Authenticated Request → Backend API → VPS API → VPS MongoDB → Filtered Data → Frontend
```

### 3. Security Event Flow
```
Client Security Tools → VPS API → VPS MongoDB → Central Backend → Frontend Dashboard
```

## 🗄️ Database Architecture

### Local Database (Central Server)
**Purpose**: System management, user authentication, and client metadata

**Collections**:
- `users` - User accounts and credentials
- `clients` - Client organization information
- `sessions` - Active user sessions
- `system_config` - Platform configuration
- `audit_logs` - System access logs

**Data Characteristics**:
- Small volume, high security
- Frequent read/write operations
- Critical for system operation
- Backup and recovery essential

### VPS Database (Remote Server)
**Purpose**: Client security data and threat intelligence

**Collections**:
- `client_a_security_events` - Client A security data
- `client_b_security_events` - Client B security data
- `client_c_security_events` - Client C security data
- `threat_intelligence` - Shared threat data
- `system_analytics` - Cross-client analytics

**Data Characteristics**:
- Large volume, growing continuously
- Read-heavy operations
- Client-isolated access
- Historical data retention

## 🔐 Security Architecture

### Authentication Layers

#### Layer 1: User Authentication (Local)
- **JWT Token Generation**: Backend creates JWT with user info and client ID
- **Session Management**: Local database tracks active sessions
- **Password Security**: Bcrypt hashing with salt

#### Layer 2: API Access Control (VPS)
- **Client API Keys**: Unique keys for each client organization
- **Request Validation**: Backend validates client ID against JWT
- **Data Filtering**: VPS API returns only client-specific data

#### Layer 3: Data Isolation (Database)
- **Collection Separation**: Each client has dedicated collections
- **Access Control**: Database-level user permissions
- **Audit Logging**: All data access is logged

### Security Features

#### Network Security
- **CORS Configuration**: Strict origin validation
- **Rate Limiting**: Per-client and global limits
- **Firewall Rules**: Network segmentation
- **SSL/TLS**: Encrypted communication

#### Data Security
- **Encryption at Rest**: Database encryption
- **Encryption in Transit**: HTTPS and WSS
- **Access Logging**: Complete audit trail
- **Data Backup**: Regular encrypted backups

## 🏛️ Component Architecture

### Frontend Layer (React)
```
┌─────────────────────────────────────────────────────────┐
│                    React Application                    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Auth      │  │  Dashboard  │  │   Charts    │   │
│  │  Context    │  │ Components  │  │ Components  │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   API       │  │ WebSocket   │  │   Router    │   │
│  │  Service    │  │   Client    │  │ Components  │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Key Components**:
- **AuthContext**: Manages authentication state
- **API Service**: Handles HTTP requests to backend
- **WebSocket Client**: Real-time updates
- **Protected Routes**: Role-based access control

### Backend Layer (Node.js)
```
┌─────────────────────────────────────────────────────────┐
│                   Express Server                       │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Auth      │  │   VPS API   │  │ WebSocket   │   │
│  │ Middleware  │  │  Service    │  │   Server    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Routes    │  │   Database  │  │   Logging   │   │
│  │  Handlers   │  │ Connections │  │   Service   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Key Components**:
- **Authentication Middleware**: JWT validation and role checking
- **VPS API Service**: Communication with remote VPS
- **Route Handlers**: API endpoint logic
- **WebSocket Server**: Real-time communication

### Infrastructure Layer
```
┌─────────────────────────────────────────────────────────┐
│                 Docker Containers                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Frontend   │  │   Backend   │  │    Nginx    │   │
│  │  (Port 3000)│  │ (Port 5000) │  │ (Port 80)  │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 🔄 API Architecture

### Internal APIs (Local Backend)
```
POST /api/auth/login          - User authentication
GET  /api/auth/verify         - Token validation
GET  /api/health             - System health check
GET  /api/info               - System information
```

### VPS Integration APIs
```
GET  /api/events             - Security events (filtered by client)
GET  /api/honeypots          - Honeypot status (filtered by client)
GET  /api/analytics          - Security analytics (filtered by client)
POST /api/events             - Submit security events to VPS
```

### VPS Backend APIs
```
GET  /health                 - VPS health check
GET  /api/client/status      - Client status information
GET  /api/client/data/:type  - Client-specific data
GET  /api/dashboard/overview - System overview (admin)
```

## 🚀 Deployment Architecture

### Production Deployment
```
Internet → Load Balancer → Frontend Container → Backend Container → VPS Server
    ↓              ↓              ↓              ↓              ↓
  Port 80    Port 80/443    Port 3000      Port 5000      Port 8080
```

### Development Environment
```
Local Machine → Docker Compose → Local Services → VPS Server (Remote)
```

### Scaling Strategy
```
Load Balancer → Multiple Frontend Instances → Multiple Backend Instances → VPS Cluster
```

## 🔍 Monitoring & Observability

### Health Checks
- **Container Health**: Docker health checks
- **API Health**: Endpoint availability
- **Database Health**: Connection status
- **VPS Health**: Remote service status

### Logging Strategy
- **Application Logs**: Structured JSON logging
- **Access Logs**: HTTP request/response logging
- **Error Logs**: Exception and error tracking
- **Audit Logs**: Security event logging

### Metrics Collection
- **Performance Metrics**: Response times, throughput
- **Resource Metrics**: CPU, memory, disk usage
- **Business Metrics**: User activity, data volume
- **Security Metrics**: Authentication attempts, access patterns

## 🛡️ Security Considerations

### Threat Model
- **External Threats**: DDoS, SQL injection, XSS
- **Internal Threats**: Privilege escalation, data leakage
- **Infrastructure Threats**: Container escape, network attacks

### Mitigation Strategies
- **Input Validation**: All user inputs validated
- **Output Encoding**: XSS prevention
- **Access Control**: Principle of least privilege
- **Monitoring**: Continuous security monitoring

## 🔧 Configuration Management

### Environment Variables
- **Development**: `.env.development`
- **Staging**: `.env.staging`
- **Production**: `.env.production`

### Configuration Categories
- **Database**: Connection strings, credentials
- **API Keys**: VPS API authentication
- **Security**: JWT secrets, encryption keys
- **Network**: Ports, CORS origins, URLs

## 📊 Data Models

### User Model
```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String (hashed),
  role: String (user|admin|client_admin),
  client_id: String,
  status: String (active|inactive),
  created_at: Date,
  last_login: Date
}
```

### Client Model
```javascript
{
  _id: ObjectId,
  client_id: String,
  name: String,
  api_key: String,
  status: String (active|inactive),
  created_at: Date,
  settings: Object
}
```

### Security Event Model
```javascript
{
  _id: ObjectId,
  client_id: String,
  event_type: String,
  severity: String (low|medium|high|critical),
  timestamp: Date,
  source_ip: String,
  description: String,
  metadata: Object
}
```

## 🔄 State Management

### Frontend State
- **Authentication State**: User info, tokens, permissions
- **Application State**: UI state, form data, filters
- **Real-time State**: WebSocket updates, live data

### Backend State
- **Session State**: Active sessions, user context
- **Connection State**: Database connections, VPS API status
- **Cache State**: Frequently accessed data

## 🚨 Error Handling

### Error Categories
- **Authentication Errors**: Invalid credentials, expired tokens
- **Authorization Errors**: Insufficient permissions
- **Validation Errors**: Invalid input data
- **System Errors**: Database failures, network issues

### Error Response Format
```javascript
{
  success: false,
  error: "Error description",
  code: "ERROR_CODE",
  details: "Additional information",
  timestamp: "ISO timestamp"
}
```

## 🔮 Future Architecture Considerations

### Scalability Improvements
- **Horizontal Scaling**: Multiple backend instances
- **Database Sharding**: Distribute data across multiple databases
- **Caching Layer**: Redis for performance optimization
- **CDN Integration**: Static asset distribution

### Security Enhancements
- **Multi-Factor Authentication**: 2FA implementation
- **API Rate Limiting**: Advanced rate limiting strategies
- **Encryption**: End-to-end encryption
- **Compliance**: GDPR, SOC2 compliance features

### Monitoring Improvements
- **Distributed Tracing**: Request flow tracking
- **Metrics Aggregation**: Centralized metrics collection
- **Alerting**: Automated alert systems
- **Dashboards**: Real-time monitoring dashboards

---

**Document Version**: 2.0.0  
**Last Updated**: August 31, 2024  
**Status**: Active Development
