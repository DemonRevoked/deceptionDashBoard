import React, { createContext, useContext, useState, useEffect } from 'react';
import './GlobalControls.css';

// Global state context for filters
const GlobalControlsContext = createContext();

export const useGlobalControls = () => {
  const context = useContext(GlobalControlsContext);
  if (!context) {
    throw new Error('useGlobalControls must be used within a GlobalControlsProvider');
  }
  return context;
};

export const GlobalControlsProvider = ({ children }) => {
  const [timeRange, setTimeRange] = useState(24);
  const [selectedClient, setSelectedClient] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const value = {
    timeRange,
    setTimeRange,
    selectedClient,
    setSelectedClient,
    autoRefresh,
    setAutoRefresh,
    lastUpdated,
    setLastUpdated
  };

  return (
    <GlobalControlsContext.Provider value={value}>
      {children}
    </GlobalControlsContext.Provider>
  );
};

const GlobalControls = () => {
  const {
    timeRange,
    setTimeRange,
    selectedClient,
    setSelectedClient,
    autoRefresh,
    setAutoRefresh,
    lastUpdated
  } = useGlobalControls();

  const timeRangeOptions = [
    { value: 1, label: '1 Hour', shortLabel: '1h' },
    { value: 6, label: '6 Hours', shortLabel: '6h' },
    { value: 24, label: '24 Hours', shortLabel: '24h' },
    { value: 168, label: '7 Days', shortLabel: '7d' },
    { value: 720, label: '30 Days', shortLabel: '30d' }
  ];

  const clientOptions = [
    { value: 'all', label: 'All Clients' },
    { value: 'client-a', label: 'Client A' },
    { value: 'client-b', label: 'Client B' },
    { value: 'client-c', label: 'Client C' }
  ];

  const formatLastUpdated = () => {
    const now = new Date();
    const diff = Math.floor((now - lastUpdated) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="global-controls">
      <div className="controls-left">
        <div className="control-group">
          <label className="control-label">Time Range</label>
          <div className="time-range-buttons">
            {timeRangeOptions.map((option) => (
              <button
                key={option.value}
                className={`time-btn ${timeRange === option.value ? 'active' : ''}`}
                onClick={() => setTimeRange(option.value)}
                title={option.label}
              >
                {option.shortLabel}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <label className="control-label">Client</label>
          <select
            className="client-select"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
          >
            {clientOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="controls-right">
        <div className="control-group">
          <button
            className={`refresh-toggle ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
          >
            <span className={`refresh-icon ${autoRefresh ? 'spinning' : ''}`}>🔄</span>
            Auto
          </button>
        </div>

        <div className="last-updated">
          <span className="update-label">Updated</span>
          <span className="update-time">{formatLastUpdated()}</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalControls;
