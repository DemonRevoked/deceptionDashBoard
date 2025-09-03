import React from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import './NmapDetectionWidget.css';

const NmapDetectionWidget = ({ threatStats, combinedEvents = [], loading = false }) => {
  if (loading) {
    return (
      <div className="nmap-widget loading">
        <div className="widget-header">
          <h3>Nmap Detection Analysis</h3>
        </div>
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading Nmap data...</p>
        </div>
      </div>
    );
  }

  // Filter Nmap-related events
  const nmapEvents = combinedEvents.filter(event => 
    event.event_type?.includes('nmap') || 
    event.scan_type ||
    event.user_agent?.toLowerCase().includes('nmap')
  );

  if (nmapEvents.length === 0) {
    return (
      <div className="nmap-widget empty">
        <div className="widget-header">
          <h3>Nmap Detection Analysis</h3>
        </div>
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <p>No Nmap scans detected</p>
        </div>
      </div>
    );
  }

  // Analyze scan types
  const scanTypes = {};
  const scanMethods = {};
  const timeDistribution = {};
  const sourceIPs = {};

  nmapEvents.forEach(event => {
    // Scan types
    const scanType = event.scan_type || 'unknown';
    scanTypes[scanType] = (scanTypes[scanType] || 0) + 1;

    // Scan methods (from event_type)
    const method = event.event_type || 'unknown';
    scanMethods[method] = (scanMethods[method] || 0) + 1;

    // Time distribution (last 24 hours)
    const eventTime = new Date(event.timestamp);
    const hour = eventTime.getHours();
    timeDistribution[hour] = (timeDistribution[hour] || 0) + 1;

    // Source IPs
    if (event.source_ip) {
      sourceIPs[event.source_ip] = (sourceIPs[event.source_ip] || 0) + 1;
    }
  });

  // Prepare scan types chart data
  const scanTypesData = {
    labels: Object.keys(scanTypes).map(type => 
      type.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    ),
    datasets: [{
      data: Object.values(scanTypes),
      backgroundColor: [
        '#dc3545', // Red
        '#ffc107', // Yellow
        '#28a745', // Green
        '#17a2b8', // Cyan
        '#6f42c1', // Purple
        '#fd7e14'  // Orange
      ],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  // Prepare time distribution chart data
  const hours = Array.from({length: 24}, (_, i) => i);
  const timeData = {
    labels: hours.map(h => `${h}:00`),
    datasets: [{
      label: 'Nmap Scans',
      data: hours.map(h => timeDistribution[h] || 0),
      backgroundColor: 'rgba(220, 53, 69, 0.8)',
      borderColor: '#dc3545',
      borderWidth: 1
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        ticks: { 
          color: '#64748b',
          maxTicksLimit: 12
        },
        grid: { color: '#334155' }
      },
      y: {
        ticks: { color: '#64748b' },
        grid: { color: '#334155' }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#cbd5e1',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 10,
          font: { size: 11 }
        }
      }
    }
  };

  // Calculate statistics
  const totalScans = nmapEvents.length;
  const uniqueIPs = Object.keys(sourceIPs).length;
  const avgScansPerIP = (totalScans / uniqueIPs).toFixed(1);
  const topScanner = Object.entries(sourceIPs)
    .sort(([,a], [,b]) => b - a)[0];

  // Recent activity (last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentScans = nmapEvents.filter(event => 
    new Date(event.timestamp) > oneHourAgo
  ).length;

  // Threat level assessment
  const getThreatLevel = () => {
    if (totalScans > 50) return { level: 'high', color: '#dc3545', text: 'High' };
    if (totalScans > 20) return { level: 'medium', color: '#ffc107', text: 'Medium' };
    if (totalScans > 5) return { level: 'low', color: '#28a745', text: 'Low' };
    return { level: 'minimal', color: '#6c757d', text: 'Minimal' };
  };

  const threatLevel = getThreatLevel();

  return (
    <div className="nmap-widget">
      <div className="widget-header">
        <h3>Nmap Detection Analysis</h3>
        <div className="widget-stats">
          <span className={`threat-level ${threatLevel.level}`} style={{color: threatLevel.color}}>
            {threatLevel.text} Activity
          </span>
          <span className="total-scans">{totalScans} scans</span>
        </div>
      </div>

      <div className="widget-content">
        {/* Top Section: Summary Statistics */}
        <div className="summary-section">
          <h4>Scan Overview</h4>
          <div className="summary-stats">
            <div className="stat-card primary">
              <div className="stat-value">{totalScans}</div>
              <div className="stat-label">Total Scans</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{uniqueIPs}</div>
              <div className="stat-label">Unique IPs</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{avgScansPerIP}</div>
              <div className="stat-label">Avg/IP</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{recentScans}</div>
              <div className="stat-label">Last Hour</div>
            </div>
          </div>
        </div>

        {/* Middle Section: Charts */}
        <div className="charts-section">
          <div className="chart-item">
            <h4>Scan Types Distribution</h4>
            <div className="chart-container small">
              <Doughnut data={scanTypesData} options={doughnutOptions} />
            </div>
          </div>

          <div className="chart-item">
            <h4>24-Hour Activity Timeline</h4>
            <div className="chart-container">
              <Bar data={timeData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Bottom Section: Details and Insights */}
        <div className="details-section">
          <div className="detail-item">
            <h4>Top Scanner</h4>
            {topScanner ? (
              <div className="scanner-info">
                <span className="scanner-ip">{topScanner[0]}</span>
                <span className="scanner-count">{topScanner[1]} scans</span>
              </div>
            ) : (
              <span className="no-data">No data</span>
            )}
          </div>

          <div className="detail-item">
            <h4>Detection Signatures</h4>
            <div className="signatures-list">
              {Object.entries(scanTypes).slice(0, 3).map(([type, count]) => (
                <div key={type} className="signature-item">
                  <span className="signature-name">
                    {type.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <span className="signature-count">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="detail-item">
            <h4>Threat Indicators</h4>
            <div className="indicators-list">
              {getThreatIndicators(nmapEvents, threatLevel.level).map((indicator, index) => (
                <div key={index} className={`indicator-item ${indicator.severity}`}>
                  <span className="indicator-icon">{indicator.icon}</span>
                  <span className="indicator-text">{indicator.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Generate threat indicators based on Nmap activity
const getThreatIndicators = (nmapEvents, threatLevel) => {
  const indicators = [];
  
  // Aggressive scans
  const aggressiveScans = nmapEvents.filter(e => 
    e.event_type === 'nmap_aggressive' || 
    e.scan_type?.toLowerCase().includes('aggressive')
  ).length;
  
  if (aggressiveScans > 0) {
    indicators.push({
      severity: 'high',
      icon: '⚠️',
      text: `${aggressiveScans} aggressive scan(s) detected`
    });
  }

  // Reconnaissance patterns
  const reconScans = nmapEvents.filter(e => 
    e.event_type === 'nmap_recon' || 
    e.scan_type?.toLowerCase().includes('recon')
  ).length;
  
  if (reconScans > 10) {
    indicators.push({
      severity: 'medium',
      icon: '🔍',
      text: `High reconnaissance activity (${reconScans} scans)`
    });
  }

  // Repeated targeting
  const uniqueIPs = [...new Set(nmapEvents.map(e => e.source_ip))];
  if (nmapEvents.length / uniqueIPs.length > 5) {
    indicators.push({
      severity: 'medium',
      icon: '🎯',
      text: 'Repeated targeting from same sources'
    });
  }

  // Recent activity spike
  const lastHour = nmapEvents.filter(e => 
    new Date(e.timestamp) > new Date(Date.now() - 60 * 60 * 1000)
  ).length;
  
  if (lastHour > 5) {
    indicators.push({
      severity: 'high',
      icon: '📈',
      text: `Activity spike: ${lastHour} scans in last hour`
    });
  }

  // Service enumeration
  const serviceScans = nmapEvents.filter(e => 
    e.scan_type?.toLowerCase().includes('service') ||
    e.scan_type?.toLowerCase().includes('version')
  ).length;
  
  if (serviceScans > 0) {
    indicators.push({
      severity: 'medium',
      icon: '🔧',
      text: `${serviceScans} service enumeration attempt(s)`
    });
  }

  // Default indicator if no specific threats
  if (indicators.length === 0) {
    indicators.push({
      severity: 'info',
      icon: 'ℹ️',
      text: 'Basic reconnaissance activity detected'
    });
  }

  return indicators.slice(0, 3); // Limit to 3 indicators
};

export default NmapDetectionWidget;
