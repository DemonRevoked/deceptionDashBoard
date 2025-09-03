import { useEffect, useState, useCallback, useRef } from 'react';
import useWebSocket from './useWebSocket';
import toast from 'react-hot-toast';

const useRealTimeEvents = (options = {}) => {
  const { 
    maxEvents = 100, 
    enableNotifications = true, 
    honeypotId = null,
    enableSecurityAlerts = true,
    category = null
  } = options;

  const { socket, isConnected, subscribe, unsubscribe, joinHoneypotRoom, leaveHoneypotRoom } = useWebSocket();
  const [events, setEvents] = useState([]);
  const [honeypotStatuses, setHoneypotStatuses] = useState({});
  const [securityAlerts, setSecurityAlerts] = useState([]);
  
  // Use refs to store cleanup functions
  const unsubscribeFunctionsRef = useRef([]);
  const previousHoneypotIdRef = useRef(null);

  // Handle new events with error boundary
  const handleNewEvent = useCallback((event) => {
    try {
      if (!event || typeof event !== 'object') {
        console.warn('Invalid event received:', event);
        return;
      }
      
      setEvents(prevEvents => {
        const newEvents = [event, ...prevEvents];
        return newEvents.slice(0, maxEvents);
      });

      // Show notification for important events
      if (enableNotifications && event.severity && ['high', 'critical'].includes(event.severity)) {
        toast.error(`🚨 ${event.event_type} from ${event.source_ip}`, {
          duration: 5000,
          position: 'top-right',
          style: {
            background: '#ef4444',
            color: '#ffffff',
          }
        });
      }
    } catch (error) {
      console.error('Error handling new event:', error);
    }
  }, [maxEvents, enableNotifications]);

  // Handle honeypot-specific events with validation
  const handleHoneypotEvent = useCallback((event) => {
    try {
      if (!event || typeof event !== 'object') {
        console.warn('Invalid honeypot event received:', event);
        return;
      }
      
      // Only add to events if it's for the current honeypot or no specific honeypot
      if (!honeypotId || event.honeypot_id === honeypotId) {
        handleNewEvent(event);
      }
    } catch (error) {
      console.error('Error handling honeypot event:', error);
    }
  }, [honeypotId, handleNewEvent]);

  // Handle security alerts with validation
  const handleSecurityAlert = useCallback((alert) => {
    try {
      if (!alert || typeof alert !== 'object') {
        console.warn('Invalid security alert received:', alert);
        return;
      }
      
      setSecurityAlerts(prevAlerts => {
        const newAlerts = [alert, ...prevAlerts];
        return newAlerts.slice(0, 50); // Keep last 50 alerts
      });

      if (enableSecurityAlerts && alert.message) {
        toast.error(alert.message, {
          duration: 8000,
          position: 'top-center',
          style: {
            background: '#dc2626',
            color: '#ffffff',
            fontWeight: 'bold'
          }
        });
      }
    } catch (error) {
      console.error('Error handling security alert:', error);
    }
  }, [enableSecurityAlerts]);

  // Handle honeypot status updates with validation
  const handleHoneypotStatusUpdate = useCallback((statusUpdate) => {
    try {
      if (!statusUpdate || typeof statusUpdate !== 'object' || !statusUpdate.honeypot_id) {
        console.warn('Invalid honeypot status update:', statusUpdate);
        return;
      }
      
      setHoneypotStatuses(prevStatuses => ({
        ...prevStatuses,
        [statusUpdate.honeypot_id]: statusUpdate
      }));

      // Show notification for status changes
      if (enableNotifications && statusUpdate.name && statusUpdate.status) {
        const statusEmoji = statusUpdate.status === 'running' ? '🟢' : '🔴';
        toast.success(`${statusEmoji} ${statusUpdate.name} is now ${statusUpdate.status}`, {
          duration: 3000,
          position: 'bottom-right'
        });
      }
    } catch (error) {
      console.error('Error handling honeypot status update:', error);
    }
  }, [enableNotifications]);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clean up all subscriptions
    unsubscribeFunctionsRef.current.forEach(unsubscribeFn => {
      try {
        if (typeof unsubscribeFn === 'function') {
          unsubscribeFn();
        }
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });
    unsubscribeFunctionsRef.current = [];

    // Leave previous honeypot room if needed
    if (previousHoneypotIdRef.current) {
      try {
        leaveHoneypotRoom(previousHoneypotIdRef.current);
      } catch (error) {
        console.error('Error leaving honeypot room:', error);
      }
      previousHoneypotIdRef.current = null;
    }
  }, [leaveHoneypotRoom]);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (socket && isConnected) {
      // Clean up previous subscriptions
      cleanup();
      
      // Subscribe to events with error handling
      try {
        const unsubscribeFunctions = [
          subscribe('new-event', handleNewEvent),
          subscribe('honeypot-event', handleHoneypotEvent), 
          subscribe('security-alert', handleSecurityAlert),
          subscribe('honeypot-status-update', handleHoneypotStatusUpdate)
        ].filter(fn => typeof fn === 'function');

        unsubscribeFunctionsRef.current = unsubscribeFunctions;

        // Join honeypot room if specified
        if (honeypotId && honeypotId !== previousHoneypotIdRef.current) {
          // Leave previous room if different
          if (previousHoneypotIdRef.current) {
            leaveHoneypotRoom(previousHoneypotIdRef.current);
          }
          
          joinHoneypotRoom(honeypotId);
          previousHoneypotIdRef.current = honeypotId;
        }
      } catch (error) {
        console.error('Error setting up WebSocket subscriptions:', error);
      }
    }

    // Cleanup on dependency change or unmount
    return cleanup;
  }, [
    socket, 
    isConnected, 
    honeypotId
    // Removed all callback dependencies that were causing infinite loops
  ]);

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
    toast.success('Events cleared', {
      duration: 2000,
      position: 'bottom-center'
    });
  }, []);

  // Clear security alerts
  const clearSecurityAlerts = useCallback(() => {
    setSecurityAlerts([]);
    toast.success('Security alerts cleared', {
      duration: 2000,
      position: 'bottom-center'
    });
  }, []);

  // Get events by severity
  const getEventsBySeverity = useCallback((severity) => {
    return events.filter(event => event && event.severity === severity);
  }, [events]);

  // Get events by honeypot
  const getEventsByHoneypot = useCallback((honeypotId) => {
    return events.filter(event => event && event.honeypot_id === honeypotId);
  }, [events]);

  // Get events by category (if specified)
  const getEventsByCategory = useCallback((cat) => {
    return events.filter(event => event && event.category === cat);
  }, [events]);

  // Filter events by category if specified
  const filteredEvents = category ? getEventsByCategory(category) : events;

  return {
    events: filteredEvents,
    honeypotStatuses,
    securityAlerts,
    isConnected,
    clearEvents,
    clearSecurityAlerts,
    getEventsBySeverity,
    getEventsByHoneypot,
    getEventsByCategory
  };
};

export default useRealTimeEvents; 