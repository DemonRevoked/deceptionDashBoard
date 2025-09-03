import React, { useState } from 'react';
import './ThreatFilters.css';

const ThreatFilters = ({ 
  filters, 
  onFilterChange, 
  savedViews, 
  onSaveView, 
  onLoadView, 
  resultCount 
}) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  const handleSaveView = () => {
    if (newViewName.trim()) {
      onSaveView(newViewName.trim());
      setNewViewName('');
      setShowSaveDialog(false);
    }
  };

  const severityOptions = [
    { value: 'all', label: 'All Severities' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];

  const platformOptions = [
    { value: 'all', label: 'All Platforms' },
    { value: 'network', label: 'Network' },
    { value: 'honeypot', label: 'Deception Engine' },
    { value: 'ot', label: 'OT Systems' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'new', label: 'New' },
    { value: 'acknowledged', label: 'Acknowledged' },
    { value: 'investigating', label: 'Investigating' },
    { value: 'resolved', label: 'Resolved' }
  ];

  return (
    <div className="threat-filters">
      <div className="filters-header">
        <h3>Filters</h3>
        <span className="result-count">{resultCount} results</span>
      </div>

      <div className="filter-section">
        <label className="filter-label">Search</label>
        <input
          type="text"
          className="filter-input"
          placeholder="IP, domain, alert type..."
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
        />
      </div>

      <div className="filter-section">
        <label className="filter-label">Severity</label>
        <select
          className="filter-select"
          value={filters.severity}
          onChange={(e) => onFilterChange({ severity: e.target.value })}
        >
          {severityOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-section">
        <label className="filter-label">Platform</label>
        <select
          className="filter-select"
          value={filters.platform}
          onChange={(e) => onFilterChange({ platform: e.target.value })}
        >
          {platformOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-section">
        <label className="filter-label">Status</label>
        <select
          className="filter-select"
          value={filters.status}
          onChange={(e) => onFilterChange({ status: e.target.value })}
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-actions">
        <button
          className="btn btn-secondary btn-small"
          onClick={() => onFilterChange({
            severity: 'all',
            platform: 'all',
            status: 'all',
            search: ''
          })}
        >
          Clear All
        </button>
        <button
          className="btn btn-primary btn-small"
          onClick={() => setShowSaveDialog(true)}
        >
          Save View
        </button>
      </div>

      {savedViews.length > 0 && (
        <div className="saved-views">
          <label className="filter-label">Saved Views</label>
          <div className="saved-views-list">
            {savedViews.map((view, index) => (
              <button
                key={index}
                className="saved-view-item"
                onClick={() => onLoadView(view)}
              >
                {view.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {showSaveDialog && (
        <div className="save-dialog">
          <label className="filter-label">View Name</label>
          <input
            type="text"
            className="filter-input"
            placeholder="Enter view name..."
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSaveView()}
          />
          <div className="dialog-actions">
            <button
              className="btn btn-secondary btn-small"
              onClick={() => setShowSaveDialog(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary btn-small"
              onClick={handleSaveView}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreatFilters;
