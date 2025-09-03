import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchHoneypots, startHoneypot, stopHoneypot, fetchHoneypotStatuses } from '../api';
import HoneypotPluginConfig from '../components/HoneypotPluginConfig';
import HealthStatus from '../components/HealthStatus';
import styles from '../styles/HoneypotControl.module.css';

export default function HoneypotControl() {
  const [honeypots, setHoneypots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [showPluginConfig, setShowPluginConfig] = useState(false);
  const [selectedHoneypot, setSelectedHoneypot] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchHoneypots();
        setHoneypots(data);
      } catch (e) {
        setError('Failed to load honeypots');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleAction = async (id, action) => {
    setActionLoading(al => ({ ...al, [id]: true }));
    try {
      if (action === 'start') await startHoneypot(id);
      else await stopHoneypot(id);
      // Refresh list after action
      const data = await fetchHoneypots();
      setHoneypots(data);
    } catch (e) {
      alert('Action failed: ' + e.message);
    } finally {
      setActionLoading(al => ({ ...al, [id]: false }));
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
    } catch (e) {
      alert('Failed to refresh statuses');
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
    refreshStatuses();
  };

  if (loading) return <div className={styles.loading}>Loading honeypots...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
      <h2>Honeypot Control Panel</h2>
        <p>Manage and monitor your honeypot infrastructure</p>
        <div className={styles.migrationNotice}>
          <p>💡 <strong>New:</strong> We've split this page for better UX!</p>
          <div className={styles.migrationLinks}>
            <Link to="/honeypots/status" className={styles.migrationBtn}>
              📊 Status Dashboard
            </Link>
            <Link to="/honeypots/management" className={styles.migrationBtn}>
              🎛️ Management Console
            </Link>
          </div>
        </div>
      </div>

      {/* System Health Status */}
      <div className={styles.healthSection}>
        <HealthStatus showDetails={true} />
      </div>

      {/* Honeypot Controls */}
      <div className={styles.controlSection}>
        <div className={styles.controlHeader}>
          <h3>Honeypot Management</h3>
          <button 
            className={styles.refreshBtn} 
            onClick={refreshStatuses} 
            disabled={refreshing}
          >
        {refreshing ? 'Refreshing...' : 'Refresh Status'}
      </button>
        </div>

      <div className={styles.honeypotList}>
        {honeypots.map(hp => (
          <div className={styles.honeypotCard} key={hp._id}>
              <div className={styles.cardHeader}>
                <div className={styles.honeypotInfo}>
              <span className={styles.name}>{hp.name}</span>
              <span className={styles.protocol}>{hp.protocol?.toUpperCase()}</span>
            </div>
                <span className={`${styles.status} ${styles[hp.status]}`}>
                  {hp.status}
                </span>
              </div>
              
              <div className={styles.details}>
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
            </div>

            {!hp.compose_path && (
              <div className={styles.warning}>
                <span>⚠️ compose_path missing. Controls disabled.</span>
              </div>
            )}

            <div className={styles.actions}>
              <button
                onClick={() => handleAction(hp._id, 'start')}
                disabled={actionLoading[hp._id] || hp.status === 'running' || !hp.compose_path}
                className={styles.startBtn}
                  title={!hp.compose_path ? 'compose_path missing' : 'Start honeypot'}
              >
                  {actionLoading[hp._id] ? 'Starting...' : 'Start'}
              </button>
              <button
                onClick={() => handleAction(hp._id, 'stop')}
                disabled={actionLoading[hp._id] || hp.status !== 'running' || !hp.compose_path}
                className={styles.stopBtn}
                  title={!hp.compose_path ? 'compose_path missing' : 'Stop honeypot'}
              >
                  {actionLoading[hp._id] ? 'Stopping...' : 'Stop'}
              </button>
              <button
                onClick={() => openPluginConfig(hp)}
                disabled={actionLoading[hp._id]}
                className={styles.configBtn}
                title="Configure honeypot plugins and features"
              >
                ⚙️ Configure
              </button>
            </div>
          </div>
        ))}
        </div>
      </div>
      
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