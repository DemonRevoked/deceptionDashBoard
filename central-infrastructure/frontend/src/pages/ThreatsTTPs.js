import React, { useState, useEffect } from 'react';
import TTPTimeline from '../components/TTPTimeline';
import { enhancedEventsApi } from '../api/enhancedApi';
import './Threats.css';

const ThreatsTTPs = ({ events = [], timeRange = 24 }) => {
  const [activeIPs, setActiveIPs] = useState([]);
  const [selectedIP, setSelectedIP] = useState(null);
  const [ttpAnalysis, setTtpAnalysis] = useState(null);
  const [attackPatterns, setAttackPatterns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisTimeRange, setAnalysisTimeRange] = useState(timeRange);

  // Load TTP analysis data
  useEffect(() => {
    loadTTPAnalysis();
  }, [analysisTimeRange]);

  const loadTTPAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load attack patterns analysis
      const patternsResponse = await enhancedEventsApi.getAttackPatternAnalysis({
        time_range: analysisTimeRange,
        min_occurrences: 2
      });

      if (patternsResponse.success) {
        setAttackPatterns(patternsResponse.patterns || []);
      }

      // Load active IPs for timeline analysis
      const ipsResponse = await enhancedEventsApi.getActiveIPs({
        time_range: analysisTimeRange,
        min_events: 1
      });

      if (ipsResponse.success) {
        setActiveIPs(ipsResponse.active_ips || []);
        // Auto-select first IP if available
        if (ipsResponse.active_ips && ipsResponse.active_ips.length > 0 && !selectedIP) {
          setSelectedIP(ipsResponse.active_ips[0].ip);
        }
      }

    } catch (err) {
      console.error('Error loading TTP analysis:', err);
      setError('Failed to load TTP analysis data');
    } finally {
      setLoading(false);
    }
  };

  const handleIPSelect = (ip) => {
    setSelectedIP(ip);
  };

  const handleTimeRangeChange = (newTimeRange) => {
    setAnalysisTimeRange(newTimeRange);
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

  const getPatternIcon = (pattern) => {
    const icons = {
      'brute_force': '🔨',
      'port_scan': '🔍',
      'service_enumeration': '📋',
      'credential_stuffing': '🔑',
      'command_injection': '💻',
      'data_exfiltration': '📤',
      'lateral_movement': '🔄',
      'persistence': '📌'
    };
    return icons[pattern] || '🎯';
  };

  return (
    <div className="threats-ttps-page">
      <div className="ttps-header">
        <div className="header-content">
          <h2>🎪 Tactics, Techniques & Procedures (TTPs)</h2>
          <p>Analyze attack patterns, behaviors, and threat actor techniques</p>
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
            onClick={loadTTPAnalysis}
            disabled={loading}
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      <div className="ttps-content">
        {/* Attack Patterns Section */}
        <div className="ttps-section">
          <div className="section-header">
            <h3>🎯 Attack Patterns & Techniques</h3>
            <p>Identified attack patterns and their frequency</p>
          </div>
          
          {attackPatterns.length > 0 ? (
            <div className="patterns-grid">
              {attackPatterns.map((pattern, index) => (
                <div key={index} className="pattern-card">
                  <div className="pattern-header">
                    <span className="pattern-icon">
                      {getPatternIcon(pattern.pattern_type)}
                    </span>
                    <div className="pattern-info">
                      <h4>{pattern.pattern_name || pattern.pattern_type}</h4>
                      <span className="pattern-type">{pattern.pattern_type}</span>
                    </div>
                  </div>
                  
                  <div className="pattern-stats">
                    <div className="stat">
                      <span className="stat-label">Occurrences</span>
                      <span className="stat-value">{pattern.occurrence_count}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Threat Level</span>
                      <span 
                        className="stat-value threat-level"
                        style={{ color: getThreatLevelColor(pattern.threat_level) }}
                      >
                        {pattern.threat_level}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Unique IPs</span>
                      <span className="stat-value">{pattern.unique_ips}</span>
                    </div>
                  </div>
                  
                  {pattern.description && (
                    <p className="pattern-description">{pattern.description}</p>
                  )}
                  
                  {pattern.indicators && pattern.indicators.length > 0 && (
                    <div className="pattern-indicators">
                      <strong>Indicators:</strong>
                      <ul>
                        {pattern.indicators.slice(0, 3).map((indicator, idx) => (
                          <li key={idx}>{indicator}</li>
                        ))}
                        {pattern.indicators.length > 3 && (
                          <li>...and {pattern.indicators.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Analyzing attack patterns...</p>
                </div>
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">🔍</span>
                  <p>No attack patterns detected in the selected time range</p>
                  <p className="empty-hint">Try adjusting the time range or check back later</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* TTP Timeline Section */}
        <div className="ttps-section">
          <div className="section-header">
            <h3>⏰ TTP Timeline Analysis</h3>
            <p>Detailed timeline analysis of threat actor activities</p>
          </div>
          
          <div className="timeline-container">
            <TTPTimeline />
          </div>
        </div>

        {/* Active IPs Section */}
        <div className="ttps-section">
          <div className="section-header">
            <h3>🌐 Active Threat Sources</h3>
            <p>IP addresses with recent suspicious activity</p>
          </div>
          
          {activeIPs.length > 0 ? (
            <div className="active-ips-grid">
              {activeIPs.map((ipData, index) => (
                <div 
                  key={index} 
                  className={`ip-card ${selectedIP === ipData.ip ? 'selected' : ''}`}
                  onClick={() => handleIPSelect(ipData.ip)}
                >
                  <div className="ip-header">
                    <span className="ip-address">{ipData.ip}</span>
                    <span className="ip-threat-score" style={{ 
                      backgroundColor: getThreatLevelColor(ipData.threat_level || 'Medium') 
                    }}>
                      {ipData.threat_score || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="ip-stats">
                    <div className="stat">
                      <span className="stat-label">Events</span>
                      <span className="stat-value">{ipData.event_count}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Threat Level</span>
                      <span className="stat-value">{ipData.threat_level || 'Unknown'}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Last Seen</span>
                      <span className="stat-value">
                        {new Date(ipData.last_seen).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  {ipData.geolocation && (
                    <div className="ip-location">
                      <span className="location-icon">📍</span>
                      <span>{ipData.geolocation.country}, {ipData.geolocation.city}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading active IPs...</p>
                </div>
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">🌐</span>
                  <p>No active threat sources detected</p>
                  <p className="empty-hint">All clear in the selected time range</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThreatsTTPs;
