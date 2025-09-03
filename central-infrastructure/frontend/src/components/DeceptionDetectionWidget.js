import React, { useState, useEffect } from 'react';
import { fetchDeceptionActivity, fetchDeceptionDetectionStats } from '../api';
import './DeceptionDetectionWidget.css';

const DeceptionDetectionWidget = () => {
  const [deceptionEvents, setDeceptionEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(24);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Load deception detection data on component mount
  useEffect(() => {
    loadDeceptionData();
  }, [timeRange]);

  const loadDeceptionData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both events and stats
      const [eventsData, statsData] = await Promise.all([
        fetchDeceptionActivity({ hours: timeRange, limit: 100 }),
        fetchDeceptionDetectionStats({ hours: timeRange })
      ]);
      
      console.log('🔍 Deception detection data loaded:', { events: eventsData, stats: statsData });
      
      setDeceptionEvents(eventsData || []);
      setStats(statsData || {});
      
    } catch (err) {
      console.error('Error loading deception detection data:', err);
      setError('Failed to load deception detection data');
    } finally {
      setLoading(false);
    }
  };

  const handleEventSelect = (event) => {
    setSelectedEvent(selectedEvent?._id === event._id ? null : event);
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

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  const getEventTypeIcon = (eventType, protocol) => {
    const icons = {
      'deception_event': '🍯',
      'honeypot_engagement': '🎯',
      'ssh_attempt': '🔐',
      'port_scan': '🔍',
      'web_access': '🌐',
      'ftp_attempt': '📁',
      'telnet_attempt': '💻'
    };
    
    // Handle specific protocols
    if (protocol === 'SSH' || protocol === 'ssh') {
      return '🔐';
    } else if (protocol === 'HTTP' || protocol === 'http' || protocol === 'HTTPS' || protocol === 'https') {
      return '🌐';
    } else if (protocol === 'FTP' || protocol === 'ftp') {
      return '📁';
    } else if (protocol === 'TELNET' || protocol === 'telnet') {
      return '💻';
    }
    
    return icons[eventType] || '⚠️';
  };

  const getEventTypeLabel = (eventType, protocol, destPort) => {
    // If we have protocol information, use it for better labeling
    if (protocol) {
      if (protocol === 'SSH' || protocol === 'ssh') {
        return 'SSH Connection Attempt';
      } else if (protocol === 'HTTP' || protocol === 'http' || protocol === 'HTTPS' || protocol === 'https') {
        return 'Web Access Attempt';
      } else if (protocol === 'FTP' || protocol === 'ftp') {
        return 'FTP Connection Attempt';
      } else if (protocol === 'TELNET' || protocol === 'telnet') {
        return 'Telnet Connection Attempt';
      }
    }
    
    // If we have port information, use it for labeling
    if (destPort) {
      if (destPort === 22 || destPort === '22') {
        return 'SSH Connection Attempt';
      } else if (destPort === 80 || destPort === '80' || destPort === 443 || destPort === '443') {
        return 'Web Access Attempt';
      } else if (destPort === 21 || destPort === '21') {
        return 'FTP Connection Attempt';
      } else if (destPort === 23 || destPort === '23') {
        return 'Telnet Connection Attempt';
      }
    }
    
    const labels = {
      'deception_event': 'Deception Event',
      'honeypot_engagement': 'Honeypot Engagement',
      'ssh_attempt': 'SSH Attempt',
      'port_scan': 'Port Scan',
      'web_access': 'Web Access',
      'ftp_attempt': 'FTP Attempt',
      'telnet_attempt': 'Telnet Attempt'
    };
    
    return labels[eventType] || eventType?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  };

  if (error) {
    return (
      <div className="deception-widget-container">
        <div className="error-message">
          ⚠️ {error}
          <button onClick={loadDeceptionData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="deception-widget-container">
      <div className="deception-header">
        <div className="deception-title">
          <h2>🍯 Deception Detection</h2>
          <p>Honeypot interaction monitoring and threat analysis</p>
        </div>
        <div className="deception-controls">
          <label>
            Time Range:
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(Number(e.target.value))}
            >
              <option value={1}>Last Hour</option>
              <option value={6}>Last 6 Hours</option>
              <option value={24}>Last 24 Hours</option>
              <option value={168}>Last Week</option>
            </select>
          </label>
        </div>
      </div>

      <div className="deception-content">
        {/* Statistics Panel */}
        <div className="stats-panel">
          <h3>📊 Detection Summary</h3>
          {stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats.total || 0}</div>
                <div className="stat-label">Total Events</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.unique_ips || 0}</div>
                <div className="stat-label">Unique IPs</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{timeRange}h</div>
                <div className="stat-label">Time Range</div>
              </div>
            </div>
          )}
          
          {stats?.by_severity && (
            <div className="severity-breakdown">
              <h4>Severity Distribution</h4>
              <div className="severity-bars">
                {Object.entries(stats.by_severity).map(([severity, count]) => (
                  <div key={severity} className="severity-bar">
                    <div className="severity-label">{severity}</div>
                    <div className="severity-bar-container">
                      <div 
                        className="severity-bar-fill"
                        style={{ 
                          width: `${(count / stats.total) * 100}%`,
                          backgroundColor: getSeverityColor(severity)
                        }}
                      />
                    </div>
                    <div className="severity-count">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Events Panel */}
        <div className="events-panel">
          <h3>🚨 Recent Events</h3>
          
          {loading && (
            <div className="loading">Loading deception events...</div>
          )}
          
          {deceptionEvents.length === 0 && !loading && (
            <div className="no-events">No deception events detected in the selected time range</div>
          )}
          
          <div className="events-list">
            {deceptionEvents.map((event, index) => (
              <div 
                key={event._id || index} 
                className={`event-card ${selectedEvent?._id === event._id ? 'selected' : ''}`}
                onClick={() => handleEventSelect(event)}
              >
                <div className="event-header">
                  <div className="event-icon">
                    {getEventTypeIcon(event.note_type || event.data_type, event.protocol)}
                  </div>
                  <div className="event-info">
                    <div className="event-type">
                      {getEventTypeLabel(event.note_type || event.data_type, event.protocol, event.dest_port)}
                    </div>
                    <div className="event-time">
                      {formatTimestamp(event.timestamp)}
                    </div>
                  </div>
                  <div className="event-severity">
                    <span 
                      className="severity-badge"
                      style={{ backgroundColor: getSeverityColor(event.severity) }}
                    >
                      {event.severity || 'Unknown'}
                    </span>
                  </div>
                </div>
                
                <div className="event-details">
                  <div className="detail-row">
                    <span className="detail-label">Source IP:</span>
                    <span className="detail-value">{event.source_ip || 'Unknown'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Target Port:</span>
                    <span className="detail-value">
                      {event.dest_port || event.port || 'Unknown'}
                      {event.protocol && ` (${event.protocol})`}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Honeypot:</span>
                    <span className="detail-value">{event.honeypot_name || event.honeypot_id || 'Unknown'}</span>
                  </div>
                  {event.message && (
                    <div className="detail-row">
                      <span className="detail-label">Description:</span>
                      <span className="detail-value">{event.message}</span>
                    </div>
                  )}
                </div>

                {/* Expanded Event Details */}
                {selectedEvent?._id === event._id && (
                  <div className="event-expanded">
                    <div className="expanded-details">
                      <div className="detail-section">
                        <h5>Session Information</h5>
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="detail-label">Session ID:</span>
                            <span className="detail-value">{event.session_id || event.uid || 'N/A'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Protocol:</span>
                            <span className="detail-value">{event.protocol || 'TCP'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Attack Category:</span>
                            <span className="detail-value">{event.attack_category || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {event.details && (
                        <div className="detail-section">
                          <h5>Technical Details</h5>
                          <div className="detail-grid">
                            {Object.entries(event.details).map(([key, value]) => (
                              <div key={key} className="detail-item">
                                <span className="detail-label">{key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                                <span className="detail-value">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeceptionDetectionWidget;
