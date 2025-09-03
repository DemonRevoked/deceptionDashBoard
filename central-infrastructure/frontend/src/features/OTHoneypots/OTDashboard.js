import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  fetchHoneypots, 
  fetchEvents,
  fetchOTHoneypots,
  fetchOTDashboardStats,
  fetchOTThreats,
  fetchOTSafetyIncidents,
  fetchOTAttackTimeline
} from '../../api';
import useRealTimeEvents from '../../hooks/useRealTimeEvents';
import styles from './OTDashboard.module.css';
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

export default function OTDashboard() {
  const [otHoneypots, setOTHoneypots] = useState([]);
  const [otStats, setOTStats] = useState(null);
  const [threats, setThreats] = useState([]);
  const [safetyIncidents, setSafetyIncidents] = useState([]);
  const [attackTimeline, setAttackTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');

  // Real-time WebSocket events for OT
  const { 
    events: realTimeEvents, 
    honeypotStatuses, 
    securityAlerts, 
    isConnected 
  } = useRealTimeEvents({
    maxEvents: 50,
    enableNotifications: true,
    enableSecurityAlerts: true,
    category: 'OT'
  });

  // Filter real-time events for OT category
  const otEvents = useMemo(() => {
    return realTimeEvents.filter(event => event.category === 'OT');
  }, [realTimeEvents]);

  useEffect(() => {
    loadOTData();
  }, [selectedTimeframe]);

  const loadOTData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch OT honeypots
      const otHoneypotsData = await fetchOTHoneypots();

      // Fetch OT dashboard stats
      const statsData = await fetchOTDashboardStats(selectedTimeframe);

      // Fetch OT threats
      const threatsData = await fetchOTThreats(selectedTimeframe, 20);

      // Fetch safety incidents
      const incidentsData = await fetchOTSafetyIncidents(selectedTimeframe, 10);

      // Fetch attack timeline
      const timelineData = await fetchOTAttackTimeline(selectedTimeframe);

      setOTHoneypots(otHoneypotsData);
      setOTStats(statsData);
      setThreats(threatsData);
      setSafetyIncidents(incidentsData);
      setAttackTimeline(timelineData);
    } catch (err) {
      console.error('Error loading OT data:', err);
      setError('Failed to load OT dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Chart configurations
  const threatLevelChartData = useMemo(() => {
    if (!otStats?.threat_levels) return null;

    const levels = otStats.threat_levels.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return {
      labels: ['Critical', 'High', 'Medium', 'Low'],
      datasets: [{
        data: [
          levels.critical || 0,
          levels.high || 0,
          levels.medium || 0,
          levels.low || 0
        ],
        backgroundColor: [
          '#dc2626', // Critical - red
          '#ea580c', // High - orange
          '#ca8a04', // Medium - yellow
          '#16a34a'  // Low - green
        ],
        borderWidth: 2,
        borderColor: '#1e293b'
      }]
    };
  }, [otStats]);

  const protocolDistributionData = useMemo(() => {
    if (!otStats?.protocol_distribution) return null;

    return {
      labels: otStats.protocol_distribution.map(p => p._id.toUpperCase()),
      datasets: [{
        label: 'Attacks by Protocol',
        data: otStats.protocol_distribution.map(p => p.count),
        backgroundColor: '#3b82f6',
        borderColor: '#1e40af',
        borderWidth: 1
      }]
    };
  }, [otStats]);

  const registerPatternsData = useMemo(() => {
    if (!otStats?.register_patterns) return null;

    return {
      labels: otStats.register_patterns.map(r => r._id.replace('_', ' ').toUpperCase()),
      datasets: [{
        label: 'Register Access Count',
        data: otStats.register_patterns.map(r => r.count),
        backgroundColor: '#f59e0b',
        borderColor: '#d97706',
        borderWidth: 1
      }]
    };
  }, [otStats]);

  const attackTimelineData = useMemo(() => {
    if (!attackTimeline || attackTimeline.length === 0) return null;

    return {
      labels: attackTimeline.map(point => new Date(point.timestamp).toLocaleTimeString()),
      datasets: [{
        label: 'Attack Volume',
        data: attackTimeline.map(point => point.total),
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };
  }, [attackTimeline]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#e2e8f0'
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8' },
        grid: { color: '#334155' }
      },
      y: {
        ticks: { color: '#94a3b8' },
        grid: { color: '#334155' }
      }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#e2e8f0',
          padding: 20
        }
      }
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.industrialSpinner}></div>
          <p>Loading OT Infrastructure...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>⚠️</div>
          <h3>System Error</h3>
          <p>{error}</p>
          <button onClick={loadOTData} className={styles.retryButton}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <span className={styles.industrialIcon}>🏭</span>
            Operational Technology Security Center
          </h1>
          <p className={styles.subtitle}>
            Industrial Control Systems & Critical Infrastructure Monitoring
          </p>
        </div>
        
        <div className={styles.connectionStatus}>
          <div className={`${styles.statusIndicator} ${isConnected ? styles.connected : styles.disconnected}`}>
            <span className={styles.statusDot}></span>
            {isConnected ? 'SCADA Connected' : 'SCADA Offline'}
          </div>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className={styles.timeControls}>
        <label>Analysis Period:</label>
        <select 
          value={selectedTimeframe} 
          onChange={(e) => setSelectedTimeframe(e.target.value)}
          className={styles.timeSelector}
        >
          <option value="1h">Last Hour</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      {/* Critical Safety Alerts */}
      {safetyIncidents.length > 0 && (
        <div className={styles.criticalAlerts}>
          <h3 className={styles.alertTitle}>
            🚨 Critical Safety Incidents
          </h3>
          <div className={styles.alertsGrid}>
            {safetyIncidents.slice(0, 3).map((incident, index) => (
              <div key={index} className={styles.criticalAlert}>
                <div className={styles.alertHeader}>
                  <span className={styles.alertSeverity}>
                    {incident.threat_intelligence?.threat_level?.toUpperCase()}
                  </span>
                  <span className={styles.alertTime}>
                    {new Date(incident.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className={styles.alertContent}>
                  <strong>{incident.honeypot_name}</strong>
                  <p>{incident.note}</p>
                  <div className={styles.alertIndicators}>
                    {incident.threat_intelligence?.indicators?.map((indicator, i) => (
                      <span key={i} className={styles.indicator}>
                        {indicator.replace('_', ' ').toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OT Systems Overview */}
      <div className={styles.systemsOverview}>
        <h3 className={styles.sectionTitle}>Industrial Control Systems</h3>
        <div className={styles.honeypotsGrid}>
          {otHoneypots.map(honeypot => (
            <Link 
              key={honeypot._id} 
              to={`/honeypot/${honeypot._id}`} 
              className={styles.honeypotCard}
            >
              <div className={styles.honeypotHeader}>
                <div className={styles.honeypotIcon}>
                  {honeypot.type === 'siemens-s7' ? '🔧' : '⚙️'}
                </div>
                <div className={styles.honeypotInfo}>
                  <h4>{honeypot.display_name}</h4>
                  <p>{honeypot.description}</p>
                </div>
                <div className={`${styles.status} ${styles[honeypot.status]}`}>
                  {honeypot.status === 'active' ? 'ONLINE' : 'OFFLINE'}
                </div>
              </div>
              
              <div className={styles.honeypotDetails}>
                <div className={styles.detailItem}>
                  <span>Protocol:</span>
                  <span>{honeypot.protocol?.toUpperCase()}</span>
                </div>
                <div className={styles.detailItem}>
                  <span>Port:</span>
                  <span>{honeypot.port}</span>
                </div>
                <div className={styles.detailItem}>
                  <span>Model:</span>
                  <span>{honeypot.model}</span>
                </div>
                <div className={styles.detailItem}>
                  <span>Firmware:</span>
                  <span>{honeypot.firmware}</span>
                </div>
              </div>

              <div className={styles.honeypotStats}>
                <div className={styles.statItem}>
                  <span>Registers:</span>
                  <span>{honeypot.config?.registers?.holding_registers || 0}</span>
                </div>
                <div className={styles.statItem}>
                  <span>Coils:</span>
                  <span>{honeypot.config?.registers?.coils || 0}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className={styles.analyticsGrid}>
        {/* Threat Level Distribution */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Threat Level Distribution</h3>
          {threatLevelChartData ? (
            <div className={styles.chartContainer}>
              <Pie data={threatLevelChartData} options={pieOptions} />
            </div>
          ) : (
            <div className={styles.noData}>No threat data available</div>
          )}
        </div>

        {/* Protocol Attacks */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Attacks by Protocol</h3>
          {protocolDistributionData ? (
            <div className={styles.chartContainer}>
              <Bar data={protocolDistributionData} options={chartOptions} />
            </div>
          ) : (
            <div className={styles.noData}>No protocol data available</div>
          )}
        </div>

        {/* Register Access Patterns */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Register Access Patterns</h3>
          {registerPatternsData ? (
            <div className={styles.chartContainer}>
              <Bar data={registerPatternsData} options={chartOptions} />
            </div>
          ) : (
            <div className={styles.noData}>No register data available</div>
          )}
        </div>

        {/* Attack Timeline */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Attack Timeline</h3>
          {attackTimelineData ? (
            <div className={styles.chartContainer}>
              <Line data={attackTimelineData} options={chartOptions} />
            </div>
          ) : (
            <div className={styles.noData}>No timeline data available</div>
          )}
        </div>
      </div>

      {/* Recent OT Threats */}
      <div className={styles.recentThreats}>
        <h3 className={styles.sectionTitle}>Recent OT Threats</h3>
        <div className={styles.threatsTable}>
          <div className={styles.tableHeader}>
            <span>Time</span>
            <span>System</span>
            <span>Source</span>
            <span>Threat</span>
            <span>Severity</span>
            <span>Action</span>
          </div>
          {threats.slice(0, 10).map((threat, index) => (
            <div key={index} className={styles.threatRow}>
              <span className={styles.timestamp}>
                {new Date(threat.timestamp).toLocaleString()}
              </span>
              <span className={styles.system}>
                {threat.honeypot_name}
              </span>
              <span className={styles.source}>
                {threat.source_ip}
              </span>
              <span className={styles.threatType}>
                {threat.function_code_description || threat.note}
              </span>
              <span className={`${styles.severity} ${styles[threat.threat_intelligence?.threat_level]}`}>
                {threat.threat_intelligence?.threat_level?.toUpperCase()}
              </span>
              <span className={styles.action}>
                <button className={styles.analyzeBtn}>Analyze</button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Attackers */}
      {otStats?.top_attackers && otStats.top_attackers.length > 0 && (
        <div className={styles.topAttackers}>
          <h3 className={styles.sectionTitle}>Persistent Threat Actors</h3>
          <div className={styles.attackersGrid}>
            {otStats.top_attackers.slice(0, 6).map((attacker, index) => (
              <div key={index} className={styles.attackerCard}>
                <div className={styles.attackerHeader}>
                  <span className={styles.attackerIP}>{attacker._id}</span>
                  <span className={styles.attackCount}>{attacker.count} attacks</span>
                </div>
                <div className={styles.attackerDetails}>
                  <div className={styles.detailItem}>
                    <span>Targets:</span>
                    <span>{attacker.honeypots.length} systems</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span>Max Threat:</span>
                    <span className={styles.maxThreat}>
                      {attacker.threat_levels.includes('critical') ? 'CRITICAL' : 
                       attacker.threat_levels.includes('high') ? 'HIGH' : 
                       attacker.threat_levels.includes('medium') ? 'MEDIUM' : 'LOW'}
                    </span>
                  </div>
                </div>
                <div className={styles.attackerActions}>
                  <button className={styles.blockBtn}>Block IP</button>
                  <button className={styles.analyzeBtn}>Analyze</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 