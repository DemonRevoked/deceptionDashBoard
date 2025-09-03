import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  fetchHoneypots, 
  startHoneypot, 
  stopHoneypot, 
  fetchHoneypotStatuses,
  rebuildHoneypot 
} from '../api';
import HoneypotPluginConfig from '../components/HoneypotPluginConfig';
import toast from 'react-hot-toast';
import styles from '../styles/HoneypotManagement.module.css';

export default function HoneypotManagement() {
  const [honeypots, setHoneypots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [showPluginConfig, setShowPluginConfig] = useState(false);
  const [selectedHoneypot, setSelectedHoneypot] = useState(null);
  const [bulkAction, setBulkAction] = useState('');
  const [selectedHoneypots, setSelectedHoneypots] = useState(new Set());

  useEffect(() => {
    loadHoneypots();
  }, []);

  const loadHoneypots = async () => {
    try {
      setLoading(true);
      const data = await fetchHoneypots();
      setHoneypots(data);
    } catch (e) {
      setError('Failed to load honeypots: ' + e.message);
      toast.error('Failed to load honeypots');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    setActionLoading(al => ({ ...al, [id]: true }));
    try {
      if (action === 'start') {
        await startHoneypot(id);
        toast.success('Honeypot started successfully');
      } else if (action === 'stop') {
        await stopHoneypot(id);
        toast.success('Honeypot stopped successfully');
      } else if (action === 'restart') {
        await stopHoneypot(id);
        setTimeout(async () => {
          await startHoneypot(id);
          toast.success('Honeypot restarted successfully');
        }, 2000);
      } else if (action === 'rebuild') {
        await rebuildHoneypot(id);
        toast.success('Honeypot rebuild initiated');
      }
      
      // Refresh list after action
      await loadHoneypots();
    } catch (e) {
      toast.error(`${action} failed: ${e.message}`);
    } finally {
      setActionLoading(al => ({ ...al, [id]: false }));
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedHoneypots.size === 0) {
      toast.error('Please select honeypots and an action');
      return;
    }

    const promises = Array.from(selectedHoneypots).map(id => {
      if (bulkAction === 'start') return startHoneypot(id);
      if (bulkAction === 'stop') return stopHoneypot(id);
      if (bulkAction === 'rebuild') return rebuildHoneypot(id);
      return Promise.resolve();
    });

    try {
      setRefreshing(true);
      await Promise.all(promises);
      toast.success(`Bulk ${bulkAction} completed successfully`);
      setSelectedHoneypots(new Set());
      setBulkAction('');
      await loadHoneypots();
    } catch (e) {
      toast.error(`Bulk ${bulkAction} failed: ${e.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const refreshStatuses = async () => {
    setRefreshing(true);
    try {
      const statuses = await fetchHoneypotStatuses();
      setHoneypots(honeypots => honeypots.map(hp => {
        const found = statuses.find(s => s._id === hp._id);
        return found ? { ...hp, status: found.status } : hp;
      }));
      toast.success('Status refreshed');
    } catch (e) {
      toast.error('Failed to refresh statuses');
    } finally {
      setRefreshing(false);
    }
  };

  const openPluginConfig = (honeypot) => {
    setSelectedHoneypot(honeypot);
    setShowPluginConfig(true);
  };

  const closePluginConfig = () => {
    setShowPluginConfig(false);
    setSelectedHoneypot(null);
    // Refresh honeypots after plugin configuration changes
    loadHoneypots();
  };

  const toggleSelectHoneypot = (id) => {
    const newSelected = new Set(selectedHoneypots);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedHoneypots(newSelected);
  };

  const selectAllHoneypots = () => {
    const allIds = honeypots.map(hp => hp._id);
    setSelectedHoneypots(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedHoneypots(new Set());
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return '🟢';
      case 'stopped': return '🔴';
      case 'starting': return '🟡';
      case 'stopping': return '🟡';
      default: return '⚪';
    }
  };

  const getActionButtons = (honeypot) => {
    const isLoading = actionLoading[honeypot._id];
    const hasComposePath = honeypot.compose_path;
    
    return (
      <div className={styles.actionButtons}>
        <button
          onClick={() => handleAction(honeypot._id, 'start')}
          disabled={isLoading || honeypot.status === 'running' || !hasComposePath}
          className={`${styles.actionBtn} ${styles.startBtn}`}
          title={!hasComposePath ? 'compose_path missing' : 'Start honeypot'}
        >
          {isLoading ? '⏳' : '▶️'} Start
        </button>
        
        <button
          onClick={() => handleAction(honeypot._id, 'stop')}
          disabled={isLoading || honeypot.status === 'stopped' || !hasComposePath}
          className={`${styles.actionBtn} ${styles.stopBtn}`}
          title={!hasComposePath ? 'compose_path missing' : 'Stop honeypot'}
        >
          {isLoading ? '⏳' : '⏹️'} Stop
        </button>
        
        <button
          onClick={() => handleAction(honeypot._id, 'restart')}
          disabled={isLoading || !hasComposePath}
          className={`${styles.actionBtn} ${styles.restartBtn}`}
          title={!hasComposePath ? 'compose_path missing' : 'Restart honeypot'}
        >
          {isLoading ? '⏳' : '🔄'} Restart
        </button>
        
        <button
          onClick={() => openPluginConfig(honeypot)}
          disabled={isLoading}
          className={`${styles.actionBtn} ${styles.configBtn}`}
          title="Configure honeypot plugins and features"
        >
          ⚙️ Configure
        </button>
        
        <button
          onClick={() => handleAction(honeypot._id, 'rebuild')}
          disabled={isLoading || !hasComposePath}
          className={`${styles.actionBtn} ${styles.rebuildBtn}`}
          title={!hasComposePath ? 'compose_path missing' : 'Rebuild honeypot with current configuration'}
        >
          {isLoading ? '⏳' : '🔨'} Rebuild
        </button>
      </div>
    );
  };

  if (loading) return <div className={styles.loading}>Loading honeypot management...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  const runningCount = honeypots.filter(hp => hp.status === 'running').length;
  const stoppedCount = honeypots.filter(hp => hp.status === 'stopped').length;
  const totalCount = honeypots.length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>Honeypot Management Console</h2>
          <p>Configure, control, and manage your honeypot infrastructure</p>
        </div>
        <div className={styles.headerRight}>
          <Link to="/honeypots/status" className={styles.statusBtn}>
            📊 View Status Dashboard
          </Link>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🛡️</div>
          <div className={styles.statContent}>
            <h3>Total Honeypots</h3>
            <div className={styles.statValue}>{totalCount}</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🟢</div>
          <div className={styles.statContent}>
            <h3>Running</h3>
            <div className={styles.statValue}>{runningCount}</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🔴</div>
          <div className={styles.statContent}>
            <h3>Stopped</h3>
            <div className={styles.statValue}>{stoppedCount}</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📊</div>
          <div className={styles.statContent}>
            <h3>Uptime</h3>
            <div className={styles.statValue}>{Math.round((runningCount / totalCount) * 100) || 0}%</div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className={styles.bulkActions}>
        <div className={styles.bulkActionsLeft}>
          <button 
            onClick={selectAllHoneypots} 
            className={styles.selectAllBtn}
            disabled={honeypots.length === 0}
          >
            Select All
          </button>
          <button 
            onClick={clearSelection} 
            className={styles.clearBtn}
            disabled={selectedHoneypots.size === 0}
          >
            Clear ({selectedHoneypots.size})
          </button>
        </div>
        
        <div className={styles.bulkActionsRight}>
          <select 
            value={bulkAction} 
            onChange={(e) => setBulkAction(e.target.value)}
            className={styles.bulkSelect}
          >
            <option value="">Bulk Action...</option>
            <option value="start">Start Selected</option>
            <option value="stop">Stop Selected</option>
            <option value="rebuild">Rebuild Selected</option>
          </select>
          <button 
            onClick={handleBulkAction}
            disabled={!bulkAction || selectedHoneypots.size === 0 || refreshing}
            className={styles.bulkBtn}
          >
            {refreshing ? 'Processing...' : 'Execute'}
          </button>
          <button 
            onClick={refreshStatuses} 
            disabled={refreshing}
            className={styles.refreshBtn}
          >
            {refreshing ? '⏳ Refreshing...' : '🔄 Refresh All'}
          </button>
        </div>
      </div>

      {/* Honeypots Management Grid */}
      <div className={styles.managementSection}>
        <div className={styles.sectionHeader}>
          <h3>Honeypot Infrastructure Management</h3>
          <span className={styles.sectionSubtitle}>
            Configure and control individual honeypot instances
          </span>
        </div>

        <div className={styles.honeypotGrid}>
          {honeypots.map(hp => (
            <div key={hp._id} className={styles.honeypotCard}>
              {/* Card Header with Selection */}
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                  <input
                    type="checkbox"
                    checked={selectedHoneypots.has(hp._id)}
                    onChange={() => toggleSelectHoneypot(hp._id)}
                    className={styles.honeypotCheckbox}
                  />
                  <div className={styles.honeypotInfo}>
                    <span className={styles.name}>{hp.name}</span>
                    <span className={styles.protocol}>{hp.protocol?.toUpperCase()}</span>
                  </div>
                </div>
                <div className={styles.cardHeaderRight}>
                  <span className={styles.statusIcon}>{getStatusIcon(hp.status)}</span>
                  <span className={`${styles.status} ${styles[hp.status]}`}>
                    {hp.status.toUpperCase()}
                  </span>
                </div>
              </div>
              
              {/* Configuration Details */}
              <div className={styles.configDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Type:</span>
                  <span className={styles.value}>{hp.type}</span>
                </div>
                {hp.host && hp.port && (
                  <div className={styles.detailRow}>
                    <span className={styles.label}>Address:</span>
                    <span className={styles.value}>{hp.host}:{hp.port}</span>
                  </div>
                )}
                {hp.last_heartbeat && (
                  <div className={styles.detailRow}>
                    <span className={styles.label}>Last Heartbeat:</span>
                    <span className={styles.value}>
                      {new Date(hp.last_heartbeat).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className={styles.detailRow}>
                  <span className={styles.label}>Compose Path:</span>
                  <span className={`${styles.value} ${!hp.compose_path ? styles.missing : ''}`}>
                    {hp.compose_path || 'Not configured'}
                  </span>
                </div>
              </div>

              {/* Warning for missing compose_path */}
              {!hp.compose_path && (
                <div className={styles.warning}>
                  <span>⚠️ Missing compose_path - Controls disabled</span>
                </div>
              )}

              {/* Action Buttons */}
              {getActionButtons(hp)}

              {/* Quick Links */}
              <div className={styles.quickLinks}>
                <Link to={`/honeypot/${hp._id}`} className={styles.quickLink}>
                  📊 View Details
                </Link>
                <Link to="/honeypots/status" className={styles.quickLink}>
                  📈 Status Dashboard
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Management Tools */}
      <div className={styles.advancedSection}>
        <h3>Advanced Management Tools</h3>
        <div className={styles.advancedGrid}>
          <div className={styles.toolCard}>
            <div className={styles.toolIcon}>🔧</div>
            <div className={styles.toolContent}>
              <h4>Global Configuration</h4>
              <p>Manage global honeypot settings and defaults</p>
              <button className={styles.toolBtn} disabled>
                Coming Soon
              </button>
            </div>
          </div>
          
          <div className={styles.toolCard}>
            <div className={styles.toolIcon}>📦</div>
            <div className={styles.toolContent}>
              <h4>Backup & Restore</h4>
              <p>Export and import honeypot configurations</p>
              <button className={styles.toolBtn} disabled>
                Coming Soon
              </button>
            </div>
          </div>
          
          <div className={styles.toolCard}>
            <div className={styles.toolIcon}>🚀</div>
            <div className={styles.toolContent}>
              <h4>Auto-Deploy</h4>
              <p>Automatically deploy new honeypot instances</p>
              <button className={styles.toolBtn} disabled>
                Coming Soon
              </button>
            </div>
          </div>
          
          <div className={styles.toolCard}>
            <div className={styles.toolIcon}>📋</div>
            <div className={styles.toolContent}>
              <h4>Health Reports</h4>
              <p>Generate comprehensive health and performance reports</p>
              <Link to="/honeypots/status" className={styles.toolBtn}>
                View Reports
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Plugin Configuration Modal */}
      {showPluginConfig && selectedHoneypot && (
        <HoneypotPluginConfig
          honeypotId={selectedHoneypot._id}
          honeypotName={selectedHoneypot.name}
          onClose={closePluginConfig}
        />
      )}
    </div>
  );
} 