import React, { useState, useEffect } from 'react';
import './NotificationCenter.css';

const NotificationCenter = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'critical',
      title: 'High Severity Attack Detected',
      message: 'Multiple SSH brute force attempts from 192.168.1.100',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      read: false,
      actions: ['Block IP', 'Investigate']
    },
    {
      id: 2,
      type: 'warning',
      title: 'New IOC Identified',
      message: 'Suspicious domain contacted: malicious-domain.com',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      read: false,
      actions: ['Add to Blacklist', 'View Details']
    },
    {
      id: 3,
      type: 'info',
      title: 'Client Reconnected',
      message: 'Client-A has reconnected after 10 minutes offline',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      read: true,
      actions: ['View Status']
    }
  ]);

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = Math.floor((now - timestamp) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      default: return '📢';
    }
  };

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="notification-center">
      <div className="notification-header">
        <div className="header-content">
          <h3>Notifications</h3>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </div>
        <div className="header-actions">
          {unreadCount > 0 && (
            <button 
              className="mark-all-read"
              onClick={markAllAsRead}
            >
              Mark all read
            </button>
          )}
          <button 
            className="close-btn"
            onClick={onClose}
            aria-label="Close notifications"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🔔</span>
            <p>No notifications</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${notification.type} ${notification.read ? 'read' : 'unread'}`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="notification-content">
                <div className="notification-header-item">
                  <span className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <span className="notification-title">
                    {notification.title}
                  </span>
                  <span className="notification-time">
                    {formatTimestamp(notification.timestamp)}
                  </span>
                </div>
                <p className="notification-message">
                  {notification.message}
                </p>
                {notification.actions && (
                  <div className="notification-actions">
                    {notification.actions.map((action, index) => (
                      <button
                        key={index}
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle action
                        }}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {!notification.read && (
                <div className="unread-indicator"></div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="notification-footer">
        <button className="view-all-btn">
          View All Notifications
        </button>
      </div>
    </div>
  );
};

export default NotificationCenter;
