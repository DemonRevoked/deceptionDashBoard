import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import './Sidebar.css';

const Sidebar = ({ collapsed, onToggle }) => {
  const { user } = useAuth();
  const location = useLocation();

  const navigationItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: '🎯',
      path: '/',
      roles: ['admin', 'operator', 'viewer'],
      status: 'active'
    },
    {
      id: 'threats',
      label: 'Threats',
      icon: '⚠️',
      path: '/threats',
      roles: ['admin', 'operator', 'viewer'],
      status: 'active',
      children: [
        { label: 'Alerts', path: '/threats/alerts', icon: '🚨', status: 'active' },
        { label: 'IOCs', path: '/threats/iocs', icon: '🔍', status: 'coming-soon' },
        { label: 'TTPs', path: '/threats/ttps', icon: '🎪', status: 'active' },
        { label: 'Campaigns', path: '/threats/campaigns', icon: '📊', status: 'coming-soon' }
      ]
    },
    {
      id: 'intelligence',
      label: 'Intelligence',
      icon: '🧠',
      path: '/intelligence',
      roles: ['admin', 'operator', 'viewer'],
      status: 'coming-soon',
      children: [
        { label: 'Analysis', path: '/intelligence/analysis', icon: '📈', status: 'coming-soon' },
        { label: 'Patterns', path: '/intelligence/patterns', icon: '🔗', status: 'coming-soon' },
        { label: 'Attribution', path: '/intelligence/attribution', icon: '🎭', status: 'coming-soon' }
      ]
    },
    {
      id: 'sensors',
      label: 'Sensors',
      icon: '📡',
      path: '/sensors',
      roles: ['admin', 'operator', 'viewer'],
      status: 'coming-soon',
      children: [
        { label: 'Clients', path: '/sensors/clients', icon: '💻', status: 'coming-soon' },
        { label: 'IT Honeypots', path: '/sensors/honeypots', icon: '🍯', status: 'active' },
        { label: 'OT Security', path: '/sensors/ot', icon: '🏭', status: 'active' },
        { label: 'Network', path: '/sensors/network', icon: '🌐', status: 'coming-soon' }
      ]
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: '⚙️',
      path: '/operations',
      roles: ['admin', 'operator'],
      status: 'coming-soon',
      children: [
        { label: 'Control', path: '/operations/control', icon: '🎮', status: 'active' },
        { label: 'Status', path: '/operations/status', icon: '📊', status: 'active' },
        { label: 'Logs', path: '/operations/logs', icon: '📝', status: 'coming-soon' }
      ]
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: '📋',
      path: '/reports',
      roles: ['admin', 'operator', 'viewer'],
      status: 'coming-soon'
    },
    {
      id: 'admin',
      label: 'Admin',
      icon: '👑',
      path: '/admin',
      roles: ['admin'],
      status: 'coming-soon',
      children: [
        { label: 'Users', path: '/admin/users', icon: '👥', status: 'coming-soon' },
        { label: 'Settings', path: '/admin/settings', icon: '⚙️', status: 'coming-soon' },
        { label: 'Audit', path: '/admin/audit', icon: '📚', status: 'coming-soon' }
      ]
    }
  ];

  const hasPermission = (item) => {
    if (!user?.role) return true; // Allow if no role checking
    return item.roles.includes(user.role);
  };

  const isActivePath = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">🛡️</span>
        </div>
        <button 
          className="collapse-btn" 
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navigationItems.filter(hasPermission).map((item) => (
          <div key={item.id} className="nav-section">
            <NavLink
              to={item.path}
              className={`nav-item ${isActivePath(item.path) ? 'active' : ''} ${item.status === 'coming-soon' ? 'coming-soon' : ''}`}
              title={collapsed ? item.label : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="nav-label">{item.label}</span>
                  {item.status === 'coming-soon' && (
                    <span className="status-badge coming-soon">🚧</span>
                  )}
                </>
              )}
            </NavLink>
            
            {!collapsed && item.children && isActivePath(item.path) && (
              <div className="nav-children">
                {item.children.map((child) => (
                  <NavLink
                    key={child.path}
                    to={child.path}
                    className={`nav-child ${location.pathname === child.path ? 'active' : ''} ${child.status === 'coming-soon' ? 'coming-soon' : ''}`}
                  >
                    <span className="nav-icon">{child.icon}</span>
                    <span className="nav-label">{child.label}</span>
                    {child.status === 'coming-soon' && (
                      <span className="status-badge coming-soon">🚧</span>
                    )}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && (
          <div className="user-info">
            <span className="user-role">{user?.role || 'viewer'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
