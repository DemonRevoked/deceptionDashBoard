import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchHoneypots, fetchEvents, fetchHoneypotStatuses } from '../api';
import useRealTimeEvents from '../hooks/useRealTimeEvents';
import HealthStatus from '../components/HealthStatus';
import styles from '../styles/HoneypotStatus.module.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function HoneypotStatus() {
  const [honeypots, setHoneypots] = useState([]);
  const [historicalEvents, setHistoricalEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  // Real-time events and status updates
  const { 
    events: realTimeEvents, 
    honeypotStatuses, 
    securityAlerts, 
    isConnected 
  } = useRealTimeEvents({
    maxEvents: 200,
    enableNotifications: true,
    enableSecurityAlerts: true
  });

  // Combine historical and real-time events
  const allEvents = useMemo(() => {
    const eventMap = new Map();
    
    historicalEvents.forEach(event => {
      eventMap.set(event._id, event);
    });
    
    realTimeEvents.forEach(event => {
      eventMap.set(event._id, event);
    });
    
    return Array.from(eventMap.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [historicalEvents, realTimeEvents]);

  // Update honeypot statuses with real-time data
  const updatedHoneypots = useMemo(() => {
    return honeypots.map(hp => {
      const statusUpdate = honeypotStatuses[hp._id];
      if (statusUpdate) {
        return {
          ...hp,
          status: statusUpdate.status,
          updated_at: statusUpdate.updated_at
        };
      }
      return hp;
    });
  }, [honeypots, honeypotStatuses]);

  // Analytics calculations
  const analytics = useMemo(() => {
    const now = Date.now();
    const last24Hours = allEvents.filter(e => 
      now - new Date(e.timestamp).getTime() < 24 * 60 * 60 * 1000
    ).length;
    
    const last7Days = allEvents.filter(e => 
      now - new Date(e.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000
    ).length;

    // Hourly activity for last 24 hours
    const hourlyActivity = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date().getHours() - i;
      const hourStart = new Date();
      hourStart.setHours(hour < 0 ? 24 + hour : hour, 0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hourStart.getHours() + 1);
      
      const count = allEvents.filter(e => {
        const eventTime = new Date(e.timestamp);
        return eventTime >= hourStart && eventTime < hourEnd;
      }).length;
      
      return { hour: hour < 0 ? 24 + hour : hour, count };
    }).reverse();

    // Top attacking IPs
    const ipCounts = {};
    allEvents.forEach(event => {
      if (event.source_ip) {
        ipCounts[event.source_ip] = (ipCounts[event.source_ip] || 0) + 1;
      }
    });
    const topIPs = Object.entries(ipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    // Event types distribution
    const eventTypes = {};
    allEvents.forEach(event => {
      const type = event.event_type || event.data_type || 'unknown';
      eventTypes[type] = (eventTypes[type] || 0) + 1;
    });

    // Severity distribution
    const severityCount = {
      low: allEvents.filter(e => e.severity === 'low').length,
      medium: allEvents.filter(e => e.severity === 'medium').length,
      high: allEvents.filter(e => e.severity === 'high').length,
      critical: allEvents.filter(e => e.severity === 'critical').length
    };

    return {
      last24Hours,
      last7Days,
      hourlyActivity,
      topIPs,
      eventTypes,
      severityCount,
      totalEvents: allEvents.length,
      uniqueIPs: Object.keys(ipCounts).length,
      activeHoneypots: updatedHoneypots.filter(hp => hp.status === 'running').length,
      totalHoneypots: updatedHoneypots.length
    };
  }, [allEvents, updatedHoneypots]);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const hps = await fetchHoneypots();
        setHoneypots(hps);
        
        const evs = await fetchEvents({ limit: 1000 });
        setHistoricalEvents(evs);
        
      } catch (e) {
        console.error('Error loading honeypot status data:', e);
        setError(e.message || 'Failed to load honeypot data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const refreshStatuses = async () => {
    setRefreshing(true);
    try {
      const statuses = await fetchHoneypotStatuses();
      setHoneypots(honeypots => honeypots.map(hp => {
        const found = statuses.find(s => s._id === hp._id);
        return found ? { ...hp, status: found.status } : hp;
      }));
    } catch (e) {
      setError('Failed to refresh statuses: ' + e.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Filter honeypots based on active filter
  const filteredHoneypots = useMemo(() => {
    if (activeFilter === 'all') return updatedHoneypots;
    if (activeFilter === 'running') return updatedHoneypots.filter(hp => hp.status === 'running');
    if (activeFilter === 'stopped') return updatedHoneypots.filter(hp => hp.status === 'stopped');
    return updatedHoneypots;
  }, [updatedHoneypots, activeFilter]);

  // Chart configurations
  const hourlyChartData = {
    labels: analytics.hourlyActivity.map(h => `${h.hour}:00`),
    datasets: [{
      label: 'Events per Hour',
      data: analytics.hourlyActivity.map(h => h.count),
      borderColor: '#06b6d4',
      backgroundColor: 'rgba(6, 182, 212, 0.1)',
      tension: 0.4,
      fill: true
    }]
  };

  const eventTypeChartData = {
    labels: Object.keys(analytics.eventTypes).map(type => 
      type.replace('_', ' ').toUpperCase()
    ),
    datasets: [{
      data: Object.values(analytics.eventTypes),
      backgroundColor: [
        '#06b6d4', '#10b981', '#f59e0b', '#ef4444', 
        '#8b5cf6', '#ec4899', '#84cc16', '#f97316'
      ],
      borderColor: '#1e293b',
      borderWidth: 2,
    }]
  };

  const severityChartData = {
    labels: ['Low', 'Medium', 'High', 'Critical'],
    datasets: [{
      data: [
        analytics.severityCount.low,
        analytics.severityCount.medium,
        analytics.severityCount.high,
        analytics.severityCount.critical
      ],
      backgroundColor: ['#22c55e', '#f59e0b', '#f97316', '#ef4444'],
      borderColor: '#1e293b',
      borderWidth: 2,
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
          font: { size: 12 }
        }
      }
    }
  };

  if (loading) return <div className={styles.loading}>Loading honeypot status...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>Honeypot Status Dashboard</h2>
          <p>Live monitoring and analytics for your honeypot infrastructure</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.connectionStatus}>
            <span className={`${styles.statusDot} ${isConnected ? styles.connected : styles.disconnected}`}></span>
            <span>{isConnected ? 'Real-time Connected' : 'Disconnected'}</span>
          </div>
          <Link to="/honeypots/management" className={styles.manageBtn}>
            🎛️ Manage Honeypots
          </Link>
        </div>
      </div>

      {/* System Health Status */}
      <div className={styles.healthSection}>
        <HealthStatus showDetails={true} />
      </div>

      {/* Security Alerts */}
      {securityAlerts.length > 0 && (
        <div className={styles.alertsSection}>
          <h3>🚨 Active Security Alerts</h3>
          <div className={styles.alertsList}>
            {securityAlerts.slice(0, 5).map((alert, index) => (
              <div key={index} className={`${styles.alertItem} ${styles[alert.severity] || ''}`}>
                <span className={styles.alertType}>{alert.type}</span>
                <span className={styles.alertMessage}>{alert.message}</span>
                <span className={styles.alertTime}>
                  {new Date(alert.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>🛡️</div>
          <div className={styles.metricContent}>
            <h3>Active Honeypots</h3>
            <div className={styles.metricValue}>{analytics.activeHoneypots}</div>
            <div className={styles.metricChange}>
              of {analytics.totalHoneypots} total
              {realTimeEvents.length > 0 && (
                <span className={styles.realtimeIndicator}>• Live updates</span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>⚡</div>
          <div className={styles.metricContent}>
            <h3>24h Activity</h3>
            <div className={styles.metricValue}>{analytics.last24Hours}</div>
            <div className={styles.metricChange}>
              Recent security events
              {realTimeEvents.length > 0 && (
                <span className={styles.realtimeIndicator}>• {realTimeEvents.length} new</span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>🌐</div>
          <div className={styles.metricContent}>
            <h3>Unique Attackers</h3>
            <div className={styles.metricValue}>{analytics.uniqueIPs}</div>
            <div className={styles.metricChange}>Distinct IP addresses</div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>🎯</div>
          <div className={styles.metricContent}>
            <h3>Total Events</h3>
            <div className={styles.metricValue}>{analytics.totalEvents}</div>
            <div className={styles.metricChange}>All time incidents</div>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h3>24-Hour Activity Timeline</h3>
          <div className={styles.chartContainer}>
            <Line data={hourlyChartData} options={chartOptions} />
          </div>
        </div>

        <div className={styles.chartCard}>
          <h3>Event Types Distribution</h3>
          <div className={styles.chartContainer}>
            <Pie data={eventTypeChartData} options={chartOptions} />
          </div>
        </div>

        <div className={styles.chartCard}>
          <h3>Threat Severity Levels</h3>
          <div className={styles.chartContainer}>
            <Pie data={severityChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Honeypot Status Overview */}
      <div className={styles.statusSection}>
        <div className={styles.statusHeader}>
          <h3>Honeypot Infrastructure Status</h3>
          <div className={styles.statusControls}>
            <div className={styles.filterButtons}>
              <button 
                className={`${styles.filterBtn} ${activeFilter === 'all' ? styles.active : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                All ({updatedHoneypots.length})
              </button>
              <button 
                className={`${styles.filterBtn} ${activeFilter === 'running' ? styles.active : ''}`}
                onClick={() => setActiveFilter('running')}
              >
                Running ({updatedHoneypots.filter(hp => hp.status === 'running').length})
              </button>
              <button 
                className={`${styles.filterBtn} ${activeFilter === 'stopped' ? styles.active : ''}`}
                onClick={() => setActiveFilter('stopped')}
              >
                Stopped ({updatedHoneypots.filter(hp => hp.status === 'stopped').length})
              </button>
            </div>
            <button 
              className={styles.refreshBtn} 
              onClick={refreshStatuses} 
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : '🔄 Refresh Status'}
            </button>
          </div>
        </div>

        <div className={styles.honeypotGrid}>
          {filteredHoneypots.map(hp => {
            const hpEvents = allEvents.filter(ev => ev.honeypot_id === hp._id);
            const lastEvent = hpEvents[0];
            const lastEventTime = lastEvent ? new Date(lastEvent.timestamp).toLocaleString() : 'No activity';
            const isRealTimeUpdate = honeypotStatuses[hp._id];
            const last24hEvents = hpEvents.filter(e => 
              Date.now() - new Date(e.timestamp).getTime() < 24 * 60 * 60 * 1000
            ).length;
            
            return (
              <Link to={`/honeypot/${hp._id}`} key={hp._id} className={styles.honeypotCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.honeypotInfo}>
                    <span className={styles.name}>
                      {hp.name}
                      {isRealTimeUpdate && (
                        <span className={styles.liveIndicator}>🔴 LIVE</span>
                      )}
                    </span>
                    <span className={styles.protocol}>{hp.protocol?.toUpperCase()}</span>
                  </div>
                  <span className={`${styles.status} ${styles[hp.status]}`}>
                    {hp.status.toUpperCase()}
                  </span>
                </div>
                
                <div className={styles.cardDetails}>
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
                  <div className={styles.detailRow}>
                    <span className={styles.label}>Total Events:</span>
                    <span className={styles.value}>{hpEvents.length}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.label}>24h Activity:</span>
                    <span className={styles.value}>{last24hEvents}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.label}>Last Activity:</span>
                    <span className={styles.value}>{lastEventTime}</span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.viewDetails}>View Details →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Top Threat Sources */}
      <div className={styles.threatsSection}>
        <h3>Top Threat Sources (24h)</h3>
        <div className={styles.threatsList}>
          {analytics.topIPs.slice(0, 10).map(([ip, count], index) => (
            <div key={ip} className={styles.threatItem}>
              <div className={styles.threatRank}>#{index + 1}</div>
              <div className={styles.threatInfo}>
                <span className={styles.threatIP}>{ip}</span>
                <span className={styles.threatCount}>{count} attacks</span>
              </div>
              <div className={styles.threatSeverity}>
                {count >= 50 ? '🔴' : count >= 20 ? '🟡' : '🟢'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Events */}
      <div className={styles.eventsSection}>
        <div className={styles.eventsHeader}>
          <h3>Recent Security Events</h3>
          <div className={styles.eventsControls}>
            {realTimeEvents.length > 0 && (
              <span className={styles.newEventsCounter}>
                {realTimeEvents.length} new events
              </span>
            )}
            <Link to="/honeypots/management" className={styles.manageBtn}>
              Manage Honeypots →
            </Link>
          </div>
        </div>
        
        <div className={styles.eventsList}>
          {allEvents.slice(0, 15).map(event => {
            const isNewEvent = realTimeEvents.some(e => e._id === event._id);
            
            return (
              <Link 
                to={`/sessions/${event._id}`} 
                key={event._id} 
                className={`${styles.eventItem} ${isNewEvent ? styles.newEvent : ''}`}
              >
                <div className={styles.eventHeader}>
                  <span className={styles.eventIP}>
                    {event.source_ip}
                    {isNewEvent && <span className={styles.newBadge}>NEW</span>}
                  </span>
                  <span className={styles.eventTime}>
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                  <span className={`${styles.eventBadge} ${styles[event.severity] || ''}`}>
                    {(event.event_type || event.data_type || 'unknown').replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className={styles.eventDetails}>
                  {(event.event_type || event.data_type) === 'session' ? (
                    <>
                      <span>SSH Session • {event.commands?.length || 0} commands</span>
                      <span>Duration: {Math.round(event.duration || 0)}s</span>
                    </>
                  ) : (
                    <>
                      <span>Severity: {event.severity}</span>
                      {event.data?.username && <span>User: {event.data.username}</span>}
                      {event.data?.filename && <span>File: {event.data.filename}</span>}
                      {event.data?.path && <span>Path: {event.data.path}</span>}
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
} 