import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import HealthStatus from '../HealthStatus';
import './TopBar.css';

const TopBar = ({ onNotificationToggle }) => {
  const { user, logout } = useAuth();

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <div className="breadcrumb">
          {/* Breadcrumb will be populated by pages */}
        </div>
      </div>

      <div className="top-bar-center">
        <div className="project-title">
          <h1 className="main-title">DHRUV</h1>
          <p className="project-subtitle">Deceptive Honeypot Radar Unit for Vigilance</p>
        </div>
      </div>

      <div className="top-bar-right">
        <HealthStatus compact={true} />
        
        <button 
          className="notification-btn"
          onClick={onNotificationToggle}
          aria-label="Open notifications"
        >
          <span className="notification-icon">🔔</span>
          <span className="notification-badge">3</span>
        </button>

        <div className="user-menu">
          <div className="user-info">
            <span className="user-name">{user?.username || 'User'}</span>
            <span className="user-role">{user?.role || 'viewer'}</span>
          </div>
          <button 
            className="logout-btn"
            onClick={logout}
            aria-label="Logout"
          >
            🚪
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
