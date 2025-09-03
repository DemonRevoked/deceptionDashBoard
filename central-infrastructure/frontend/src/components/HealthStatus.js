import React from 'react';
import { useHealthMonitoringContext } from '../contexts/HealthMonitoringContext';
import styles from './HealthStatus.module.css';

const HealthStatus = ({ 
  compact = false, 
  showDetails = false, 
  className = '' 
}) => {
  const {
    health,
    systemHealth,
    isMonitoring,
    lastCheck,
    error,
    metrics,
    serviceDetails,
    getServiceStatus,
    getHealthSummary,
    formatUptime,
    performHealthCheck,
    startMonitoring,
    stopMonitoring
  } = useHealthMonitoringContext();

  const summary = getHealthSummary();

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'running':
      case 'connected':
      case 'active':
        return '🟢';
      case 'unhealthy':
      case 'degraded':
      case 'disconnected':
        return '🟡';
      case 'error':
      case 'stopped':
        return '🔴';
      default:
        return '⚫';
    }
  };

  // Get status color class
  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'running':
      case 'connected':
      case 'active':
        return 'healthy';
      case 'unhealthy':
      case 'degraded':
      case 'disconnected':
        return 'warning';
      case 'error':
      case 'stopped':
        return 'error';
      default:
        return 'unknown';
    }
  };

  // Get status display text
  const getStatusText = (status) => {
    switch (status) {
      case 'healthy':
        return 'HEALTHY';
      case 'running':
        return 'RUNNING';
      case 'connected':
        return 'CONNECTED';
      case 'active':
        return 'ACTIVE';
      case 'unhealthy':
        return 'UNHEALTHY';
      case 'degraded':
        return 'DEGRADED';
      case 'disconnected':
        return 'DISCONNECTED';
      case 'error':
        return 'ERROR';
      case 'stopped':
        return 'STOPPED';
      default:
        return 'UNKNOWN';
    }
  };

  // Compact view for header/navigation
  if (compact) {
    return (
      <div className={`${styles.healthCompact} ${className}`}>
        <div className={`${styles.statusDot} ${styles[getStatusColor(systemHealth)]}`}></div>
        <span className={styles.statusText}>
          {systemHealth === 'healthy' ? 'All Systems Operational' : 
           systemHealth === 'unhealthy' ? 'System Issues' : 
           'Service Errors'}
        </span>
      </div>
    );
  }

  // Full health dashboard
  return (
    <div className={`${styles.healthStatus} ${className}`}>
      <div className={styles.header}>
        <h3>System Health</h3>
        <div className={styles.controls}>
          <div className={styles.monitoring}>
            <span className={`${styles.monitoringDot} ${isMonitoring ? styles.active : ''}`}></span>
            <span>{isMonitoring ? 'Monitoring' : 'Stopped'}</span>
          </div>
          <div className={styles.actions}>
            <button 
              className={styles.refreshButton}
              onClick={performHealthCheck}
              disabled={!isMonitoring}
              title="Refresh health status"
            >
              🔄
            </button>
            {isMonitoring ? (
              <button 
                className={styles.stopButton}
                onClick={stopMonitoring}
                title="Stop monitoring"
              >
                ⏹️
              </button>
            ) : (
              <button 
                className={styles.startButton}
                onClick={startMonitoring}
                title="Start monitoring"
              >
                ▶️
              </button>
            )}
          </div>
        </div>
      </div>

      {/* System Overview */}
      <div className={styles.overview}>
        <div className={`${styles.overviewCard} ${styles[getStatusColor(systemHealth)]}`}>
          <div className={styles.overviewIcon}>
            {getStatusIcon(systemHealth)}
          </div>
          <div className={styles.overviewContent}>
            <div className={styles.overviewTitle}>Overall Status</div>
            <div className={styles.overviewValue}>
              {systemHealth === 'healthy' ? 'Healthy' : 
               systemHealth === 'unhealthy' ? 'Degraded' : 
               'Critical'}
            </div>
          </div>
        </div>

        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>🔧</div>
          <div className={styles.overviewContent}>
            <div className={styles.overviewTitle}>Services</div>
            <div className={styles.overviewValue}>
              {summary.healthy}/{summary.services} Healthy
            </div>
          </div>
        </div>

        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>⏱️</div>
          <div className={styles.overviewContent}>
            <div className={styles.overviewTitle}>Uptime</div>
            <div className={styles.overviewValue}>
              {formatUptime(summary.uptime)}
            </div>
          </div>
        </div>

        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>🎯</div>
          <div className={styles.overviewContent}>
            <div className={styles.overviewTitle}>Honeypots</div>
            <div className={styles.overviewValue}>
              {metrics.honeypots.length} Active
            </div>
          </div>
        </div>

        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>📊</div>
          <div className={styles.overviewContent}>
            <div className={styles.overviewTitle}>Events (24h)</div>
            <div className={styles.overviewValue}>
              {metrics.totalEvents}
            </div>
          </div>
        </div>
      </div>

      {/* Service Details */}
      {showDetails && (
        <div className={styles.services}>
          <h4>Service Status</h4>
          <div className={styles.servicesList}>
            {Object.entries(health).map(([serviceName, status]) => {
              const serviceStatus = getServiceStatus(serviceName);
              const details = serviceDetails[serviceName] || {};
              const serviceTitleMap = {
                backend: 'API Server',
                database: 'MongoDB',
                websocket: 'WebSocket',
                honeypotManager: 'Honeypot Manager'
              };

              return (
                <div key={serviceName} className={styles.serviceItem}>
                  <div className={styles.serviceHeader}>
                    <span className={styles.serviceIcon}>
                      {getStatusIcon(status)}
                    </span>
                    <span className={styles.serviceName}>
                      {serviceTitleMap[serviceName] || serviceName}
                    </span>
                    <span className={`${styles.serviceStatus} ${styles[getStatusColor(status)]}`}>
                      {getStatusText(status)}
                    </span>
                  </div>
                  <div className={styles.serviceDetails}>
                    <span className={styles.serviceDetail}>
                      Last checked: {details.lastChecked || serviceStatus.lastChecked}
                    </span>
                    {details.responseTime && (
                      <span className={styles.serviceDetail}>
                        Response time: {details.responseTime}ms
                      </span>
                    )}
                    {details.error && (
                      <span className={styles.serviceError}>
                        Error: {details.error}
                      </span>
                    )}
                    {serviceName === 'database' && details.collections && (
                      <span className={styles.serviceDetail}>
                        Collections: {details.collections.honeypots} honeypots, {details.collections.events} events
                      </span>
                    )}
                    {serviceName === 'websocket' && details.connections !== undefined && (
                      <span className={styles.serviceDetail}>
                        Active connections: {details.connections}
                      </span>
                    )}
                    {serviceName === 'honeypotManager' && details.managedServices && (
                      <span className={styles.serviceDetail}>
                        Managed services: {details.managedServices.length}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className={styles.error}>
          <span className={styles.errorIcon}>⚠️</span>
          <span className={styles.errorMessage}>{error}</span>
        </div>
      )}

      {/* Last Check */}
      <div className={styles.lastCheck}>
        <span className={styles.lastCheckLabel}>Last health check:</span>
        <span className={styles.lastCheckTime}>
          {lastCheck ? lastCheck.toLocaleString() : 'Never'}
        </span>
      </div>
    </div>
  );
};

export default HealthStatus; 