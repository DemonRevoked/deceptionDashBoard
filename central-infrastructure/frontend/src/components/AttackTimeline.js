import React, { useState } from 'react';
import './AttackTimeline.css';

const AttackTimeline = ({ attackerIP, attackPath, onStepClick }) => {
  const [expandedSteps, setExpandedSteps] = useState(new Set());

  const toggleStep = (stepId) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const getStepIcon = (attackType) => {
    switch (attackType) {
      case 'port_scan': return '🎯';
      case 'nmap_detection': return '👁️';
      case 'ping_sweep': return '📡';
      case 'service_access': return '🛡️';
      case 'syn_scan': return '⚡';
      case 'udp_scan': return '⚡';
      case 'ssh_attempt': return '🔐';
      case 'ftp_attempt': return '📁';
      case 'http_attempt': return '🌐';
      case 'telnet_attempt': return '📞';
      case 's7_attack': return '🏭';
      case 'dcs_attack': return '⚙️';
      default: return '⚠️';
    }
  };

  const getStepColor = (platform) => {
    switch (platform) {
      case 'Network': return 'network';
      case 'IT': return 'it';
      case 'OT': return 'ot';
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

  const getStepDetails = (attack) => {
    const details = [];
    
    if (attack.alertType === 'port_scan' && attack.details) {
      details.push(`Ports: ${attack.details.ports?.join(', ') || 'Unknown'}`);
      details.push(`Scan Type: ${attack.details.scanType || 'Unknown'}`);
      details.push(`Duration: ${attack.details.duration || 'Unknown'}`);
    }
    
    if (attack.alertType === 'nmap_detection' && attack.details) {
      details.push(`Nmap Version: ${attack.details.nmapVersion || 'Unknown'}`);
      details.push(`Scan Flags: ${attack.details.scanFlags || 'Unknown'}`);
      details.push(`Target Ports: ${attack.details.targetPorts || 'Unknown'}`);
    }
    
    if (attack.alertType === 'service_access' && attack.details) {
      details.push(`Service: ${attack.details.service || 'Unknown'}`);
      details.push(`Port: ${attack.details.port || 'Unknown'}`);
      details.push(`Attempts: ${attack.details.attempts || 'Unknown'}`);
      if (attack.details.credentials) {
        details.push(`Credentials: ${attack.details.credentials.join(', ')}`);
      }
    }

    if (attack.type === 'ssh_attempt') {
      details.push(`Username: ${attack.username || 'Unknown'}`);
      details.push(`Password: ${attack.password || 'Unknown'}`);
      details.push(`Commands: ${attack.commands?.length || 0} executed`);
    }

    if (attack.type === 'ftp_attempt') {
      details.push(`Username: ${attack.username || 'Unknown'}`);
      details.push(`Password: ${attack.password || 'Unknown'}`);
      details.push(`Files Accessed: ${attack.filesAccessed?.length || 0}`);
    }

    return details;
  };

  // Flatten all attacks into a single timeline
  const timelineSteps = [];
  attackPath.forEach((path, pathIndex) => {
    path.attacks.forEach((attack, attackIndex) => {
      timelineSteps.push({
        id: `${pathIndex}-${attackIndex}`,
        platform: path.platform,
        attack: attack,
        icon: path.icon,
        color: path.color,
        timestamp: attack.timestamp,
        attackType: attack.alertType || attack.type
      });
    });
  });

  // Sort by timestamp
  timelineSteps.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return (
    <div className="attack-timeline">
      <div className="timeline-header">
        <h3>Attack Timeline: {attackerIP}</h3>
        <p>Complete attack path with {timelineSteps.length} steps across {attackPath.length} platforms</p>
      </div>

      <div className="timeline-container">
        {timelineSteps.map((step, index) => (
          <div key={step.id} className={`timeline-step ${step.color}`}>
            {/* Timeline connector */}
            {index > 0 && <div className="timeline-connector" />}
            
            {/* Step marker */}
            <div className="step-marker">
              <div className="step-icon">{getStepIcon(step.attackType)}</div>
              <div className="step-number">{index + 1}</div>
            </div>

            {/* Step content */}
            <div className="step-content">
              <div className="step-header" onClick={() => toggleStep(step.id)}>
                <div className="step-info">
                  <span className="step-platform">{step.platform}</span>
                  <span className="step-type">{step.attackType?.replace('_', ' ')}</span>
                  <span className="step-time">{formatTimestamp(step.timestamp)}</span>
                </div>
                <div className="step-actions">
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStepClick(step);
                    }}
                  >
                    🔍 View Details
                  </button>
                  <button className="btn btn-secondary btn-sm">
                    {expandedSteps.has(step.id) ? '▼' : '▶'}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {expandedSteps.has(step.id) && (
                <div className="step-details">
                  <div className="details-grid">
                    {getStepDetails(step.attack).map((detail, detailIndex) => (
                      <div key={detailIndex} className="detail-item">
                        <span className="detail-label">{detail.split(':')[0]}:</span>
                        <span className="detail-value">{detail.split(':').slice(1).join(':')}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="step-actions-expanded">
                    <button 
                      className="btn btn-primary"
                      onClick={() => onStepClick(step)}
                    >
                      📊 Full Analysis
                    </button>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => onStepClick({ ...step, view: 'logs' })}
                    >
                      📋 View Logs
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Timeline summary */}
      <div className="timeline-summary">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">Total Steps:</span>
            <span className="stat-value">{timelineSteps.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Platforms:</span>
            <span className="stat-value">{attackPath.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Duration:</span>
            <span className="stat-value">
              {timelineSteps.length > 1 
                ? `${Math.round((new Date(timelineSteps[timelineSteps.length - 1].timestamp) - new Date(timelineSteps[0].timestamp)) / 60000)}m`
                : 'N/A'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttackTimeline; 