import React, { useState, useEffect } from 'react';
import { fetchHoneypotPlugins, updateHoneypotPlugins } from '../api';
import styles from '../styles/HoneypotPluginConfig.module.css';

export default function HoneypotPluginConfig({ honeypotId, honeypotName, onClose }) {
  const [plugins, setPlugins] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPlugins();
  }, [honeypotId]);

  const loadPlugins = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchHoneypotPlugins(honeypotId);
      setPlugins(data.available_plugins || {});
    } catch (error) {
      console.error('Failed to load plugins:', error);
      setError('Failed to load plugin configuration. This honeypot may not support plugin management.');
    } finally {
      setLoading(false);
    }
  };

  const togglePlugin = (pluginName) => {
    setPlugins(prev => ({
      ...prev,
      [pluginName]: {
        ...prev[pluginName],
        enabled: !prev[pluginName].enabled
      }
    }));
  };

  // Removed updatePluginConfig - we only need enable/disable now

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      const enabledPlugins = Object.keys(plugins).filter(p => plugins[p].enabled);

      await updateHoneypotPlugins(honeypotId, {
        enabled_plugins: enabledPlugins
      });

      alert('Configuration saved! Honeypot will be rebuilt with selected features.');
      onClose();
    } catch (error) {
      alert('Failed to save configuration: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getEnabledCount = () => {
    return Object.values(plugins).filter(p => p.enabled).length;
  };

  const getTotalCount = () => {
    return Object.keys(plugins).length;
  };

  if (loading) {
    return (
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.loading}>Loading plugin configuration...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.header}>
            <h3>Plugin Configuration</h3>
            <button onClick={onClose} className={styles.closeBtn}>×</button>
          </div>
          <div className={styles.error}>{error}</div>
          <div className={styles.actions}>
            <button onClick={onClose} className={styles.cancelBtn}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <div className={styles.header}>
          <h3>Configure {honeypotName} Plugins</h3>
          <button onClick={onClose} className={styles.closeBtn}>×</button>
        </div>
        
        <div className={styles.summary}>
          <span className={styles.summaryText}>
            {getEnabledCount()} of {getTotalCount()} plugins enabled
          </span>
        </div>

        <div className={styles.pluginList}>
          {Object.entries(plugins).map(([pluginName, plugin]) => (
            <div key={pluginName} className={`${styles.pluginItem} ${plugin.enabled ? styles.enabled : styles.disabled}`}>
              <label className={styles.pluginToggle}>
                <input
                  type="checkbox"
                  checked={plugin.enabled || false}
                  onChange={() => togglePlugin(pluginName)}
                  className={styles.checkbox}
                />
                <div className={styles.pluginInfo}>
                  <div className={styles.pluginHeader}>
                    <span className={styles.pluginName}>{plugin.name || pluginName}</span>
                    <span className={`${styles.status} ${plugin.enabled ? styles.statusEnabled : styles.statusDisabled}`}>
                      {plugin.enabled ? '✓' : '○'}
                    </span>
                  </div>
                  
                  {plugin.description && (
                    <p className={styles.pluginDescription}>{plugin.description}</p>
                  )}
                  
                  {plugin.features && plugin.features.length > 0 && (
                    <div className={styles.pluginFeatures}>
                      <strong>Detects:</strong> {plugin.features.map(f => f.replace(/_/g, ' ')).join(', ')}
                    </div>
                  )}
                </div>
              </label>
            </div>
          ))}
        </div>
        
        <div className={styles.actions}>
          <button onClick={onClose} className={styles.cancelBtn}>
            Cancel
          </button>
          <button 
            onClick={saveConfiguration} 
            disabled={saving}
            className={styles.saveBtn}
          >
            {saving ? 'Rebuilding...' : 'Save & Apply Configuration'}
          </button>
        </div>
        
        <div className={styles.note}>
          <p>⚠️ Saving will rebuild and restart the honeypot with selected features.</p>
          <p>💡 Choose features based on the attack types you want to detect.</p>
        </div>
      </div>
    </div>
  );
} 