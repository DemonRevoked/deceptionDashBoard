import React, { useState, useEffect } from 'react';
import { filterEvents } from '../utils/dataProcessor';
import './EnhancedFilters.css';

const EnhancedFilters = ({ 
  events = [], 
  onFilterChange, 
  loading = false,
  className = '' 
}) => {
  const [filters, setFilters] = useState({
    search: '',
    severity: [],
    protocol: [],
    eventType: [],
    collection: [],
    sourceIP: '',
    timeRange: 24 // hours
  });
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [filteredCount, setFilteredCount] = useState(0);

  // Extract unique values for filter options
  const getFilterOptions = () => {
    const severities = new Set();
    const protocols = new Set();
    const eventTypes = new Set();
    const collections = new Set();

    events.forEach(event => {
      if (event.severity) severities.add(event.severity);
      if (event.protocol) protocols.add(event.protocol);
      if (event.event_type) eventTypes.add(event.event_type);
      if (event.collection) collections.add(event.collection);
    });

    return {
      severities: Array.from(severities).sort(),
      protocols: Array.from(protocols).sort(),
      eventTypes: Array.from(eventTypes).sort(),
      collections: Array.from(collections).sort()
    };
  };

  const options = getFilterOptions();

  // Apply filters when they change
  useEffect(() => {
    const filtered = filterEvents(events, filters);
    setFilteredCount(filtered.length);
    onFilterChange(filtered);
  }, [events, filters, onFilterChange]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleMultiSelectChange = (filterType, value) => {
    setFilters(prev => {
      const currentValues = prev[filterType];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      return {
        ...prev,
        [filterType]: newValues
      };
    });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      severity: [],
      protocol: [],
      eventType: [],
      collection: [],
      sourceIP: '',
      timeRange: 24
    });
  };

  const hasActiveFilters = () => {
    return filters.search || 
           filters.severity.length > 0 || 
           filters.protocol.length > 0 || 
           filters.eventType.length > 0 || 
           filters.collection.length > 0 || 
           filters.sourceIP || 
           filters.timeRange !== 24;
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'critical': '#dc3545',
      'high': '#dc3545',
      'medium': '#ffc107',
      'low': '#28a745',
      'info': '#17a2b8'
    };
    return colors[severity?.toLowerCase()] || '#6c757d';
  };

  const formatEventType = (eventType) => {
    const labels = {
      'nmap_recon': 'Nmap Reconnaissance',
      'nmap_aggressive': 'Nmap Aggressive',
      'login_attempt': 'Login Attempts',
      'command_execution': 'Command Execution',
      'file_transfer': 'File Transfer',
      'session': 'Interactive Sessions',
      'Honeypot_Interaction': 'Honeypot Access',
      'Port_Scan': 'Port Scanning'
    };
    return labels[eventType] || eventType;
  };

  const formatCollection = (collection) => {
    const labels = {
      'scan_alerts': 'Scan Detection',
      'deception_detection': 'Deception Engine',
      'legacy_events': 'Legacy System'
    };
    return labels[collection] || collection;
  };

  return (
    <div className={`enhanced-filters ${className} ${isExpanded ? 'expanded' : ''}`}>
      <div className="filters-header">
        <div className="filters-summary">
          <h3>Advanced Filters</h3>
          <div className="filter-stats">
            <span className="total-events">{events.length} total</span>
            <span className="filtered-events">{filteredCount} filtered</span>
            {hasActiveFilters() && (
              <span className="active-filters">{
                [
                  filters.severity.length,
                  filters.protocol.length,
                  filters.eventType.length,
                  filters.collection.length,
                  filters.search ? 1 : 0,
                  filters.sourceIP ? 1 : 0,
                  filters.timeRange !== 24 ? 1 : 0
                ].filter(count => count > 0).length
              } active</span>
            )}
          </div>
        </div>
        
        <div className="filters-controls">
          {hasActiveFilters() && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              Clear All
            </button>
          )}
          <button 
            className={`toggle-filters-btn ${isExpanded ? 'expanded' : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
            disabled={loading}
          >
            {isExpanded ? '▲' : '▼'} Filters
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="filters-content">
          <div className="filters-grid">
            {/* Search */}
            <div className="filter-group">
              <label>Search</label>
              <input
                type="text"
                placeholder="Search events, IPs, descriptions..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="search-input"
              />
            </div>

            {/* Source IP */}
            <div className="filter-group">
              <label>Source IP</label>
              <input
                type="text"
                placeholder="Filter by IP address..."
                value={filters.sourceIP}
                onChange={(e) => handleFilterChange('sourceIP', e.target.value)}
                className="search-input"
              />
            </div>

            {/* Time Range */}
            <div className="filter-group">
              <label>Time Range</label>
              <select
                value={filters.timeRange}
                onChange={(e) => handleFilterChange('timeRange', parseInt(e.target.value))}
                className="select-input"
              >
                <option value={1}>Last Hour</option>
                <option value={6}>Last 6 Hours</option>
                <option value={24}>Last 24 Hours</option>
                <option value={72}>Last 3 Days</option>
                <option value={168}>Last Week</option>
              </select>
            </div>

            {/* Severity */}
            <div className="filter-group">
              <label>Severity ({filters.severity.length} selected)</label>
              <div className="checkbox-group">
                {options.severities.map(severity => (
                  <label key={severity} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.severity.includes(severity)}
                      onChange={() => handleMultiSelectChange('severity', severity)}
                    />
                    <span 
                      className="severity-badge"
                      style={{ backgroundColor: getSeverityColor(severity) }}
                    >
                      {severity}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Protocol */}
            <div className="filter-group">
              <label>Protocol ({filters.protocol.length} selected)</label>
              <div className="checkbox-group">
                {options.protocols.map(protocol => (
                  <label key={protocol} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.protocol.includes(protocol)}
                      onChange={() => handleMultiSelectChange('protocol', protocol)}
                    />
                    <span className="protocol-badge">
                      {protocol?.toUpperCase()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Event Type */}
            <div className="filter-group">
              <label>Event Type ({filters.eventType.length} selected)</label>
              <div className="checkbox-group">
                {options.eventTypes.map(eventType => (
                  <label key={eventType} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.eventType.includes(eventType)}
                      onChange={() => handleMultiSelectChange('eventType', eventType)}
                    />
                    <span className="event-type-badge">
                      {formatEventType(eventType)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Collection */}
            <div className="filter-group">
              <label>Data Source ({filters.collection.length} selected)</label>
              <div className="checkbox-group">
                {options.collections.map(collection => (
                  <label key={collection} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.collection.includes(collection)}
                      onChange={() => handleMultiSelectChange('collection', collection)}
                    />
                    <span className="collection-badge">
                      {formatCollection(collection)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="quick-filters">
            <h4>Quick Filters</h4>
            <div className="quick-filter-buttons">
              <button 
                className="quick-filter-btn"
                onClick={() => handleMultiSelectChange('severity', 'high')}
              >
                High Threats
              </button>
              <button 
                className="quick-filter-btn"
                onClick={() => handleMultiSelectChange('eventType', 'nmap_recon')}
              >
                Nmap Scans
              </button>
              <button 
                className="quick-filter-btn"
                onClick={() => handleMultiSelectChange('eventType', 'login_attempt')}
              >
                Login Attempts
              </button>
              <button 
                className="quick-filter-btn"
                onClick={() => handleMultiSelectChange('protocol', 'ssh')}
              >
                SSH Activity
              </button>
              <button 
                className="quick-filter-btn"
                onClick={() => handleFilterChange('timeRange', 1)}
              >
                Last Hour
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedFilters;
