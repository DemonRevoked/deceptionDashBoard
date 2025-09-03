import React, { useState, useEffect } from 'react';
import { enhancedEventsApi } from '../api/enhancedApi';
import './Threats.css';

const ThreatsCampaigns = ({ events = [], timeRange = 24 }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisTimeRange, setAnalysisTimeRange] = useState(timeRange);
  const [selectedCampaignType, setSelectedCampaignType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load campaign data
  useEffect(() => {
    loadCampaigns();
  }, [analysisTimeRange]);

  // Filter campaigns when search or type changes
  useEffect(() => {
    filterCampaigns();
  }, [campaigns, selectedCampaignType, searchQuery]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load correlation analysis for campaigns
      const response = await enhancedEventsApi.getCorrelationAnalysis({
        time_range: analysisTimeRange
      });

      if (response.success) {
        setCampaigns(response.campaigns || []);
      } else {
        // Fallback: generate campaigns from events if API fails
        const generatedCampaigns = generateCampaignsFromEvents(events);
        setCampaigns(generatedCampaigns);
      }

    } catch (err) {
      console.error('Error loading campaigns:', err);
      setError('Failed to load campaign data');
      
      // Fallback: generate campaigns from events
      const generatedCampaigns = generateCampaignsFromEvents(events);
      setCampaigns(generatedCampaigns);
    } finally {
      setLoading(false);
    }
  };

  const generateCampaignsFromEvents = (events) => {
    const campaignMap = new Map();

    events.forEach(event => {
      const sourceIP = event.source_ip;
      if (!sourceIP) return;

      if (!campaignMap.has(sourceIP)) {
        campaignMap.set(sourceIP, {
          id: `campaign-${sourceIP}`,
          name: `Campaign from ${sourceIP}`,
          type: 'automated_scanning',
          threat_level: event.severity || 'Medium',
          start_time: event.timestamp,
          end_time: event.timestamp,
          event_count: 0,
          unique_ips: new Set(),
          techniques: new Set(),
          description: `Automated campaign detected from ${sourceIP}`,
          status: 'active'
        });
      }

      const campaign = campaignMap.get(sourceIP);
      campaign.event_count++;
      campaign.unique_ips.add(event.source_ip);
      campaign.techniques.add(event.note_type || 'unknown');
      
      if (new Date(event.timestamp) > new Date(campaign.end_time)) {
        campaign.end_time = event.timestamp;
      }
    });

    return Array.from(campaignMap.values()).map(campaign => ({
      ...campaign,
      unique_ips: Array.from(campaign.unique_ips),
      techniques: Array.from(campaign.techniques)
    }));
  };

  const filterCampaigns = () => {
    let filtered = [...campaigns];

    // Filter by type
    if (selectedCampaignType !== 'all') {
      filtered = filtered.filter(campaign => campaign.type === selectedCampaignType);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(campaign => 
        campaign.name.toLowerCase().includes(query) ||
        campaign.description.toLowerCase().includes(query) ||
        campaign.techniques.some(tech => tech.toLowerCase().includes(query))
      );
    }

    setFilteredCampaigns(filtered);
  };

  const handleTimeRangeChange = (newTimeRange) => {
    setAnalysisTimeRange(newTimeRange);
  };

  const handleCampaignTypeChange = (newType) => {
    setSelectedCampaignType(newType);
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

  const getCampaignIcon = (type) => {
    const icons = {
      'automated_scanning': '🤖',
      'targeted_attack': '🎯',
      'credential_stuffing': '🔑',
      'data_exfiltration': '📤',
      'lateral_movement': '🔄',
      'persistence': '📌',
      'ransomware': '💀',
      'apt': '👥'
    };
    return icons[type] || '📊';
  };

  const getCampaignTypeLabel = (type) => {
    const labels = {
      'automated_scanning': 'Automated Scanning',
      'targeted_attack': 'Targeted Attack',
      'credential_stuffing': 'Credential Stuffing',
      'data_exfiltration': 'Data Exfiltration',
      'lateral_movement': 'Lateral Movement',
      'persistence': 'Persistence',
      'ransomware': 'Ransomware',
      'apt': 'Advanced Persistent Threat'
    };
    return labels[type] || type;
  };

  const getStatusColor = (status) => {
    const colors = {
      'active': '#dc2626',
      'monitoring': '#ea580c',
      'contained': '#d97706',
      'resolved': '#059669'
    };
    return colors[status] || '#6b7280';
  };

  const calculateCampaignDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return '< 1 hour';
    if (diffHours < 24) return `${diffHours} hours`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days`;
  };

  const exportCampaigns = () => {
    if (filteredCampaigns.length === 0) return;

    const csvContent = [
      ['Name', 'Type', 'Threat Level', 'Status', 'Start Time', 'End Time', 'Duration', 'Event Count', 'Unique IPs', 'Techniques', 'Description'],
      ...filteredCampaigns.map(campaign => [
        campaign.name,
        getCampaignTypeLabel(campaign.type),
        campaign.threat_level,
        campaign.status,
        new Date(campaign.start_time).toISOString(),
        new Date(campaign.end_time).toISOString(),
        calculateCampaignDuration(campaign.start_time, campaign.end_time),
        campaign.event_count,
        campaign.unique_ips.length,
        campaign.techniques.join('; '),
        campaign.description
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaigns-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="threats-campaigns-page">
      <div className="campaigns-header">
        <div className="header-content">
          <h2>📊 Threat Campaigns</h2>
          <p>Analyze correlated attack campaigns and threat actor activities</p>
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
            onClick={loadCampaigns}
            disabled={loading}
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={exportCampaigns}
            disabled={filteredCampaigns.length === 0}
          >
            📊 Export ({filteredCampaigns.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {/* Filters */}
      <div className="campaigns-filters">
        <div className="filter-group">
          <label htmlFor="campaign-type-filter">Campaign Type:</label>
          <select
            id="campaign-type-filter"
            value={selectedCampaignType}
            onChange={(e) => handleCampaignTypeChange(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="automated_scanning">Automated Scanning</option>
            <option value="targeted_attack">Targeted Attack</option>
            <option value="credential_stuffing">Credential Stuffing</option>
            <option value="data_exfiltration">Data Exfiltration</option>
            <option value="lateral_movement">Lateral Movement</option>
            <option value="persistence">Persistence</option>
            <option value="ransomware">Ransomware</option>
            <option value="apt">Advanced Persistent Threat</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="campaign-search">Search:</label>
          <input
            id="campaign-search"
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="filter-input"
          />
        </div>
      </div>

      <div className="campaigns-content">
        {/* Campaign Statistics */}
        <div className="campaigns-stats">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{filteredCampaigns.length}</div>
              <div className="stat-label">Total Campaigns</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🔴</div>
            <div className="stat-content">
              <div className="stat-value">
                {filteredCampaigns.filter(campaign => campaign.status === 'active').length}
              </div>
              <div className="stat-label">Active</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-value">
                {filteredCampaigns.filter(campaign => campaign.threat_level === 'Critical' || campaign.threat_level === 'High').length}
              </div>
              <div className="stat-label">High/Critical</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🌐</div>
            <div className="stat-content">
              <div className="stat-value">
                {filteredCampaigns.reduce((total, campaign) => total + campaign.unique_ips.length, 0)}
              </div>
              <div className="stat-label">Total IPs</div>
            </div>
          </div>
        </div>

        {/* Campaign List */}
        <div className="campaigns-section">
          <div className="section-header">
            <h3>📋 Campaign Details</h3>
            <p>Detailed view of all identified attack campaigns</p>
          </div>
          
          {filteredCampaigns.length > 0 ? (
            <div className="campaigns-grid">
              {filteredCampaigns.map((campaign) => (
                <div key={campaign.id} className="campaign-card">
                  <div className="campaign-header">
                    <span className="campaign-icon">
                      {getCampaignIcon(campaign.type)}
                    </span>
                    <div className="campaign-info">
                      <h4>{campaign.name}</h4>
                      <span className="campaign-type">{getCampaignTypeLabel(campaign.type)}</span>
                    </div>
                    <div className="campaign-badges">
                      <span 
                        className="campaign-threat-level"
                        style={{ backgroundColor: getThreatLevelColor(campaign.threat_level) }}
                      >
                        {campaign.threat_level}
                      </span>
                      <span 
                        className="campaign-status"
                        style={{ backgroundColor: getStatusColor(campaign.status) }}
                      >
                        {campaign.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="campaign-stats">
                    <div className="stat">
                      <span className="stat-label">Events</span>
                      <span className="stat-value">{campaign.event_count}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Unique IPs</span>
                      <span className="stat-value">{campaign.unique_ips.length}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Duration</span>
                      <span className="stat-value">
                        {calculateCampaignDuration(campaign.start_time, campaign.end_time)}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Start</span>
                      <span className="stat-value">
                        {new Date(campaign.start_time).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  {campaign.description && (
                    <p className="campaign-description">{campaign.description}</p>
                  )}
                  
                  {campaign.techniques && campaign.techniques.length > 0 && (
                    <div className="campaign-techniques">
                      <strong>Techniques:</strong>
                      <div className="techniques-tags">
                        {campaign.techniques.slice(0, 5).map((technique, idx) => (
                          <span key={idx} className="technique-tag">
                            {technique}
                          </span>
                        ))}
                        {campaign.techniques.length > 5 && (
                          <span className="technique-tag more">
                            +{campaign.techniques.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="campaign-actions">
                    <button className="btn btn-sm btn-secondary">
                      🔍 Investigate
                    </button>
                    <button className="btn btn-sm btn-secondary">
                      📊 Timeline
                    </button>
                    <button className="btn btn-sm btn-secondary">
                      🚫 Contain
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
                  <p>Analyzing campaigns...</p>
                </div>
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">📊</span>
                  <p>No campaigns found matching the current filters</p>
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

export default ThreatsCampaigns;
