import React, { useState, useEffect } from 'react';
import { enhancedEventsApi } from '../api/enhancedApi';
import './Threats.css';

const ThreatsIOCs = ({ events = [], timeRange = 24 }) => {
  const [iocs, setIocs] = useState([]);
  const [filteredIOCs, setFilteredIOCs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisTimeRange, setAnalysisTimeRange] = useState(timeRange);
  const [selectedIOCType, setSelectedIOCType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load IOC data
  useEffect(() => {
    loadIOCs();
  }, [analysisTimeRange]);

  // Filter IOCs when search or type changes
  useEffect(() => {
    filterIOCs();
  }, [iocs, selectedIOCType, searchQuery]);

  const loadIOCs = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load threat intelligence summary for IOCs
      const response = await enhancedEventsApi.getThreatIntelligenceSummary({
        time_range: analysisTimeRange,
        limit: 100
      });

      if (response.success) {
        setIocs(response.iocs || []);
      } else {
        // Fallback: extract IOCs from events if API fails
        const extractedIOCs = extractIOCsFromEvents(events);
        setIocs(extractedIOCs);
      }

    } catch (err) {
      console.error('Error loading IOCs:', err);
      setError('Failed to load IOC data');
      
      // Fallback: extract IOCs from events
      const extractedIOCs = extractIOCsFromEvents(events);
      setIocs(extractedIOCs);
    } finally {
      setLoading(false);
    }
  };

  const extractIOCsFromEvents = (events) => {
    const iocSet = new Set();
    const iocList = [];

    events.forEach(event => {
      // Extract IP addresses
      if (event.source_ip && !iocSet.has(`ip:${event.source_ip}`)) {
        iocSet.add(`ip:${event.source_ip}`);
        iocList.push({
          id: `ip-${event.source_ip}`,
          type: 'ip_address',
          value: event.source_ip,
          threat_level: event.severity || 'Medium',
          first_seen: event.timestamp,
          last_seen: event.timestamp,
          event_count: 1,
          source: event.collection || 'unknown',
          description: `Source IP from ${event.note_type || 'security event'}`
        });
      }

      // Extract domains (if available)
      if (event.domain && !iocSet.has(`domain:${event.domain}`)) {
        iocSet.add(`domain:${event.domain}`);
        iocList.push({
          id: `domain-${event.domain}`,
          type: 'domain',
          value: event.domain,
          threat_level: event.severity || 'Medium',
          first_seen: event.timestamp,
          last_seen: event.timestamp,
          event_count: 1,
          source: event.collection || 'unknown',
          description: `Domain from ${event.note_type || 'security event'}`
        });
      }

      // Extract file hashes (if available)
      if (event.file_hash && !iocSet.has(`hash:${event.file_hash}`)) {
        iocSet.add(`hash:${event.file_hash}`);
        iocList.push({
          id: `hash-${event.file_hash}`,
          type: 'file_hash',
          value: event.file_hash,
          threat_level: event.severity || 'Medium',
          first_seen: event.timestamp,
          last_seen: event.timestamp,
          event_count: 1,
          source: event.collection || 'unknown',
          description: `File hash from ${event.note_type || 'security event'}`
        });
      }
    });

    return iocList;
  };

  const filterIOCs = () => {
    let filtered = [...iocs];

    // Filter by type
    if (selectedIOCType !== 'all') {
      filtered = filtered.filter(ioc => ioc.type === selectedIOCType);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ioc => 
        ioc.value.toLowerCase().includes(query) ||
        ioc.description.toLowerCase().includes(query) ||
        ioc.source.toLowerCase().includes(query)
      );
    }

    setFilteredIOCs(filtered);
  };

  const handleTimeRangeChange = (newTimeRange) => {
    setAnalysisTimeRange(newTimeRange);
  };

  const handleIOCTypeChange = (newType) => {
    setSelectedIOCType(newType);
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
  };

  const getThreatLevelColor = (level) => {
    const colors = {
      'Critical': '#dc2626',
      'High': '#ea580c',
      'Medium': '#d97706',
      'Low': '#2563eb',
      'Minimal': '#059669'
    };
    return colors[level] || '#6b7280';
  };

  const getIOCIcon = (type) => {
    const icons = {
      'ip_address': '🌐',
      'domain': '🏷️',
      'file_hash': '🔐',
      'url': '🔗',
      'email': '📧',
      'registry_key': '🔑',
      'process': '⚙️'
    };
    return icons[type] || '🎯';
  };

  const getIOCTypeLabel = (type) => {
    const labels = {
      'ip_address': 'IP Address',
      'domain': 'Domain',
      'file_hash': 'File Hash',
      'url': 'URL',
      'email': 'Email',
      'registry_key': 'Registry Key',
      'process': 'Process'
    };
    return labels[type] || type;
  };

  const exportIOCs = () => {
    if (filteredIOCs.length === 0) return;

    const csvContent = [
      ['Type', 'Value', 'Threat Level', 'First Seen', 'Last Seen', 'Event Count', 'Source', 'Description'],
      ...filteredIOCs.map(ioc => [
        getIOCTypeLabel(ioc.type),
        ioc.value,
        ioc.threat_level,
        new Date(ioc.first_seen).toISOString(),
        new Date(ioc.last_seen).toISOString(),
        ioc.event_count,
        ioc.source,
        ioc.description
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iocs-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="threats-iocs-page">
      <div className="iocs-header">
        <div className="header-content">
          <h2>🔍 Indicators of Compromise (IOCs)</h2>
          <p>Track and analyze threat indicators across all security events</p>
        </div>
        <div className="header-controls">
          <select 
            value={analysisTimeRange} 
            onChange={(e) => handleTimeRangeChange(Number(e.target.value))}
            className="time-range-select"
          >
            <option value={1}>Last Hour</option>
            <option value={6}>Last 6 Hours</option>
            <option value={24}>Last 24 Hours</option>
            <option value={168}>Last Week</option>
          </select>
          <button 
            className="btn btn-secondary" 
            onClick={loadIOCs}
            disabled={loading}
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={exportIOCs}
            disabled={filteredIOCs.length === 0}
          >
            📊 Export ({filteredIOCs.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {/* Filters */}
      <div className="iocs-filters">
        <div className="filter-group">
          <label htmlFor="ioc-type-filter">IOC Type:</label>
          <select
            id="ioc-type-filter"
            value={selectedIOCType}
            onChange={(e) => handleIOCTypeChange(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="ip_address">IP Addresses</option>
            <option value="domain">Domains</option>
            <option value="file_hash">File Hashes</option>
            <option value="url">URLs</option>
            <option value="email">Emails</option>
            <option value="registry_key">Registry Keys</option>
            <option value="process">Processes</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="ioc-search">Search:</label>
          <input
            id="ioc-search"
            type="text"
            placeholder="Search IOCs..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="filter-input"
          />
        </div>
      </div>

      <div className="iocs-content">
        {/* IOC Statistics */}
        <div className="iocs-stats">
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-value">{filteredIOCs.length}</div>
              <div className="stat-label">Total IOCs</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🔴</div>
            <div className="stat-content">
              <div className="stat-value">
                {filteredIOCs.filter(ioc => ioc.threat_level === 'Critical' || ioc.threat_level === 'High').length}
              </div>
              <div className="stat-label">High/Critical</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🌐</div>
            <div className="stat-content">
              <div className="stat-value">
                {filteredIOCs.filter(ioc => ioc.type === 'ip_address').length}
              </div>
              <div className="stat-label">IP Addresses</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🏷️</div>
            <div className="stat-content">
              <div className="stat-value">
                {filteredIOCs.filter(ioc => ioc.type === 'domain').length}
              </div>
              <div className="stat-label">Domains</div>
            </div>
          </div>
        </div>

        {/* IOC List */}
        <div className="iocs-section">
          <div className="section-header">
            <h3>📋 IOC Details</h3>
            <p>Detailed view of all identified indicators</p>
          </div>
          
          {filteredIOCs.length > 0 ? (
            <div className="iocs-grid">
              {filteredIOCs.map((ioc) => (
                <div key={ioc.id} className="ioc-card">
                  <div className="ioc-header">
                    <span className="ioc-icon">
                      {getIOCIcon(ioc.type)}
                    </span>
                    <div className="ioc-info">
                      <h4>{getIOCTypeLabel(ioc.type)}</h4>
                      <span className="ioc-value">{ioc.value}</span>
                    </div>
                    <span 
                      className="ioc-threat-level"
                      style={{ backgroundColor: getThreatLevelColor(ioc.threat_level) }}
                    >
                      {ioc.threat_level}
                    </span>
                  </div>
                  
                  <div className="ioc-stats">
                    <div className="stat">
                      <span className="stat-label">Events</span>
                      <span className="stat-value">{ioc.event_count}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Source</span>
                      <span className="stat-value">{ioc.source}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">First Seen</span>
                      <span className="stat-value">
                        {new Date(ioc.first_seen).toLocaleString()}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Last Seen</span>
                      <span className="stat-value">
                        {new Date(ioc.last_seen).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  {ioc.description && (
                    <p className="ioc-description">{ioc.description}</p>
                  )}
                  
                  <div className="ioc-actions">
                    <button className="btn btn-sm btn-secondary">
                      🔍 Investigate
                    </button>
                    <button className="btn btn-sm btn-secondary">
                      📊 Details
                    </button>
                    <button className="btn btn-sm btn-secondary">
                      🚫 Block
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading IOCs...</p>
                </div>
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">🔍</span>
                  <p>No IOCs found matching the current filters</p>
                  <p className="empty-hint">Try adjusting the filters or time range</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThreatsIOCs;
