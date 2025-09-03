import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { checkQuickHealth } from '../api';
import useWebSocket from './useWebSocket';

const useHealthMonitoring = (options = {}) => {
  const { 
    enableNotifications = true,
    autoStart = true
  } = options;

  const [health, setHealth] = useState({
    backend: 'unknown',
    database: 'unknown',
    websocket: 'unknown',
    honeypotManager: 'unknown'
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  const [error, setError] = useState(null);
  const [uptime, setUptime] = useState(null);
  const [metrics, setMetrics] = useState({
    totalEvents: 0,
    activeConnections: 0,
    errorRate: 0,
    honeypots: []
  });
  const [serviceDetails, setServiceDetails] = useState({});
  
  // Use WebSocket for real-time health updates
  const { 
    isConnected, 
    healthStatus, 
    subscribeToHealth, 
    unsubscribeFromHealth 
  } = useWebSocket();
  
  // Use refs to track previous state and avoid unnecessary updates
  const previousHealthRef = useRef({});
  const fallbackIntervalRef = useRef(null);
  const lastLogTime = useRef(0);
  const hasReceivedWebSocketUpdate = useRef(false);
  const lastErrorTime = useRef({}); // New ref for error logging circuit breaker

  // Compute overall system health
  const systemHealth = useMemo(() => {
    const statuses = Object.values(health);
    if (statuses.includes('error') || statuses.includes('stopped')) {
      return 'error';
    }
    if (statuses.includes('unhealthy') || statuses.includes('degraded') || statuses.includes('disconnected')) {
      return 'unhealthy';
    }
    if (statuses.every(status => status === 'healthy' || status === 'running' || status === 'connected' || status === 'active')) {
      return 'healthy';
    }
    return 'unknown';
  }, [health]);

  // Smart logging - only log significant changes
  const shouldLog = useCallback((message, isHealthy = true) => {
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000; // Increased from 5 to 10 minutes
    
    if (!isHealthy) {
      return true; // Always log problems
    }
    
    if (now - lastLogTime.current > tenMinutes) {
      lastLogTime.current = now;
      return true;
    }
    
    return false;
  }, []);

  // Get health summary
  const getHealthSummary = useCallback(() => {
    const services = Object.values(health);
    const healthyServices = services.filter(status => 
      status === 'healthy' || status === 'running' || status === 'connected' || status === 'active'
    ).length;
    
    return {
      services: services.length,
      healthy: healthyServices,
      unhealthy: services.length - healthyServices,
      uptime: uptime || 0
    };
  }, [health, uptime]);

  // Get service status with details
  const getServiceStatus = useCallback((serviceName) => {
    const status = health[serviceName] || 'unknown';
    const details = serviceDetails[serviceName] || {};
    
    return {
      status,
      lastChecked: details.lastChecked || (lastCheck ? lastCheck.toLocaleTimeString() : 'Never'),
      responseTime: details.responseTime,
      error: details.error,
      details
    };
  }, [health, serviceDetails, lastCheck]);

  // Format uptime in readable format
  const formatUptime = useCallback((uptimeMs) => {
    if (!uptimeMs || uptimeMs < 0) return 'Unknown';
    
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  // Process health status (from WebSocket or API)
  const processHealthStatus = useCallback((healthData) => {
    if (!healthData) return;

    const newHealth = {
      backend: healthData.services?.backend?.status || 'unknown',
      database: healthData.services?.database?.status || 'unknown',
      websocket: healthData.services?.websocket?.status || 'unknown',
      honeypotManager: healthData.services?.honeypotManager?.status || 'unknown'
    };

    // Only update if something actually changed
    const hasChanges = Object.keys(newHealth).some(
      service => previousHealthRef.current[service] !== newHealth[service]
    );

    if (hasChanges || !previousHealthRef.current.backend) {
      previousHealthRef.current = { ...newHealth };
      setHealth(newHealth);
      setLastCheck(new Date());
      setError(null);

      // Smart logging - only log real changes
      const unhealthyServices = Object.entries(newHealth)
        .filter(([_, status]) => status === 'unhealthy' || status === 'error' || status === 'stopped')
        .map(([service, _]) => service);

      if (unhealthyServices.length > 0) {
        if (shouldLog('Service issues', false)) {
          console.warn('🚨 Service issues:', unhealthyServices);
        }
      } else {
        // Removed frequent "System healthy" console.log to reduce spam
        // Only log when there are actual changes, not every health update
        if (hasChanges && shouldLog('System healthy', true)) {
          console.log('✅ System status updated');
        }
      }

      // Store response data efficiently
      if (healthData.uptime) {
        setUptime(healthData.uptime * 1000);
      }

      setMetrics({
        totalEvents: healthData.metrics?.totalEvents || 0,
        activeConnections: healthData.services?.websocket?.connections || 0,
        errorRate: healthData.metrics?.errorRate || 0,
        honeypots: healthData.honeypots || []
      });

      setServiceDetails({
        backend: healthData.services?.backend || {},
        database: healthData.services?.database || {},
        websocket: healthData.services?.websocket || {},
        honeypotManager: healthData.services?.honeypotManager || {}
      });
    }
  }, [shouldLog]);

  // WebSocket health status updates
  useEffect(() => {
    if (healthStatus) {
      hasReceivedWebSocketUpdate.current = true;
      processHealthStatus(healthStatus);
    }
  }, [healthStatus, processHealthStatus]);

  // Fallback API health check (only when needed)
  const performFallbackHealthCheck = useCallback(async () => {
    try {
      const response = await checkQuickHealth();
      processHealthStatus(response);
      return response;
    } catch (err) {
      // Only log errors if we haven't seen this error recently
      const now = Date.now();
      const errorKey = err.message || 'Unknown error';
      
      if (!lastErrorTime.current[errorKey] || 
          (now - lastErrorTime.current[errorKey]) > 60000) { // Only log same error once per minute
        console.error('❌ Fallback health check failed:', err.message);
        lastErrorTime.current[errorKey] = now;
      }
      
      setError(err.message || 'Health check failed');
      
      if (!error) {
        setHealth(prev => ({
          ...prev,
          backend: 'error'
        }));
      }
      
      return null;
    }
  }, [error, processHealthStatus]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    
    // Subscribe to WebSocket health updates
    if (isConnected) {
      subscribeToHealth();
    }
    
    // Initial health check
    performFallbackHealthCheck();
    
    // Setup fallback polling (much less frequent)
    const scheduleNextFallbackCheck = () => {
      if (fallbackIntervalRef.current) {
        clearTimeout(fallbackIntervalRef.current);
      }
      
      // Only use fallback if no WebSocket updates received recently
      const interval = hasReceivedWebSocketUpdate.current 
        ? 15 * 60 * 1000  // 15 minutes when WebSocket working
        : 5 * 60 * 1000;  // 5 minutes when WebSocket not working
      
      fallbackIntervalRef.current = setTimeout(() => {
        // Reset WebSocket flag and check if we need fallback
        hasReceivedWebSocketUpdate.current = false;
        
        performFallbackHealthCheck().then(() => {
          if (isMonitoring) {
            scheduleNextFallbackCheck();
          }
        });
      }, interval);
    };
    
    scheduleNextFallbackCheck();
  }, [isMonitoring, isConnected, subscribeToHealth, performFallbackHealthCheck]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (fallbackIntervalRef.current) {
      clearTimeout(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
    
    unsubscribeFromHealth();
    setIsMonitoring(false);
  }, [unsubscribeFromHealth]);

  // Auto-start monitoring
  useEffect(() => {
    if (autoStart) {
      startMonitoring();
    }
    
    return () => {
      stopMonitoring();
    };
  }, [autoStart, startMonitoring, stopMonitoring]);

  // Subscribe to WebSocket when connected
  useEffect(() => {
    if (isConnected && isMonitoring) {
      subscribeToHealth();
    }
  }, [isConnected, isMonitoring]); // Removed subscribeToHealth dependency that was causing infinite loop

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fallbackIntervalRef.current) {
        clearTimeout(fallbackIntervalRef.current);
      }
    };
  }, []);

  return {
    health,
    systemHealth,
    isMonitoring,
    lastCheck,
    error,
    uptime,
    metrics,
    serviceDetails,
    isConnected: isConnected,
    getHealthSummary,
    getServiceStatus,
    formatUptime,
    startMonitoring,
    stopMonitoring,
    performHealthCheck: performFallbackHealthCheck // Keep for manual refresh
  };
};

export default useHealthMonitoring; 