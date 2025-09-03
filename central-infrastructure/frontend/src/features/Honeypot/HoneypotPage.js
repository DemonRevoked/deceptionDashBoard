import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchHoneypots, fetchEvents, startHoneypot, stopHoneypot } from '../../api';
import useRealTimeEvents from '../../hooks/useRealTimeEvents';
import useWebSocket from '../../hooks/useWebSocket';
import toast from 'react-hot-toast';
import styles from './HoneypotPage.module.css';
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

export default function HoneypotPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [honeypot, setHoneypot] = useState(null);
  const [historicalEvents, setHistoricalEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [controlling, setControlling] = useState(false);

  // Real-time events for this specific honeypot
  const { 
    events: realTimeEvents, 
    honeypotStatuses, 
    securityAlerts, 
    isConnected 
  } = useRealTimeEvents({
    honeypotId: id,
    maxEvents: 200,
    enableNotifications: true,
    enableSecurityAlerts: true
  });

  // WebSocket connection for real-time updates
  const { socket } = useWebSocket();

  // Combine historical and real-time events
  const allEvents = useMemo(() => {
    const eventMap = new Map();
    
    // Add historical events
    historicalEvents.forEach(event => {
      eventMap.set(event._id, event);
    });
    
    // Add real-time events (will override historical if same ID)
    realTimeEvents.forEach(event => {
      eventMap.set(event._id, event);
    });
    
    return Array.from(eventMap.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [historicalEvents, realTimeEvents]);

  // Update honeypot status with real-time data
  const updatedHoneypot = useMemo(() => {
    if (!honeypot) return null;
    
    const statusUpdate = honeypotStatuses[honeypot._id];
    if (statusUpdate) {
      return {
        ...honeypot,
        status: statusUpdate.status,
        updated_at: statusUpdate.updated_at
      };
    }
    return honeypot;
  }, [honeypot, honeypotStatuses]);

  // Calculate analytics
  const analytics = useMemo(() => {
    const last24Hours = allEvents.filter(ev => 
      new Date(ev.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;
    
    const last7Days = allEvents.filter(ev => 
      new Date(ev.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    // Attack patterns by hour
    const hourlyActivity = Array.from({ length: 24 }, (_, i) => {
      const hour = i;
      const count = allEvents.filter(ev => {
        const evHour = new Date(ev.timestamp).getHours();
        return evHour === hour;
      }).length;
      return { hour, count };
    });

    // Top attacking IPs
    const ipCount = {};
    allEvents.forEach(ev => {
      ipCount[ev.source_ip] = (ipCount[ev.source_ip] || 0) + 1;
    });
    const topIPs = Object.entries(ipCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    // Event types distribution
    const eventTypes = {};
    allEvents.forEach(ev => {
      eventTypes[ev.event_type] = (eventTypes[ev.event_type] || 0) + 1;
    });

    // Severity distribution
    const severityCount = {
      low: allEvents.filter(ev => ev.severity === 'low').length,
      medium: allEvents.filter(ev => ev.severity === 'medium').length,
      high: allEvents.filter(ev => ev.severity === 'high').length,
      critical: allEvents.filter(ev => ev.severity === 'critical').length,
    };

    // Geographic distribution - based on IP ranges
    const countries = {};
    allEvents.forEach(ev => {
      let country = 'Unknown';
      
      // Basic IP range detection (no mock data)
      if (ev.source_ip.startsWith('192.168') || ev.source_ip.startsWith('10.') || ev.source_ip.startsWith('172.')) {
        country = 'Local Network';
      } else if (ev.source_ip.startsWith('127.')) {
        country = 'Localhost';
      } else {
        // For external IPs, we would need a geolocation service
        // For now, mark as external
        country = 'External';
      }
      
      countries[country] = (countries[country] || 0) + 1;
    });

    return {
      last24Hours,
      last7Days,
      hourlyActivity,
      topIPs,
      eventTypes,
      severityCount,
      countries
    };
  }, [allEvents]);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        // Removed console.log to reduce spam
        const hps = await fetchHoneypots();
        const hp = hps.find(h => h._id === id);
        
        if (!hp) {
          setError('Honeypot not found');
          return;
        }
        
        setHoneypot(hp);
        
        // Load historical events for this honeypot
        const evs = await fetchEvents({ honeypot_id: id, limit: 500 });
        setHistoricalEvents(evs);
        
        // Join honeypot-specific room for real-time updates
        if (socket) {
          socket.emit('join-honeypot', id);
        }
        
      } catch (e) {
        console.error('Error loading data:', e);
        setError(e.message || 'Failed to load honeypot data');
      } finally {
        setLoading(false);
      }
    }
    
    if (id) loadData();
    
    // Cleanup function
    return () => {
      if (socket) {
        socket.emit('leave-honeypot', id);
      }
    };
  }, [id, socket]);

  // Control functions
  const startHoneypotAction = async () => {
    setControlling(true);
    try {
      await startHoneypot(id);
      toast.success('Honeypot started successfully');
      
      // Update local state optimistically
      setHoneypot(prev => ({ ...prev, status: 'starting' }));
      
    } catch (error) {
      toast.error('Failed to start honeypot: ' + error.message);
    } finally {
      setControlling(false);
    }
  };

  const stopHoneypotAction = async () => {
    setControlling(true);
    try {
      await stopHoneypot(id);
      toast.success('Honeypot stopped successfully');
      
      // Update local state optimistically
      setHoneypot(prev => ({ ...prev, status: 'stopping' }));
      
    } catch (error) {
      toast.error('Failed to stop honeypot: ' + error.message);
    } finally {
      setControlling(false);
    }
  };

  const restartHoneypot = async () => {
    setControlling(true);
    try {
      await stopHoneypotAction();
      setTimeout(() => startHoneypotAction(), 2000);
      toast.success('Honeypot restart initiated');
    } catch (error) {
      toast.error('Failed to restart honeypot: ' + error.message);
    } finally {
      setControlling(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading honeypot control center...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;
  if (!updatedHoneypot) return <div className={styles.error}>Honeypot not found.</div>;

  // Chart configurations
  const hourlyChartData = {
    labels: analytics.hourlyActivity.map(h => `${h.hour}:00`),
    datasets: [{
      label: 'Attacks per Hour',
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

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link to="/" className={styles.backButton}>← Back to Dashboard</Link>
          <div className={styles.honeypotTitle}>
            <h1>{updatedHoneypot.name}</h1>
            <span className={styles.protocol}>{updatedHoneypot.protocol.toUpperCase()}</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.connectionStatus}>
            <span className={`${styles.statusDot} ${isConnected ? styles.connected : styles.disconnected}`}></span>
            <span>{isConnected ? 'Real-time Connected' : 'Disconnected'}</span>
          </div>
          <div className={`${styles.statusBadge} ${styles[updatedHoneypot.status]}`}>
            {updatedHoneypot.status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className={styles.controlPanel}>
        <div className={styles.controlButtons}>
          <button 
            onClick={startHoneypotAction}
            disabled={controlling || updatedHoneypot.status === 'running'}
            className={`${styles.controlBtn} ${styles.startBtn}`}
          >
            {controlling ? 'Starting...' : 'Start'}
          </button>
          <button 
            onClick={stopHoneypotAction}
            disabled={controlling || updatedHoneypot.status === 'stopped'}
            className={`${styles.controlBtn} ${styles.stopBtn}`}
          >
            {controlling ? 'Stopping...' : 'Stop'}
          </button>
          <button 
            onClick={restartHoneypot}
            disabled={controlling}
            className={`${styles.controlBtn} ${styles.restartBtn}`}
          >
            {controlling ? 'Restarting...' : 'Restart'}
          </button>
        </div>
        
        <div className={styles.quickStats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Port</span>
            <span className={styles.statValue}>{updatedHoneypot.port}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Type</span>
            <span className={styles.statValue}>{updatedHoneypot.type}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Events</span>
            <span className={styles.statValue}>{allEvents.length}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>24h Activity</span>
            <span className={styles.statValue}>{analytics.last24Hours}</span>
          </div>
        </div>
      </div>

      {/* Security Alerts */}
      {securityAlerts.length > 0 && (
        <div className={styles.alertsSection}>
          <h3>🚨 Active Security Alerts</h3>
          <div className={styles.alertsList}>
            {securityAlerts.slice(0, 3).map((alert, index) => (
              <div key={index} className={styles.alertItem}>
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

      {/* Tabs */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'events' ? styles.active : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Events ({allEvents.length})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'analytics' ? styles.active : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'threats' ? styles.active : ''}`}
          onClick={() => setActiveTab('threats')}
        >
          Threat Intelligence
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <div className={styles.overviewContent}>
            <div className={styles.overviewGrid}>
              <div className={styles.overviewCard}>
                <h3>Recent Activity</h3>
                <div className={styles.activityFeed}>
                  {allEvents.slice(0, 5).map(event => (
                    <div key={event._id} className={styles.activityItem}>
                      <div className={styles.activityIcon}>
                        {event.event_type === 'session' ? '🔐' : '⚠️'}
                      </div>
                      <div className={styles.activityContent}>
                        <div className={styles.activityHeader}>
                          <span className={styles.activityIP}>{event.source_ip}</span>
                          <span className={styles.activityTime}>
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className={styles.activityDetails}>
                          {event.event_type.replace('_', ' ').toUpperCase()}
                          {event.event_type === 'session' && ` - ${event.commands?.length || 0} commands`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className={styles.overviewCard}>
                <h3>System Health</h3>
                <div className={styles.healthMetrics}>
                  <div className={styles.healthItem}>
                    <span className={styles.healthLabel}>Uptime</span>
                    <span className={styles.healthValue}>
                      {updatedHoneypot.status === 'running' ? '🟢 Active' : '🔴 Stopped'}
                    </span>
                  </div>
                  <div className={styles.healthItem}>
                    <span className={styles.healthLabel}>Last Event</span>
                    <span className={styles.healthValue}>
                      {allEvents.length > 0 
                        ? new Date(allEvents[0].timestamp).toLocaleString()
                        : 'No events yet'
                      }
                    </span>
                  </div>
                  <div className={styles.healthItem}>
                    <span className={styles.healthLabel}>Threat Level</span>
                    <span className={styles.healthValue}>
                      {analytics.last24Hours > 50 ? '🔴 High' : 
                       analytics.last24Hours > 20 ? '🟡 Medium' : 
                       analytics.last24Hours > 0 ? '🟢 Low' : '⚪ Quiet'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className={styles.eventsContent}>
            <div className={styles.eventsHeader}>
              <h3>Security Events</h3>
              {realTimeEvents.length > 0 && (
                <span className={styles.liveIndicator}>
                  🔴 {realTimeEvents.length} Live Events
                </span>
              )}
            </div>
            <div className={styles.eventsList}>
              {allEvents.slice(0, 20).map(event => (
              <Link
                  key={event._id} 
                to={`/sessions/${event._id}`}
                  className={styles.eventItem}
              >
                  <div className={styles.eventHeader}>
                    <span className={styles.eventIP}>{event.source_ip}</span>
                    <span className={styles.eventTime}>
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                    <span className={`${styles.eventBadge} ${styles[event.severity]}`}>
                    {event.event_type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                  <div className={styles.eventDetails}>
                  {event.event_type === 'session' ? (
                    <>
                      <span>Commands: {event.commands?.length || 0}</span>
                        <span>Duration: {Math.round(event.duration || 0)}s</span>
                    </>
                  ) : (
                    <>
                      <span>Severity: {event.severity}</span>
                      {event.data?.username && <span>User: {event.data.username}</span>}
                      {event.data?.filename && <span>File: {event.data.filename}</span>}
                    </>
                  )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className={styles.analyticsContent}>
            <div className={styles.chartsGrid}>
              <div className={styles.chartCard}>
                <h3>Attack Patterns (24h)</h3>
                <div className={styles.chartContainer}>
                  <Line data={hourlyChartData} options={chartOptions} />
                </div>
              </div>
              
              <div className={styles.chartCard}>
                <h3>Event Types</h3>
                <div className={styles.chartContainer}>
                  <Pie data={eventTypeChartData} options={chartOptions} />
                </div>
              </div>
              
              <div className={styles.chartCard}>
                <h3>Severity Distribution</h3>
                <div className={styles.chartContainer}>
                  <Pie data={severityChartData} options={chartOptions} />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'threats' && (
          <div className={styles.threatsContent}>
            <div className={styles.threatsGrid}>
              <div className={styles.threatCard}>
                <h3>Top Threat Sources</h3>
                <div className={styles.threatList}>
                  {analytics.topIPs.map(([ip, count], index) => (
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
              
              <div className={styles.threatCard}>
                <h3>Geographic Distribution</h3>
                <div className={styles.geoList}>
                  {Object.entries(analytics.countries)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 8)
                    .map(([country, count]) => (
                      <div key={country} className={styles.geoItem}>
                        <span className={styles.geoCountry}>{country}</span>
                        <span className={styles.geoCount}>{count} attacks</span>
                      </div>
            ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 