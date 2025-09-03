import React, { useState, useEffect } from 'react';
import { enhancedEventsApi } from '../api/enhancedApi';
import './TTPTimeline.css';

const TTPTimeline = () => {
  const [activeIPs, setActiveIPs] = useState([]);
  const [selectedIP, setSelectedIP] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(24);

  // Load active IPs on component mount
  useEffect(() => {
    loadActiveIPs();
  }, [timeRange]);

  const loadActiveIPs = async () => {
    try {
      setLoading(true);
      const response = await enhancedEventsApi.getActiveIPs({
        time_range: timeRange,
        min_events: 1
      });
      
      console.log('🔍 Active IPs loaded:', response);
      setActiveIPs(response.active_ips || []);
      
      // Auto-select the first IP if available
      if (response.active_ips && response.active_ips.length > 0 && !selectedIP) {
        setSelectedIP(response.active_ips[0].ip);
      }
    } catch (err) {
      console.error('Error loading active IPs:', err);
      setError('Failed to load active IPs');
    } finally {
      setLoading(false);
    }
  };

  const loadIPTimeline = async (ip) => {
    if (!ip) return;
    
    try {
      setLoading(true);
      const response = await enhancedEventsApi.getIPTimeline(ip, {
        time_range: timeRange
      });
      
      console.log('🔍 IP Timeline loaded:', response);
      setTimeline(response.ttp_timeline);
    } catch (err) {
      console.error('Error loading IP timeline:', err);
      setError(`Failed to load timeline for ${ip}`);
    } finally {
      setLoading(false);
    }
  };

  // Load timeline when IP is selected
  useEffect(() => {
    if (selectedIP) {
      loadIPTimeline(selectedIP);
    }
  }, [selectedIP, timeRange]);

  const handleIPSelect = (ip) => {
    setSelectedIP(ip);
    setTimeline(null);
  };

  const getThreatScoreColor = (score) => {
    if (score >= 40) return '#dc2626'; // Red
    if (score >= 30) return '#ea580c'; // Orange
    if (score >= 20) return '#d97706'; // Yellow
    if (score >= 10) return '#2563eb'; // Blue
    return '#059669'; // Green
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'Critical': '#dc2626',
      'High': '#ea580c', 
      'Medium': '#d97706',
      'Low': '#2563eb',
      'Minimal': '#059669',
      'Unknown': '#6b7280'
    };
    return colors[severity] || colors['Unknown'];
  };

  const formatDuration = (minutes) => {
    if (minutes === 0) return 'Instant';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (error) {
    return (
      <div className="ttp-timeline-container">
        <div className="error-message">
          ⚠️ {error}
          <button onClick={() => { setError(null); loadActiveIPs(); }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ttp-timeline-container">
      <div className="ttp-header">
        <div className="ttp-title">
          <h2>🎯 TTP Analysis</h2>
          <p>Tactics, Techniques, and Procedures - Attacker Activity Timeline</p>
        </div>
        
        <div className="ttp-controls">
          <label>
            Time Range:
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(Number(e.target.value))}
            >
              <option value={1}>Last Hour</option>
              <option value={6}>Last 6 Hours</option>
              <option value={12}>Last 12 Hours</option>
              <option value={24}>Last 24 Hours</option>
              <option value={72}>Last 3 Days</option>
              <option value={168}>Last Week</option>
            </select>
          </label>
        </div>
      </div>

      <div className="ttp-content">
        {/* Active IPs List */}
        <div className="active-ips-panel">
          <h3>🔍 Active Threat IPs</h3>
          
          {loading && !timeline && (
            <div className="loading">Loading active IPs...</div>
          )}
          
          {activeIPs.length === 0 && !loading && (
            <div className="no-data">No active IPs found in the selected time range</div>
          )}
          
          <div className="ips-list">
            {activeIPs.map((ipData) => (
              <div
                key={ipData.ip}
                className={`ip-card ${selectedIP === ipData.ip ? 'selected' : ''}`}
                onClick={() => handleIPSelect(ipData.ip)}
              >
                <div className="ip-header">
                  <span className="ip-address">{ipData.ip}</span>
                  <span 
                    className="threat-score"
                    style={{ backgroundColor: getThreatScoreColor(ipData.threat_score) }}
                  >
                    {ipData.threat_score}
                  </span>
                </div>
                
                <div className="ip-details">
                  <div className="ip-stat">
                    <span className="label">Events:</span>
                    <span className="value">{ipData.event_count}</span>
                  </div>
                  <div className="ip-stat">
                    <span className="label">Duration:</span>
                    <span className="value">{formatDuration(ipData.duration_minutes)}</span>
                  </div>
                  <div className="ip-stat">
                    <span className="label">Honeypots:</span>
                    <span className="value">{ipData.honeypots_targeted.length}</span>
                  </div>
                  <div className="ip-stat">
                    <span className="label">Severity:</span>
                    <span 
                      className="value severity"
                      style={{ color: getSeverityColor(ipData.max_severity) }}
                    >
                      {ipData.max_severity}
                    </span>
                  </div>
                </div>
                
                <div className="ip-types">
                  {ipData.event_types.map(type => (
                    <span key={type} className="event-type-badge">
                      {type.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Display */}
        <div className="timeline-panel">
          {selectedIP && (
            <>
              <h3>📊 Activity Timeline for {selectedIP}</h3>
              
              {loading && (
                <div className="loading">Loading timeline...</div>
              )}
              
              {timeline && (
                <div className="timeline-content">
                  {/* Timeline Summary */}
                  <div className="timeline-summary">
                    <div className="summary-header">
                      <h4>📈 Attack Summary</h4>
                      <div className="threat-assessment">
                        <span 
                          className="assessment-badge"
                          style={{ backgroundColor: getSeverityColor(timeline.summary.threat_assessment) }}
                        >
                          {timeline.summary.threat_assessment} Threat
                        </span>
                      </div>
                    </div>
                    
                    <div className="summary-stats">
                      <div className="summary-stat">
                        <span className="stat-label">Total Events:</span>
                        <span className="stat-value">{timeline.total_events}</span>
                      </div>
                      <div className="summary-stat">
                        <span className="stat-label">First Seen:</span>
                        <span className="stat-value">{formatTimestamp(timeline.summary.first_seen)}</span>
                      </div>
                      <div className="summary-stat">
                        <span className="stat-label">Last Seen:</span>
                        <span className="stat-value">{formatTimestamp(timeline.summary.last_seen)}</span>
                      </div>
                      <div className="summary-stat">
                        <span className="stat-label">Duration:</span>
                        <span className="stat-value">{formatDuration(timeline.summary.duration_minutes)}</span>
                      </div>
                    </div>

                    <div className="summary-targets">
                      <div className="targets-section">
                        <span className="targets-label">Honeypots Targeted:</span>
                        <div className="targets-list">
                          {timeline.summary.honeypots_targeted.map(honeypot => (
                            <span key={honeypot} className="target-badge">{honeypot}</span>
                          ))}
                        </div>
                      </div>
                      
                      {timeline.summary.ports_targeted.length > 0 && (
                        <div className="targets-section">
                          <span className="targets-label">Ports Targeted:</span>
                          <div className="targets-list">
                            {timeline.summary.ports_targeted.map(port => (
                              <span key={port} className="target-badge port">{port}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  <div className="activity-timeline">
                    <h4>⏱️ Chronological Activity</h4>
                    
                    {timeline.timeline.length === 0 && (
                      <div className="no-timeline">No timeline data available</div>
                    )}
                    
                    <div className="timeline-events">
                      {timeline.timeline.map((event, index) => (
                        <div key={index} className="timeline-event">
                          <div className="timeline-marker">
                            <div 
                              className="marker-dot"
                              style={{ backgroundColor: getSeverityColor(event.severity) }}
                            />
                            {index < timeline.timeline.length - 1 && (
                              <div className="marker-line" />
                            )}
                          </div>
                          
                          <div className="timeline-content-item">
                            <div className="event-header">
                              <span className="event-time">
                                {formatTimestamp(event.timestamp)}
                              </span>
                              <span className="event-type-badge">
                                {event.event_type.replace('_', ' ')}
                              </span>
                              <span 
                                className="event-severity"
                                style={{ color: getSeverityColor(event.severity) }}
                              >
                                {event.severity}
                              </span>
                            </div>
                            
                            <div className="event-activity">
                              <strong>{event.activity}</strong>
                            </div>
                            
                            <div className="event-details">
                              {event.honeypot && (
                                <span className="event-detail">
                                  🍯 Honeypot: {event.honeypot}
                                </span>
                              )}
                              {event.port && (
                                <span className="event-detail">
                                  🔌 Port: {event.port}
                                </span>
                              )}
                              {event.protocol && (
                                <span className="event-detail">
                                  📡 Protocol: {event.protocol}
                                </span>
                              )}
                              <span className="event-detail">
                                ⚡ Risk Score: {event.risk_score}/10
                              </span>
                            </div>

                            {event.attack_patterns && event.attack_patterns.length > 0 && (
                              <div className="attack-patterns">
                                <span className="patterns-label">Attack Patterns:</span>
                                {event.attack_patterns.map(pattern => (
                                  <span key={pattern} className="pattern-badge">
                                    {pattern.replace('_', ' ')}
                                  </span>
                                ))}
                              </div>
                            )}

                            {event.details.payload_preview && (
                              <div className="payload-preview">
                                <details>
                                  <summary>View Payload</summary>
                                  <pre>{event.details.payload_preview}</pre>
                                </details>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attack Progression */}
                  {timeline.summary.attack_progression && timeline.summary.attack_progression.length > 0 && (
                    <div className="attack-progression">
                      <h4>🔄 Attack Progression</h4>
                      <div className="progression-phases">
                        {timeline.summary.attack_progression.map((phase, index) => (
                          <div key={index} className="progression-phase">
                            <div className="phase-time">
                              {formatTimestamp(phase.time)}
                            </div>
                            <div className="phase-activity">
                              <strong>{phase.primary_activity}</strong>
                            </div>
                            <div className="phase-details">
                              <span>{phase.activities} activities</span>
                              {phase.honeypots.length > 0 && (
                                <span> • {phase.honeypots.join(', ')}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          
          {!selectedIP && !loading && (
            <div className="no-selection">
              <h3>👆 Select an IP from the list to view its activity timeline</h3>
              <p>Choose any IP address from the left panel to see detailed TTP analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TTPTimeline;
