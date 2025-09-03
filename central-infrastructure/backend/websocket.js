const { Server } = require('socket.io');

let io = null;
let changeStreams = [];
let changeStreamsEnabled = false;
let healthStatusCache = null;
let lastHealthCheck = 0;

function initializeWebSocket(httpServer, db) {
  io = new Server(httpServer, {
    cors: {
      origin: [
        "http://frontend:3000",
        "http://localhost:3000",
        "http://10.0.44.3:3000",
        "http://10.0.44.32:3000",
        "http://10.0.44.32",
        "http://127.0.0.1:3000"
      ],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Handle client connections
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected. Total: ${io.sockets.sockets.size}`);
    
    // Send initial status
    try {
      socket.emit('websocket-status', {
        connected: true,
        changeStreams: changeStreamsEnabled && db !== null,
        timestamp: new Date(),
        mode: db ? 'full' : 'limited'
      });

      // Send cached health status immediately if available
      if (healthStatusCache) {
        socket.emit('health-status', healthStatusCache);
      }
    } catch (error) {
      console.error('Error sending initial status:', error.message);
    }
    
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${reason}. Total: ${io.sockets.sockets.size}`);
    });

    // Join rooms for specific honeypots (only if database is available)
    socket.on('join-honeypot', (honeypotId) => {
      try {
        if (db && honeypotId && typeof honeypotId === 'string') {
          socket.join(`honeypot-${honeypotId}`);
          socket.emit('honeypot-joined', { honeypotId, success: true });
        } else if (!db) {
          socket.emit('honeypot-joined', { 
            honeypotId, 
            success: false, 
            error: 'Database not available' 
          });
        }
      } catch (error) {
        console.error('Error joining honeypot room:', error.message);
        socket.emit('honeypot-joined', { 
          honeypotId, 
          success: false, 
          error: error.message 
        });
      }
    });

    // Leave honeypot rooms
    socket.on('leave-honeypot', (honeypotId) => {
      try {
        if (honeypotId && typeof honeypotId === 'string') {
          socket.leave(`honeypot-${honeypotId}`);
        }
      } catch (error) {
        console.error('Error leaving honeypot room:', error.message);
      }
    });

    // Subscribe to health updates
    socket.on('subscribe-health', () => {
      try {
        socket.join('health-monitoring');
        // Send current status immediately
        if (healthStatusCache) {
          socket.emit('health-status', healthStatusCache);
        }
      } catch (error) {
        console.error('Error subscribing to health updates:', error.message);
      }
    });

    // Unsubscribe from health updates
    socket.on('unsubscribe-health', () => {
      try {
        socket.leave('health-monitoring');
      } catch (error) {
        console.error('Error unsubscribing from health updates:', error.message);
      }
    });

    // ===== NEW DASHBOARD SUBSCRIPTIONS =====
    
    // Subscribe to dashboard updates
    socket.on('subscribe-dashboard', () => {
      try {
        socket.join('dashboard-updates');
        console.log('📊 Client subscribed to dashboard updates');
        
        // Send initial dashboard status
        if (db) {
          // Send database-dependent dashboard data
          socket.emit('dashboard-status', {
            status: 'subscribed',
            mode: 'full',
            timestamp: new Date().toISOString()
          });
        } else {
          // Send limited dashboard status
          socket.emit('dashboard-status', {
            status: 'subscribed',
            mode: 'limited',
            note: 'Running without database - limited functionality',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error subscribing to dashboard updates:', error.message);
      }
    });

    // Unsubscribe from dashboard updates
    socket.on('unsubscribe-dashboard', () => {
      try {
        socket.leave('dashboard-updates');
        console.log('📊 Client unsubscribed from dashboard updates');
      } catch (error) {
        console.error('Error unsubscribing from dashboard updates:', error.message);
      }
    });

    // Subscribe to real-time events
    socket.on('subscribe-events', () => {
      try {
        socket.join('real-time-events');
        console.log('📡 Client subscribed to real-time events');
        
        if (db) {
          socket.emit('events-status', {
            status: 'subscribed',
            mode: 'full',
            timestamp: new Date().toISOString()
          });
        } else {
          socket.emit('events-status', {
            status: 'subscribed',
            mode: 'limited',
            note: 'Database not available - events will not be real-time',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error subscribing to real-time events:', error.message);
      }
    });

    // Unsubscribe from real-time events
    socket.on('unsubscribe-events', () => {
      try {
        socket.leave('real-time-events');
        console.log('📡 Client unsubscribed from real-time events');
      } catch (error) {
        console.error('Error unsubscribing from real-time events:', error.message);
      }
    });

    // Subscribe to network security updates
    socket.on('subscribe-network-security', () => {
      try {
        socket.join('network-security-updates');
        console.log('🛡️ Client subscribed to network security updates');
        
        if (db) {
          socket.emit('network-security-status', {
            status: 'subscribed',
            mode: 'full',
            timestamp: new Date().toISOString()
          });
        } else {
          socket.emit('network-security-status', {
            status: 'subscribed',
            mode: 'limited',
            note: 'Database not available - limited network security data',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error subscribing to network security updates:', error.message);
      }
    });

    // Unsubscribe from network security updates
    socket.on('unsubscribe-network-security', () => {
      try {
        socket.leave('network-security-updates');
        console.log('🛡️ Client unsubscribed from network security updates');
      } catch (error) {
        console.error('Error unsubscribing from network security updates:', error.message);
      }
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      try {
        socket.emit('pong', {
          timestamp: new Date().toISOString(),
          serverTime: Date.now()
        });
      } catch (error) {
        console.error('Error handling ping:', error.message);
      }
    });

    // Handle custom events (for testing)
    socket.on('test-event', (data) => {
      try {
        console.log('🧪 Test event received:', data);
        socket.emit('test-event-response', {
          received: data,
          timestamp: new Date().toISOString(),
          mode: db ? 'full' : 'limited'
        });
      } catch (error) {
        console.error('Error handling test event:', error.message);
      }
    });
  });

  // Set up health monitoring if database is available
  if (db) {
    setupHealthStatusBroadcasting();
    setupChangeStreams(db);
  } else {
    console.log('⚠️  WebSocket initialized without database - limited functionality available');
    setupHealthStatusBroadcasting();
  }

  return io;
}

// Efficient health status broadcasting
function setupHealthStatusBroadcasting() {
  setInterval(async () => {
    try {
      const now = Date.now();
      // Only check if we have connected clients and it's been more than 2 minutes
      if (io && io.sockets.sockets.size > 0 && now - lastHealthCheck > 2 * 60 * 1000) {
        const healthStatus = await getQuickHealthStatus();
        
        // Only broadcast if status changed
        if (!healthStatusCache || hasHealthStatusChanged(healthStatusCache, healthStatus)) {
          healthStatusCache = healthStatus;
          
          // Safely emit to health monitoring room
          const healthRoom = io.sockets.adapter.rooms.get('health-monitoring');
          if (healthRoom && healthRoom.size > 0) {
            io.to('health-monitoring').emit('health-status', healthStatus);
            console.log('📡 Health status broadcasted to', healthRoom.size, 'clients');
          }
        }
        
        lastHealthCheck = now;
      }
    } catch (error) {
      console.error('❌ Health status broadcast failed:', error.message);
    }
  }, 30000); // Check every 30 seconds, but only update if changed
}

// Quick health status check (internal use)
async function getQuickHealthStatus() {
  const startTime = Date.now();
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      backend: {
        status: 'running',
        uptime: process.uptime(),
        responseTime: Date.now() - startTime
      },
      database: {
        status: global.mongoClient ? 'connected' : 'disconnected',
        lastChecked: new Date().toISOString()
      },
      websocket: {
        status: 'active',
        connections: io ? io.sockets.sockets.size : 0,
        lastChecked: new Date().toISOString()
      },
      honeypotManager: {
        status: 'unknown', // Skip expensive check for broadcasting
        lastChecked: new Date().toISOString()
      }
    }
  };
}

// Check if health status has actually changed
function hasHealthStatusChanged(oldStatus, newStatus) {
  if (!oldStatus) return true;
  
  const oldServices = oldStatus.services || {};
  const newServices = newStatus.services || {};
  
  const serviceKeys = ['backend', 'database', 'websocket'];
  
  return serviceKeys.some(key => {
    const oldService = oldServices[key] || {};
    const newService = newServices[key] || {};
    return oldService.status !== newService.status;
  });
}

// Broadcast events to connected clients
function broadcastEvent(event) {
  try {
    if (io && event && typeof event === 'object') {
      io.emit('new-event', event);
    }
  } catch (error) {
    console.error('Error broadcasting event:', error.message);
  }
}

// Broadcast honeypot-specific events
function broadcastHoneypotEvent(honeypotId, event) {
  try {
    if (io && honeypotId && event && typeof event === 'object') {
      io.to(`honeypot-${honeypotId}`).emit('honeypot-event', event);
    }
  } catch (error) {
    console.error('Error broadcasting honeypot event:', error.message);
  }
}

// Try to set up MongoDB change streams
function setupChangeStreams(db) {
  try {
    const deceptionDetectionCol = db.collection('deception_detection');
    const scanAlertsCol = db.collection('scan_alerts');
    
    // Only set up change streams if MongoDB supports it
    if (deceptionDetectionCol.watch) {
      console.log('📊 Setting up MongoDB change streams for streamlined collections...');
      
      // Watch both collections for changes
      const deceptionChangeStream = deceptionDetectionCol.watch([], { fullDocument: 'updateLookup' });
      const scanAlertsChangeStream = scanAlertsCol.watch([], { fullDocument: 'updateLookup' });
      
      deceptionChangeStream.on('change', (change) => {
        if (change.operationType === 'insert') {
          const event = change.fullDocument;
          console.log('📡 Broadcasting new deception detection event via change stream');
          broadcastEvent(event);
          
          // Also broadcast to specific honeypot room if applicable
          if (event.dest_port) {
            broadcastHoneypotEvent(event.dest_port, event);
          }
        }
      });
      
      scanAlertsChangeStream.on('change', (change) => {
        if (change.operationType === 'insert') {
          const event = change.fullDocument;
          console.log('📡 Broadcasting new scan alert via change stream');
          broadcastEvent(event);
        }
      });
      
      deceptionChangeStream.on('error', (error) => {
        console.warn('📊 Deception detection change stream error (falling back to polling):', error.message);
        changeStreamsEnabled = false;
      });
      
      scanAlertsChangeStream.on('error', (error) => {
        console.warn('📊 Scan alerts change stream error (falling back to polling):', error.message);
        changeStreamsEnabled = false;
      });
      
      changeStreams.push(deceptionChangeStream, scanAlertsChangeStream);
      changeStreamsEnabled = true;
      console.log('✅ MongoDB change streams active for streamlined collections');
    } else {
      console.log('📊 MongoDB change streams not supported, using polling fallback');
      setupPollingFallback(db);
    }
  } catch (error) {
    console.warn('📊 Failed to setup change streams, using polling fallback:', error.message);
    setupPollingFallback(db);
  }
}

// Polling fallback for real-time events (much less frequent)
function setupPollingFallback(db) {
  let lastDeceptionEventTime = new Date();
  let lastScanAlertTime = new Date();
  
  setInterval(async () => {
    try {
      // Only poll if we have connected clients
      if (!io || io.sockets.sockets.size === 0) return;
      
      const deceptionDetectionCol = db.collection('deception_detection');
      const scanAlertsCol = db.collection('scan_alerts');
      
      // Poll both collections
      const [newDeceptionEvents, newScanAlerts] = await Promise.all([
        deceptionDetectionCol
          .find({ timestamp: { $gt: lastDeceptionEventTime.toISOString() } })
          .sort({ timestamp: 1 })
          .limit(5)
          .toArray(),
        scanAlertsCol
          .find({ timestamp: { $gt: lastScanAlertTime.toISOString() } })
          .sort({ timestamp: 1 })
          .limit(5)
          .toArray()
      ]);
      
      const allNewEvents = [...newDeceptionEvents, ...newScanAlerts];
      
      if (allNewEvents.length > 0) {
        console.log(`📡 Emitting ${allNewEvents.length} new events to ${io.sockets.sockets.size} connected clients`);
        
        allNewEvents.forEach(event => {
          try {
            broadcastEvent(event);
            if (event.dest_port) {
              broadcastHoneypotEvent(event.dest_port, event);
            }
          } catch (error) {
            console.error('Error broadcasting individual event:', error.message);
          }
        });
        
        // Update last event times
        if (newDeceptionEvents.length > 0) {
          lastDeceptionEventTime = new Date(newDeceptionEvents[newDeceptionEvents.length - 1].timestamp);
        }
        if (newScanAlerts.length > 0) {
          lastScanAlertTime = new Date(newScanAlerts[newScanAlerts.length - 1].timestamp);
        }
      }
    } catch (error) {
      console.error('📊 Polling fallback error:', error.message);
    }
  }, 10000); // Poll every 10 seconds instead of 3
  
  console.log('📊 Polling fallback active (10s intervals) for streamlined collections');
}

// Emit custom events from other parts of the application
function emitEvent(eventName, data) {
  try {
    if (io && eventName && data) {
      io.emit(eventName, data);
    }
  } catch (error) {
    console.error('Error emitting custom event:', error.message);
  }
}

function emitToHoneypot(honeypotId, eventName, data) {
  try {
    if (io && honeypotId && eventName && data) {
      io.to(`honeypot-${honeypotId}`).emit(eventName, data);
    }
  } catch (error) {
    console.error('Error emitting to honeypot:', error.message);
  }
}

// Global function to emit dashboard updates
function emitDashboardUpdate(updateType, data) {
  if (io) {
    try {
      // Emit to all dashboard subscribers
      io.to('dashboard-updates').emit('dashboard-update', {
        type: updateType,
        data: data,
        timestamp: new Date().toISOString()
      });
      
      // Also emit to specific data type subscribers
      io.to(`data-${updateType}`).emit('data-update', {
        type: updateType,
        data: data,
        timestamp: new Date().toISOString()
      });
      
      console.log(`📊 Dashboard update emitted: ${updateType}`);
    } catch (error) {
      console.error('Error emitting dashboard update:', error.message);
    }
  }
}

// Make the function available globally
global.emitDashboardUpdate = emitDashboardUpdate;

// Export the function for use in other modules
module.exports = {
  initializeWebSocket,
  emitDashboardUpdate
};

// Cleanup function
function cleanup() {
  changeStreams.forEach(stream => {
    try {
      if (stream.close) {
        stream.close();
      }
    } catch (error) {
      // Silently handle cleanup errors
    }
  });
  changeStreams = [];
  
  if (io) {
    io.close();
    io = null;
  }
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup); 
process.on('SIGTERM', cleanup); 