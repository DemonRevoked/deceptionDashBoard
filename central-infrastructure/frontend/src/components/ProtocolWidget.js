import React from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import './ProtocolWidget.css';

const ProtocolWidget = ({ threatStats, loading = false }) => {
  if (loading) {
    return (
      <div className="protocol-widget loading">
        <div className="widget-header">
          <h3>Protocol Analysis</h3>
        </div>
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading protocol data...</p>
        </div>
      </div>
    );
  }

  if (!threatStats || !threatStats.byProtocol || Object.keys(threatStats.byProtocol).length === 0) {
    return (
      <div className="protocol-widget empty">
        <div className="widget-header">
          <h3>Protocol Analysis</h3>
        </div>
        <div className="empty-state">
          <span className="empty-icon">📊</span>
          <p>No protocol data available</p>
        </div>
      </div>
    );
  }

  const protocols = threatStats.byProtocol;
  const totalEvents = Object.values(protocols).reduce((sum, count) => sum + count, 0);

  // Prepare chart data
  const chartData = {
    labels: Object.keys(protocols),
    datasets: [{
      data: Object.values(protocols),
      backgroundColor: [
        '#dc3545', // Red - HTTPS
        '#ffc107', // Yellow - SSH
        '#28a745', // Green - FTP
        '#17a2b8', // Cyan - Telnet
        '#6f42c1', // Purple - HTTP
        '#fd7e14', // Orange - Other
        '#20c997', // Teal
        '#6610f2'  // Indigo
      ],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#cbd5e1',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const percentage = ((context.parsed / totalEvents) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          }
        }
      }
    },
    layout: {
      padding: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20
      }
    }
  };

  // Calculate protocol statistics
  const protocolStats = Object.entries(protocols)
    .sort(([,a], [,b]) => b - a)
    .map(([protocol, count]) => ({
      protocol,
      count,
      percentage: ((count / totalEvents) * 100).toFixed(1)
    }));

  const topProtocol = protocolStats[0];

  return (
    <div className="protocol-widget">
      <div className="widget-header">
        <h3>Protocol Analysis</h3>
        <div className="widget-stats">
          <span className="total-protocols">{Object.keys(protocols).length} protocols</span>
          <span className="total-events">{totalEvents} events</span>
        </div>
      </div>

      <div className="widget-content">
        {/* Top Section: Chart and Primary Stats */}
        <div className="top-section">
          <div className="chart-section">
            <div className="chart-container">
              <Doughnut data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="primary-stats">
            <div className="primary-stat">
              <div className="stat-label">Most Targeted</div>
              <div className="stat-value">
                <span className="protocol-name">{topProtocol?.protocol?.toUpperCase() || 'N/A'}</span>
                <span className="protocol-count">{topProtocol?.count || 0} events</span>
              </div>
            </div>
            
            <div className="quick-stats">
              <div className="quick-stat">
                <span className="quick-label">Total Events</span>
                <span className="quick-value">{totalEvents}</span>
              </div>
              <div className="quick-stat">
                <span className="quick-label">Active Protocols</span>
                <span className="quick-value">{Object.keys(protocols).length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section: Protocol Breakdown */}
        <div className="protocol-breakdown-section">
          <h4>Protocol Distribution</h4>
          <div className="protocol-breakdown">
            {protocolStats.slice(0, 4).map((stat, index) => (
              <div key={stat.protocol} className="protocol-item">
                <div className="protocol-info">
                  <span className="protocol-label">{stat.protocol.toUpperCase()}</span>
                  <span className="protocol-percentage">{stat.percentage}%</span>
                </div>
                <div className="protocol-bar">
                  <div 
                    className="protocol-fill" 
                    style={{ 
                      width: `${stat.percentage}%`,
                      backgroundColor: chartData.datasets[0].backgroundColor[index]
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section: Security Insights */}
        <div className="security-insights-section">
          <h4>Security Insights</h4>
          <div className="insights-list">
            {getSecurityInsights(protocolStats).map((insight, index) => (
              <div key={index} className={`insight-item ${insight.severity}`}>
                <span className="insight-icon">{insight.icon}</span>
                <span className="insight-text">{insight.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Generate security insights based on protocol data
const getSecurityInsights = (protocolStats) => {
  const insights = [];
  
  if (protocolStats.length === 0) return insights;
  
  const topProtocol = protocolStats[0];
  const sshAttacks = protocolStats.find(p => p.protocol.toLowerCase() === 'ssh');
  const httpsAttacks = protocolStats.find(p => p.protocol.toLowerCase() === 'https');
  const ftpAttacks = protocolStats.find(p => p.protocol.toLowerCase() === 'ftp');
  
  // Top protocol insight
  if (topProtocol.percentage > 50) {
    insights.push({
      severity: 'high',
      icon: '⚠️',
      text: `${topProtocol.protocol.toUpperCase()} is heavily targeted (${topProtocol.percentage}%)`
    });
  } else {
    insights.push({
      severity: 'info',
      icon: 'ℹ️',
      text: `${topProtocol.protocol.toUpperCase()} is most targeted protocol`
    });
  }
  
  // SSH specific insights
  if (sshAttacks && sshAttacks.percentage > 20) {
    insights.push({
      severity: 'medium',
      icon: '🔑',
      text: `High SSH brute force activity detected`
    });
  }
  
  // HTTPS specific insights
  if (httpsAttacks && httpsAttacks.percentage > 30) {
    insights.push({
      severity: 'medium',
      icon: '🌐',
      text: `Significant web service reconnaissance`
    });
  }
  
  // FTP specific insights
  if (ftpAttacks && ftpAttacks.percentage > 15) {
    insights.push({
      severity: 'medium',
      icon: '📁',
      text: `FTP service being actively probed`
    });
  }
  
  // Diversity insight
  if (protocolStats.length >= 4) {
    insights.push({
      severity: 'info',
      icon: '🎯',
      text: `Multi-protocol attack pattern detected`
    });
  }
  
  return insights.slice(0, 3); // Limit to 3 insights
};

export default ProtocolWidget;
