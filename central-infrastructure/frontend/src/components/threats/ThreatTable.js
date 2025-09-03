import React, { useState, useMemo } from 'react';
import './ThreatTable.css';

const ThreatTable = ({ threats, loading, onThreatClick }) => {
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedThreats, setSelectedThreats] = useState(new Set());

  const sortedThreats = useMemo(() => {
    return [...threats].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'timestamp') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortBy === 'severity') {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        aValue = severityOrder[aValue] || 0;
        bValue = severityOrder[bValue] || 0;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [threats, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleSelectThreat = (threatId, event) => {
    event.stopPropagation();
    const newSelected = new Set(selectedThreats);
    if (newSelected.has(threatId)) {
      newSelected.delete(threatId);
    } else {
      newSelected.add(threatId);
    }
    setSelectedThreats(newSelected);
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedThreats(new Set(sortedThreats.map(t => t.id)));
    } else {
      setSelectedThreats(new Set());
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'severity-critical';
      case 'high': return 'severity-high';
      case 'medium': return 'severity-medium';
      case 'low': return 'severity-low';
      default: return 'severity-unknown';
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform?.toLowerCase()) {
      case 'network': return '🌐';
      case 'scan_detection_engine': return '👁️';
      case 'deception_engine': return '💻';
      case 'it': return '💻';
      case 'ot': return '🏭';
      default: return '⚠️';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className="threat-table-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading threats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="threat-table-container">
      <div className="table-header">
        <div className="selection-info">
          {selectedThreats.size > 0 && (
            <span className="selected-count">
              {selectedThreats.size} selected
            </span>
          )}
        </div>
        <div className="table-actions">
          {selectedThreats.size > 0 && (
            <>
              <button className="btn btn-secondary btn-small">
                Mark as Acknowledged
              </button>
              <button className="btn btn-secondary btn-small">
                Export Selected
              </button>
            </>
          )}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="threat-table">
          <thead>
            <tr>
              <th className="select-column">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedThreats.size === sortedThreats.length && sortedThreats.length > 0}
                />
              </th>
              <th 
                className="sortable"
                onClick={() => handleSort('severity')}
              >
                Severity {getSortIcon('severity')}
              </th>
              <th 
                className="sortable"
                onClick={() => handleSort('timestamp')}
              >
                Time {getSortIcon('timestamp')}
              </th>
              <th>Platform</th>
              <th>Source</th>
              <th>Target</th>
              <th>Alert Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedThreats.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state">
                  <div className="empty-content">
                    <span className="empty-icon">🔍</span>
                    <p>No threats found</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedThreats.map((threat) => (
                <tr
                  key={threat.id}
                  className={`threat-row ${getSeverityColor(threat.severity)} ${selectedThreats.has(threat.id) ? 'selected' : ''}`}
                  onClick={() => onThreatClick(threat)}
                >
                  <td className="select-column">
                    <input
                      type="checkbox"
                      checked={selectedThreats.has(threat.id)}
                      onChange={(e) => handleSelectThreat(threat.id, e)}
                    />
                  </td>
                  <td>
                    <span className={`severity-badge ${threat.severity?.toLowerCase()}`}>
                      {threat.severity || 'Unknown'}
                    </span>
                  </td>
                  <td className="timestamp-column">
                    {formatTimestamp(threat.timestamp)}
                  </td>
                  <td>
                    <div className="platform-cell">
                      <span className="platform-icon">{getPlatformIcon(threat.platform)}</span>
                      <span className="platform-name">{threat.platform}</span>
                    </div>
                  </td>
                  <td className="source-column">
                    <code>{threat.source || 'Unknown'}</code>
                  </td>
                  <td className="target-column">
                    <code>{threat.target || 'N/A'}</code>
                  </td>
                  <td className="alert-type-column">
                    {threat.alertType || threat.note_type || threat.eventType || 'Unknown'}
                  </td>
                  <td>
                    <span className={`status-badge ${threat.status?.toLowerCase()}`}>
                      {threat.status || 'New'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sortedThreats.length > 0 && (
        <div className="table-footer">
          <span className="total-count">
            Showing {sortedThreats.length} of {threats.length} threats
          </span>
        </div>
      )}
    </div>
  );
};

export default ThreatTable;
