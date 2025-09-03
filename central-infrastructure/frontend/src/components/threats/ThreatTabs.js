import React from 'react';
import './ThreatTabs.css';

const ThreatTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    {
      id: 'alerts',
      label: 'Alerts',
      icon: '🚨',
      description: 'Security alerts and events'
    },
    {
      id: 'iocs',
      label: 'IOCs',
      icon: '🔍',
      description: 'Indicators of Compromise'
    },
    {
      id: 'ttps',
      label: 'TTPs',
      icon: '🎪',
      description: 'Tactics, Techniques & Procedures'
    },
    {
      id: 'campaigns',
      label: 'Campaigns',
      icon: '📊',
      description: 'Correlated attack campaigns'
    }
  ];

  return (
    <div className="threat-tabs">
      <div className="tabs-container">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <div className="tab-content">
              <span className="tab-label">{tab.label}</span>
              <span className="tab-description">{tab.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThreatTabs;
