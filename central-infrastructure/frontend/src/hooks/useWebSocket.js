import { useEffect, useState, useCallback, useRef } from 'react';
import io from 'socket.io-client';

const useWebSocket = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [healthStatus, setHealthStatus] = useState(null);
  const [isHealthSubscribed, setIsHealthSubscribed] = useState(false);
  const [dashboardStatus, setDashboardStatus] = useState(null);
  const [isDashboardSubscribed, setIsDashboardSubscribed] = useState(false);
  
  // Use refs to avoid dependency issues
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const socketRef = useRef(null);
  const isHealthSubscribedRef = useRef(false);
  const isDashboardSubscribedRef = useRef(false);
  const lastErrorTime = useRef(0);
  const maxReconnectAttempts = 5;

  // Smart error logging - avoid console spam
  const logError = useCallback((message, error) => {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    // Only log errors every 5 minutes to avoid spam
    if (now - lastErrorTime.current > fiveMinutes) {
      console.error(message, error?.message || error);
      lastErrorTime.current = now;
    }
  }, []);

  // Initialize WebSocket connection - removed problematic dependencies
  useEffect(() => {
    // Smart WebSocket URL detection for distributed architecture
    const getWsUrl = () => {
      // If we're in a browser environment, dynamically determine from current page location
      if (typeof window !== 'undefined') {
        // Use environment variable if set, otherwise dynamically determine from current location
        if (process.env.REACT_APP_WS_URL) {
          return process.env.REACT_APP_WS_URL;
        }
        
        // Get current host and construct backend URL
        const { protocol, hostname } = window.location;
        
        // Special handling for distributed architecture
            // If accessing from client VM (10.0.44.3), use central backend IP (10.0.44.32)
    let targetHost = hostname;
    if (hostname === '10.0.44.3') {
      targetHost = '10.0.44.32';
      console.log('🔧 WebSocket: Client VM detected, routing to central backend:', targetHost);
    }
        
        return `${protocol}//${targetHost}`;
      }
      // If we're in a Node.js environment (SSR), use the container URL
      return process.env.REACT_APP_WS_URL || 'http://backend';
    };
    
    const WS_URL = getWsUrl();
    
    // Clean up any existing connection
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const newSocket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true,
      autoConnect: true
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      // Removed console.log to reduce spam
      setIsConnected(true);
      setSocket(newSocket);
      reconnectAttemptsRef.current = 0;
      
      // Resubscribe to health updates if we were subscribed before
      if (isHealthSubscribedRef.current) {
        newSocket.emit('subscribe-health');
      }
      
      // Resubscribe to dashboard updates if we were subscribed before
      if (isDashboardSubscribedRef.current) {
        newSocket.emit('subscribe-dashboard');
      }
    });

    newSocket.on('disconnect', (reason) => {
      // Only log disconnections, not normal operations
      if (reason !== 'io client disconnect') {
        console.log('❌ WebSocket disconnected:', reason);
      }
      setIsConnected(false);
      setHealthStatus(null);
      
      // Auto-reconnect with exponential backoff (but limit attempts)
      if (reason !== 'io client disconnect' && reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          // Only log actual reconnection attempts, not every disconnect
          if (reconnectAttemptsRef.current <= 2) {
            console.log(`🔄 Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          }
          newSocket.connect();
        }, delay);
      } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        logError('🚨 WebSocket max reconnection attempts reached. Please refresh the page.');
      }
    });

    newSocket.on('connect_error', (error) => {
      logError('🔌 WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Handle health status updates
    newSocket.on('health-status', (data) => {
      setHealthStatus(data);
    });

    // Handle dashboard status updates
    newSocket.on('dashboard-status', (data) => {
      setDashboardStatus(data);
    });

    // Handle dashboard data updates
    newSocket.on('dashboard-update', (data) => {
      console.log('📊 Dashboard update received:', data);
      // This will be handled by the dashboard component
    });

    // Handle specific data type updates
    newSocket.on('data-update', (data) => {
      console.log('📊 Data update received:', data);
      // This will be handled by the dashboard component
    });

    // Multi-collection event handlers
    newSocket.on('new-event', (event) => {
      // Emit normalized event for components to handle
      newSocket.emit('normalized-event', {
        ...event,
        collection: 'events',
        timestamp: event.timestamp || new Date().toISOString()
      });
    });

    // Handle new scan alerts
    newSocket.on('new-scan-alert', (alert) => {
      console.log('New scan alert received:', alert);
      const normalizedEvent = {
        ...alert,
        collection: 'scan_alerts',
        timestamp: new Date().toISOString()
      };
      // Assuming onEvent is defined elsewhere or will be added
      // newSocket.emit('normalized-event', normalizedEvent); 
    });

    // Handle new deception detection
    newSocket.on('new-deception-activity', (activity) => {
      console.log('New deception activity received:', activity);
      const normalizedEvent = {
        ...activity,
        collection: 'deception_detection',
        timestamp: new Date().toISOString()
      };
      // Assuming onEvent is defined elsewhere or will be added
      // newSocket.emit('normalized-event', normalizedEvent); 
    });

    // Legacy event handlers for backward compatibility
    newSocket.on('new-zeek-alert', (alert) => {
      console.log('Legacy Zeek alert received:', alert);
      const normalizedEvent = {
        ...alert,
        collection: 'scan_alerts',
        timestamp: new Date().toISOString()
      };
      // Assuming onEvent is defined elsewhere or will be added
      // newSocket.emit('normalized-event', normalizedEvent); 
    });

    newSocket.on('new-honeypot-event', (event) => {
      // Emit normalized event for components to handle
      newSocket.emit('normalized-event', {
        ...event,
        collection: 'honeypot_events',
        timestamp: event.timestamp || new Date().toISOString()
      });
    });

    newSocket.on('new-nmap-detection', (event) => {
      // Special handling for Nmap detections
      newSocket.emit('normalized-event', {
        ...event,
        collection: 'events',
        event_type: event.event_type || 'nmap_detection',
        timestamp: event.timestamp || new Date().toISOString(),
        isNmapDetection: true
      });
    });

    // Generic error handler
    newSocket.on('error', (error) => {
      logError('🔌 WebSocket error:', error);
    });

    setSocket(newSocket);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Removed problematic dependencies

  // Subscribe to events
  const subscribe = useCallback((eventName, handler) => {
    if (!socket) return () => {};

    socket.on(eventName, handler);

    // Return unsubscribe function
    return () => {
      if (socket) {
        socket.off(eventName, handler);
      }
    };
  }, [socket]);

  // Unsubscribe from events
  const unsubscribe = useCallback((eventName, handler) => {
    if (!socket) return;
    socket.off(eventName, handler);
  }, [socket]);

  // Subscribe to health updates
  const subscribeToHealth = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('subscribe-health');
      setIsHealthSubscribed(true);
      isHealthSubscribedRef.current = true;
    }
  }, [socket, isConnected]);

  // Unsubscribe from health updates
  const unsubscribeFromHealth = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('unsubscribe-health');
      setIsHealthSubscribed(false);
      isHealthSubscribedRef.current = false;
    }
  }, [socket, isConnected]);

  // Subscribe to dashboard updates
  const subscribeToDashboard = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('subscribe-dashboard');
      setIsDashboardSubscribed(true);
      isDashboardSubscribedRef.current = true;
    }
  }, [socket, isConnected]);

  // Unsubscribe from dashboard updates
  const unsubscribeFromDashboard = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('unsubscribe-dashboard');
      setIsDashboardSubscribed(false);
      isDashboardSubscribedRef.current = false;
    }
  }, [socket, isConnected]);

  // Subscribe to specific data type updates
  const subscribeToDataType = useCallback((dataType) => {
    if (socket && isConnected && dataType) {
      socket.emit('subscribe-data-type', dataType);
    }
  }, [socket, isConnected]);

  // Unsubscribe from specific data type updates
  const unsubscribeFromDataType = useCallback((dataType) => {
    if (socket && isConnected && dataType) {
      socket.emit('unsubscribe-data-type', dataType);
    }
  }, [socket, isConnected]);

  // Join honeypot room
  const joinHoneypotRoom = useCallback((honeypotId) => {
    if (!socket || !honeypotId) return;
    socket.emit('join-honeypot', honeypotId);
  }, [socket]);

  // Leave honeypot room
  const leaveHoneypotRoom = useCallback((honeypotId) => {
    if (!socket || !honeypotId) return;
    socket.emit('leave-honeypot', honeypotId);
  }, [socket]);

  // Subscribe to enhanced events (multi-collection)
  const subscribeToEvents = useCallback(() => {
    if (!socket) return;
    socket.emit('subscribe-events');
  }, [socket]);

  // Unsubscribe from enhanced events
  const unsubscribeFromEvents = useCallback(() => {
    if (!socket) return;
    socket.emit('unsubscribe-events');
  }, [socket]);

  // Subscribe to Nmap detections specifically
  const subscribeToNmapDetections = useCallback(() => {
    if (!socket) return;
    socket.emit('subscribe-nmap-detections');
  }, [socket]);

  // Unsubscribe from Nmap detections
  const unsubscribeFromNmapDetections = useCallback(() => {
    if (!socket) return;
    socket.emit('unsubscribe-nmap-detections');
  }, [socket]);

  // Subscribe to threat feed updates
  const subscribeToThreatFeed = useCallback(() => {
    if (!socket) return;
    socket.emit('subscribe-threat-feed');
  }, [socket]);

  // Unsubscribe from threat feed updates
  const unsubscribeFromThreatFeed = useCallback(() => {
    if (!socket) return;
    socket.emit('unsubscribe-threat-feed');
  }, [socket]);

  // Force reconnect function
  const forceReconnect = useCallback(() => {
    if (socketRef.current) {
      reconnectAttemptsRef.current = 0;
      socketRef.current.disconnect();
      socketRef.current.connect();
    }
  }, []);

  return {
    socket,
    isConnected,
    subscribe,
    unsubscribe,
    subscribeToHealth,
    unsubscribeFromHealth,
    healthStatus,
    isHealthSubscribed,
    subscribeToDashboard,
    unsubscribeFromDashboard,
    dashboardStatus,
    isDashboardSubscribed,
    joinHoneypotRoom,
    leaveHoneypotRoom,
    subscribeToEvents,
    unsubscribeFromEvents,
    subscribeToNmapDetections,
    unsubscribeFromNmapDetections,
    subscribeToThreatFeed,
    unsubscribeFromThreatFeed,
    forceReconnect
  };
};

export default useWebSocket; 