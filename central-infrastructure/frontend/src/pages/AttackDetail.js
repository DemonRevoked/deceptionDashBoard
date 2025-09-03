import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAttackDetail } from '../api';
import AttackTimeline from '../components/AttackTimeline';
import './AttackDetail.css';

const AttackDetail = () => {
  const { ip } = useParams();
  const navigate = useNavigate();
  const [selectedStep, setSelectedStep] = useState(null);
  const [attackData, setAttackData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline'); // timeline, analysis, logs, ioc

  useEffect(() => {
    loadAttackData();
  }, [ip]);

  const loadAttackData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchAttackDetail(ip, 24); // Last 24 hours
      setAttackData(data);
    } catch (error) {
      console.error('Error loading attack data:', error);
      setError(error.response?.data?.error || 'Failed to load attack data');
    } finally {
      setLoading(false);
    }
  };

  const handleStepClick = (step) => {
    setSelectedStep(step);
    setActiveTab('analysis');
  };

  const getThreatLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'unknown';
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    try {
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="attack-detail">
        <div className="loading-container">
          <span className="loading-spinner">🔄</span>
          <p>Loading attack details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="attack-detail">
        <div className="error-container">
          <h2>Error Loading Attack Data</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!attackData) {
    return (
      <div className="attack-detail">
        <div className="error-container">
          <h2>Attack Not Found</h2>
          <p>No attack data found for IP: {ip}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="attack-detail">
      {/* Header */}
      <div className="detail-header">
        <div className="header-content">
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            ← Back to Dashboard
          </button>
          <div className="attacker-info">
            <h1>Attack Analysis: {attackData.ip}</h1>
            <div className="attacker-meta">
              <span className={`badge threat-badge ${getThreatLevelColor(attackData.threatScore.level)}`}>
                {attackData.threatScore.level.toUpperCase()}
              </span>
              <span className="threat-score">Score: {attackData.threatScore.score}</span>
              <span className="duration">Duration: {attackData.totalDuration}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          📊 Attack Timeline
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          🔍 Step Analysis
        </button>
        <button 
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📋 Command Logs
        </button>
        <button 
          className={`tab-btn ${activeTab === 'ioc' ? 'active' : ''}`}
          onClick={() => setActiveTab('ioc')}
        >
          🎯 IOC Data
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="timeline-tab">
            <AttackTimeline 
              attackerIP={attackData.ip}
              attackPath={attackData.attackPath}
              onStepClick={handleStepClick}
            />
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="analysis-tab">
            {selectedStep ? (
              <div className="step-analysis">
                <div className="step-header-analysis">
                  <h2>Step Analysis: {selectedStep.attackType?.replace('_', ' ') || selectedStep.type?.replace('_', ' ')}</h2>
                  <div className="step-meta">
                    <span className="platform-badge">{selectedStep.platform}</span>
                    <span className="timestamp">{formatTimestamp(selectedStep.timestamp)}</span>
                  </div>
                </div>

                <div className="analysis-grid">
                  <div className="analysis-card">
                    <h3>Attack Details</h3>
                    <div className="details-list">
                      {Object.entries(selectedStep.attack.details || {}).map(([key, value]) => (
                        <div key={key} className="detail-row">
                          <span className="detail-key">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                          <span className="detail-value">
                            {Array.isArray(value) ? value.join(', ') : 
                             typeof value === 'object' ? JSON.stringify(value, null, 2) : 
                             String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedStep.attack.details?.commands && (
                    <div className="analysis-card">
                      <h3>Commands Executed</h3>
                      <div className="commands-list">
                        {selectedStep.attack.details.commands.map((cmd, index) => (
                          <div key={index} className="command-item">
                            <div className="command-header">
                              <span className="command-text">{cmd.command}</span>
                              <span className="command-time">{formatTimestamp(cmd.timestamp)}</span>
                            </div>
                            <div className="command-output">
                              <pre>{cmd.output}</pre>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="analysis-card">
                    <h3>Impact Assessment</h3>
                    <div className="impact-metrics">
                      <div className="metric">
                        <span className="metric-label">Severity</span>
                        <span className={`metric-value ${getThreatLevelColor(attackData.threatScore.level)}`}>
                          {attackData.threatScore.level.toUpperCase()}
                        </span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Data Exposed</span>
                        <span className="metric-value">
                          {selectedStep.attack.details?.filesAccessed?.length || 0} files
                        </span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Session Duration</span>
                        <span className="metric-value">
                          {selectedStep.attack.details?.sessionDuration || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-step-selected">
                <h3>No Step Selected</h3>
                <p>Click on a step in the timeline to view detailed analysis</p>
              </div>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="logs-tab">
            <div className="logs-header">
              <h2>Command Logs</h2>
              <div className="logs-filters">
                <select className="filter-select">
                  <option value="all">All Commands</option>
                  <option value="system">System Commands</option>
                  <option value="network">Network Commands</option>
                  <option value="file">File Operations</option>
                </select>
              </div>
            </div>

            <div className="logs-container">
              {attackData.attackPath.flatMap(path => 
                path.attacks.filter(attack => attack.details?.commands)
              ).flatMap(attack => 
                attack.details.commands.map((cmd, index) => (
                  <div key={index} className="log-entry">
                    <div className="log-timestamp">{formatTimestamp(cmd.timestamp)}</div>
                    <div className="log-command">$ {cmd.command}</div>
                    <div className="log-output">
                      <pre>{cmd.output}</pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* IOC Tab */}
        {activeTab === 'ioc' && (
          <div className="ioc-tab">
            <div className="ioc-header">
              <h2>Indicators of Compromise (IOC)</h2>
            </div>

            <div className="ioc-grid">
              <div className="ioc-card">
                <h3>Network Indicators</h3>
                <div className="ioc-list">
                  <div className="ioc-item">
                    <span className="ioc-label">IP Address:</span>
                    <span className="ioc-value">{attackData.iocData.ipAddress}</span>
                  </div>
                  <div className="ioc-item">
                    <span className="ioc-label">ASN:</span>
                    <span className="ioc-value">{attackData.iocData.asn}</span>
                  </div>
                  <div className="ioc-item">
                    <span className="ioc-label">Related IPs:</span>
                    <span className="ioc-value">{attackData.iocData.relatedIps.join(', ') || 'None detected'}</span>
                  </div>
                </div>
              </div>

              <div className="ioc-card">
                <h3>Malware Indicators</h3>
                <div className="ioc-list">
                  {attackData.iocData.malwareFamilies.length > 0 ? (
                    attackData.iocData.malwareFamilies.map((malware, index) => (
                      <div key={index} className="ioc-item">
                        <span className="ioc-label">Malware:</span>
                        <span className="ioc-value malware">{malware}</span>
                      </div>
                    ))
                  ) : (
                    <div className="ioc-item">
                      <span className="ioc-label">Malware:</span>
                      <span className="ioc-value">None detected</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="ioc-card">
                <h3>Command & Control</h3>
                <div className="ioc-list">
                  {attackData.iocData.c2Servers.length > 0 ? (
                    attackData.iocData.c2Servers.map((server, index) => (
                      <div key={index} className="ioc-item">
                        <span className="ioc-label">C2 Server:</span>
                        <span className="ioc-value c2">{server}</span>
                      </div>
                    ))
                  ) : (
                    <div className="ioc-item">
                      <span className="ioc-label">C2 Server:</span>
                      <span className="ioc-value">None detected</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="ioc-card">
                <h3>Reputation Data</h3>
                <div className="ioc-list">
                  <div className="ioc-item">
                    <span className="ioc-label">Reputation:</span>
                    <span className={`ioc-value reputation ${attackData.iocData.reputation.toLowerCase()}`}>
                      {attackData.iocData.reputation}
                    </span>
                  </div>
                  <div className="ioc-item">
                    <span className="ioc-label">Geolocation:</span>
                    <span className="ioc-value">{attackData.iocData.geolocation}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttackDetail; 