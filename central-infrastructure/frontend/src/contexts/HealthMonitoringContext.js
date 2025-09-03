import React, { createContext, useContext } from 'react';
import useHealthMonitoring from '../hooks/useHealthMonitoring';

const HealthMonitoringContext = createContext(null);

export const HealthMonitoringProvider = ({ children }) => {
  const healthMonitoring = useHealthMonitoring({
    enableNotifications: true,
    autoStart: false  // Disable auto-start to prevent resource exhaustion
  });

  return (
    <HealthMonitoringContext.Provider value={healthMonitoring}>
      {children}
    </HealthMonitoringContext.Provider>
  );
};

export const useHealthMonitoringContext = () => {
  const context = useContext(HealthMonitoringContext);
  if (!context) {
    throw new Error('useHealthMonitoringContext must be used within a HealthMonitoringProvider');
  }
  return context;
};

export default HealthMonitoringContext; 