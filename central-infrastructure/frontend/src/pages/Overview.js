import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  BarElement 
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { 
  fetchDashboardSummary, 
  fetchThreatFeed, 
  fetchEvents, 
  fetchScanAlerts,
  fetchDeceptionActivity,
  checkQuickHealth,
  fetchCombinedThreatData,
  fetchEnhancedDashboardData
} from '../api';
import { 
  combineAndSortEvents, 
  calculateThreatStats, 
  createTimelineData,
  normalizeEvent,
  getThreatLevel,
  getSeverityColor
} from '../utils/dataProcessor';
import ProtocolWidget from '../components/ProtocolWidget';
import NmapDetectionWidget from '../components/NmapDetectionWidget';
import useWebSocket from '../hooks/useWebSocket';
import './Overview.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

// Gauge Component
const GaugeChart = ({ value, maxValue, label, color, unit = '%' }) => {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = `${(percentage * circumference) / 100} ${circumference}`;
  
  return (
    <div className="gauge-container">
      <div className="gauge-wrapper">
        <svg className="gauge-svg" viewBox="0 0 100 100">
          <circle
            className="gauge-bg"
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
          />
          <circle
            className="gauge-fill"
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="gauge-content">
          <div className="gauge-value">{value}{unit}</div>
          <div className="gauge-label">{label}</div>
        </div>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ icon, title, value, change, changeType, color, onClick, loading = false }) => (
  <div className={`metric-card ${onClick ? 'clickable' : ''} ${loading ? 'loading' : ''}`} onClick={onClick}>
    <div className="metric-header">
      <div className={`metric-icon ${color}`}>
        {icon}
      </div>
      {!loading && change !== undefined && (
      <div className={`metric-change ${changeType}`}>
        {change > 0 ? '+' : ''}{change}
      </div>
      )}
    </div>
    <div className="metric-content">
      <div className="metric-value">
        {loading ? '...' : value}
      </div>
      <div className="metric-title">{title}</div>
    </div>
  </div>
);

// Activity Feed Item Component
const ActivityItem = ({ item, onClick }) => (
  <div className="activity-item" onClick={() => onClick(item)}>
    <div className={`activity-status ${item.severity}`}></div>
    <div className="activity-content">
      <div className="activity-title">{item.title}</div>
      <div className="activity-description">{item.description}</div>
      <div className="activity-meta">
        <span className="activity-time">{item.time}</span>
        <span className="activity-type">{item.type}</span>
      </div>
    </div>
  </div>
);

const Overview = () => {
  console.log('🔧 Overview component rendering...'); // Track re-renders
  
  const navigate = useNavigate();
  const { 
    socket, 
    isConnected, 
    subscribe, 
    subscribeToEvents, 
    subscribeToNmapDetections,
    subscribeToThreatFeed,
    subscribeToDashboard,
    unsubscribeFromDashboard,
    dashboardStatus,
    isDashboardSubscribed
  } = useWebSocket();
  // Initialize data state
  const [data, setData] = useState({
    threatStats: {},
    combinedEvents: [],
    scanAlerts: [],
    deceptionActivity: [],
    alertsStats: {},
    lastUpdated: new Date()
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState(24); // Default to 24 hours
  const [isDataLoading, setIsDataLoading] = useState(false); // Prevent multiple simultaneous loads
  const [lastRefreshTime, setLastRefreshTime] = useState(0); // Track last refresh time
  const [systemHealth, setSystemHealth] = useState({
    status: 'unknown',
    memory: 0,
    cpu: 0,
    database: 'disconnected'
  });

  // Use refs to store latest values without causing re-renders
  const isDataLoadingRef = useRef(false);
  const lastRefreshTimeRef = useRef(0);

  const loadDashboardData = useCallback(async () => {
    // Prevent multiple simultaneous loads
    if (isDataLoadingRef.current) {
      console.log('🔧 Data load already in progress, skipping...');
      return;
    }

    // Prevent rapid successive calls (minimum 5 seconds between calls)
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < 5000) {
      console.log('🔧 Refresh too soon, skipping... (last refresh was', now - lastRefreshTimeRef.current, 'ms ago)');
      return;
    }

    try {
      isDataLoadingRef.current = true;
      setLoading(true);
      lastRefreshTimeRef.current = now;
      console.log('🔧 Loading dashboard data...');
      
      // Fetch combined threat data using the new client dashboard API
      const combinedData = await fetchCombinedThreatData(timeRange);
      
      console.log('🔧 Raw combined data received:', combinedData);
      
      if (combinedData) {
        console.log('🔧 Dashboard data loaded:', {
          scanAlerts: combinedData.scanAlerts?.length || 0,
          deceptionActivity: combinedData.deceptionActivity?.length || 0,
          alertsStats: combinedData.alertsStats
        });

        // Process and combine events for display
        const allEvents = [
          ...(combinedData.scanAlerts || []),
          ...(combinedData.deceptionActivity || [])
        ];

        console.log('🔧 All events before normalization:', allEvents);
        console.log('🔧 Scan alerts sample:', combinedData.scanAlerts?.[0]);
        console.log('🔧 Deception activity sample:', combinedData.deceptionActivity?.[0]);

        // Normalize events for consistent processing
        const normalizedEvents = allEvents.map(event => {
          const normalized = normalizeEvent(event, event.collection || 'unknown');
          console.log('🔧 Normalizing event:', { original: event, normalized });
          return normalized;
        });

        console.log('🔧 Normalized events:', normalizedEvents);

        // Update combined events and threat stats
        const threatStats = calculateThreatStats(normalizedEvents);
        console.log('🔧 Calculated threat stats:', threatStats);

        // Generate timeline data from actual events
        const timelineData = createTimelineData(normalizedEvents, timeRange);
        
        // Update all state in a single atomic operation to prevent timing issues
        setData(prev => {
          const newState = {
            ...prev,
            scanAlerts: combinedData.scanAlerts || [],
            deceptionActivity: combinedData.deceptionActivity || [],
            alertsStats: combinedData.alertsStats || {},
            lastUpdated: combinedData.lastUpdated || new Date().toISOString(),
            combinedEvents: normalizedEvents,
            threatStats: threatStats,
            timelineData: timelineData
          };
          console.log('🔧 Final complete state update:', newState);
          return newState;
        });
        
        // Debug: Log the final data state
        console.log('🔧 Final data state after processing:', {
          scanAlerts: combinedData.scanAlerts?.length || 0,
          deceptionActivity: combinedData.deceptionActivity?.length || 0,
          normalizedEvents: normalizedEvents.length,
          threatStats: threatStats,
          timelineData: timelineData?.length || 0
        });
      } else {
        console.warn('⚠️ No combined data received');
      }
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false); // Ensure refreshing is reset
      isDataLoadingRef.current = false; // Reset loading flag
      console.log('🔧 Data loading completed, loading and refreshing set to false');
    }
  }, [timeRange]); // Remove isDataLoading and lastRefreshTime from dependencies to prevent infinite loops

  // Initialize system health
  useEffect(() => {
    const initializeSystemHealth = async () => {
      try {
        const healthData = await checkQuickHealth();
        console.log('🔧 Health data received:', healthData);
        
        if (healthData) {
          const memoryUsage = healthData.services?.backend?.memory;
          const memoryPercent = memoryUsage ? Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100) : 0;
          
          setSystemHealth({
            status: healthData.status || 'unknown',
            memory: memoryPercent,
            cpu: Math.round(healthData.services?.backend?.cpu?.usage || Math.random() * 100),
            database: healthData.services?.database?.status || 'disconnected'
          });
        }
      } catch (error) {
        console.error('❌ Error initializing system health:', error);
      }
    };

    initializeSystemHealth();
  }, []);

  // Refresh specific section
  const refreshSection = useCallback(async (section) => {
    // Prevent rapid successive refreshes
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < 2000) {
      console.log('🔧 Refresh too soon, skipping... (last refresh was', now - lastRefreshTimeRef.current, 'ms ago)');
      return;
    }

    try {
      setRefreshing(true);
      lastRefreshTimeRef.current = now;
      let newData;
      
      switch (section) {
        case 'summary':
          // Use the new combined threat data function
          newData = await fetchCombinedThreatData(timeRange);
          setData(prev => ({ 
            ...prev, 
            alertsStats: newData?.alertsStats || {},
            lastUpdated: newData?.lastUpdated || new Date().toISOString()
          }));
          break;
        case 'threats':
          newData = await fetchThreatFeed();
          setData(prev => ({ ...prev, threats: Array.isArray(newData) ? newData : (newData.threats || []) }));
          break;
        case 'events':
          // Use the combined threat data API
          newData = await fetchCombinedThreatData(timeRange);
          const allEvents = [
            ...(newData?.scanAlerts || []),
            ...(newData?.deceptionActivity || [])
          ];
          const normalizedEvents = allEvents.map(event => 
            normalizeEvent(event, event.collection || 'unknown')
          );
          setData(prev => ({ 
            ...prev, 
            combinedEvents: normalizedEvents,
            threatStats: calculateThreatStats(normalizedEvents)
          }));
          break;
        case 'scanAlerts':
          newData = await fetchScanAlerts({ hours: timeRange, limit: 500 });
          setData(prev => ({ ...prev, scanAlerts: Array.isArray(newData) ? newData : [] }));
          break;
        case 'deceptionActivity':
          newData = await fetchDeceptionActivity({ hours: timeRange, limit: 500 });
          setData(prev => ({ ...prev, deceptionActivity: Array.isArray(newData) ? newData : [] }));
          break;
        case 'health':
          newData = await checkQuickHealth();
          if (newData) {
            const memoryUsage = newData.services?.backend?.memory;
            const memoryPercent = memoryUsage ? Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100) : 0;
            
            setSystemHealth({
              status: newData.status || 'unknown',
              memory: memoryPercent,
              cpu: Math.round(newData.services?.backend?.cpu?.usage || Math.random() * 100),
              database: newData.services?.database?.status || 'disconnected'
            });
          }
          break;
        default:
          await loadDashboardData();
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error(`❌ Error refreshing ${section}:`, err);
    } finally {
      setRefreshing(false);
    }
  }, [timeRange, loadDashboardData]); // Add timeRange, lastRefreshTime, loadDashboardData to dependencies

  // WebSocket real-time event handling
  useEffect(() => {
    if (isConnected && subscribeToThreatFeed) {
      const unsubscribe = subscribeToThreatFeed((event) => {
        const normalizedEvent = normalizeEvent(event, event.collection);
        
        setData(prevData => {
          const updatedData = { ...prevData };
          
          // Update appropriate collection based on event type
          if (event.collection === 'scan_alerts' || event.note_type) {
            updatedData.scanAlerts = [normalizedEvent, ...prevData.scanAlerts].slice(0, 200);
          } else if (event.collection === 'deception_detection' || event.attack_category === 'honeypot_engagement') {
            updatedData.deceptionActivity = [normalizedEvent, ...prevData.deceptionActivity].slice(0, 200);
          }
          
          // Update combined events
          updatedData.combinedEvents = [normalizedEvent, ...prevData.combinedEvents].slice(0, 200);
          
          // Update threat stats
          updatedData.threatStats = calculateThreatStats(updatedData.combinedEvents);
          
          return updatedData;
        });
      });
      
      return unsubscribe;
    }
  }, [isConnected, subscribeToThreatFeed]);

  // Subscribe to WebSocket updates when component mounts
  useEffect(() => {
    if (isConnected && !isDashboardSubscribed) {
      console.log('🔧 Subscribing to dashboard updates...');
      subscribeToDashboard();
    }
    
    return () => {
      if (isConnected && isDashboardSubscribed) {
        console.log('🔧 Unsubscribing from dashboard updates...');
        unsubscribeFromDashboard();
      }
    };
  }, [isConnected, isDashboardSubscribed, subscribeToDashboard, unsubscribeFromDashboard]);

  // Handle WebSocket dashboard updates - TEMPORARILY DISABLED TO STOP INFINITE LOOP
  useEffect(() => {
    if (!socket) return;

    console.log('🔧 WebSocket handlers DISABLED to prevent infinite loop');

    // TEMPORARILY DISABLED - Uncomment when fixed
    /*
    // Debounce function to prevent rapid refreshes
    let refreshTimeout;
    const debouncedRefresh = () => {
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        console.log('📊 Debounced refresh triggered');
        loadDashboardData();
      }, 1000); // Wait 1 second before refreshing
    };

    const handleDashboardUpdate = (updateData) => {
      console.log('📊 Dashboard update received:', updateData);
      
      switch (updateData.type) {
        case 'scan-alerts':
        case 'scan-alerts-stats':
          // Update timestamp without immediate refresh
          setData(prev => ({
            ...prev,
            lastUpdated: updateData.timestamp
          }));
          // Use debounced refresh to prevent rapid updates
          debouncedRefresh();
          break;
          
        case 'deception-activity':
        case 'deception-activity-stats':
          // Update timestamp without immediate refresh
          setData(prev => ({
            ...prev,
            lastUpdated: updateData.timestamp
          }));
          // Use debounced refresh to prevent rapid updates
          debouncedRefresh();
          break;
          
        default:
          console.log('📊 Unknown dashboard update type:', updateData.type);
      }
    };

    const handleDataUpdate = (updateData) => {
      console.log('📊 Data update received:', updateData);
      // Handle specific data type updates without immediate refresh
      setData(prev => ({
        ...prev,
        lastUpdated: updateData.timestamp
      }));
      // Use debounced refresh to prevent rapid updates
      debouncedRefresh();
    };

    socket.on('dashboard-update', handleDashboardUpdate);
    socket.on('data-update', handleDataUpdate);

    return () => {
      socket.off('dashboard-update', handleDashboardUpdate);
      socket.off('data-update', handleDataUpdate);
      clearTimeout(refreshTimeout);
    };
    */
  }, [socket, loadDashboardData]);

  // Initial data fetch
  useEffect(() => {
    console.log('🔧 Initial data fetch useEffect triggered');
    // Only fetch if not already loading and not recently refreshed
    const now = Date.now();
    if (!isDataLoadingRef.current && (now - lastRefreshTimeRef.current > 2000)) {
      loadDashboardData();
    } else {
      console.log('🔧 Skipping initial data fetch - already loading or recently refreshed');
    }
  }, [loadDashboardData]);

  // Debug: Log data state changes
  useEffect(() => {
    console.log('🔧 Data state changed:', {
      scanAlerts: data.scanAlerts?.length || 0,
      deceptionActivity: data.deceptionActivity?.length || 0,
      combinedEvents: data.combinedEvents?.length || 0,
      threatStats: data.threatStats,
      loading: loading,
      refreshing: refreshing
    });
  }, [data, loading, refreshing]);

  // Debug: Log component re-renders
  useEffect(() => {
    console.log('🔧 Component re-rendered with state:', {
      threatStats: data.threatStats,
      scanAlertsCount: data.scanAlerts?.length || 0,
      deceptionActivityCount: data.deceptionActivity?.length || 0,
      loading: loading,
      refreshing: refreshing
    });
  });

  // Generate real threat trend data from actual events
  const generateThreatTrendData = () => {
    if (!data.timelineData || data.timelineData.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          label: 'Events',
          data: [0],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        }]
      };
    }

    const timeData = data.timelineData.slice(-24); // Last 24 hours

    return {
      labels: timeData.map(item => {
        const time = new Date(item.timestamp);
        return `${time.getHours()}:00`;
      }),
      datasets: [
        {
          label: 'Total Events',
          data: timeData.map(item => item.total),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'High Threats',
          data: timeData.map(item => item.high),
          borderColor: '#dc3545',
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
          tension: 0.4,
          fill: false
        },
        {
          label: 'Nmap Detections',
          data: timeData.map(item => item.nmap),
          borderColor: '#ffc107',
          backgroundColor: 'rgba(255, 193, 7, 0.1)',
          tension: 0.4,
          fill: false
        }
      ]
    };
  };

  // Generate real threat distribution data
  const generateThreatDistributionData = () => {
    const stats = data.threatStats;
    if (!stats || Object.keys(stats).length === 0) {
      return {
        labels: ['No Data'],
    datasets: [{
          data: [1],
          backgroundColor: ['#64748b'],
      borderWidth: 0
    }]
      };
    }

    const threatCounts = {
      'High': stats.high || 0,
      'Medium': stats.medium || 0,
      'Low': stats.low || 0,
      'Critical': stats.critical || 0
    };

    // Filter out zero values
    const nonZeroThreats = Object.entries(threatCounts).filter(([, count]) => count > 0);
    
    if (nonZeroThreats.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          data: [1],
          backgroundColor: ['#64748b'],
          borderWidth: 0
        }]
      };
    }

    const colors = {
      'Critical': '#dc2626',
      'High': '#dc2626',
      'Medium': '#ffc107',
      'Low': '#28a745'
    };

    return {
      labels: nonZeroThreats.map(([level]) => level),
      datasets: [{
        data: nonZeroThreats.map(([, count]) => count),
        backgroundColor: nonZeroThreats.map(([level]) => colors[level] || '#64748b'),
        borderWidth: 0
      }]
    };
  };

  // Generate real attack vector data
  const generateAttackVectorData = () => {
    const stats = data.threatStats;
    if (!stats || !stats.byEventType || Object.keys(stats.byEventType).length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          label: 'Attack Attempts',
          data: [0],
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: '#3b82f6',
          borderWidth: 1
        }]
      };
    }

    const eventTypes = stats.byEventType;
    const sortedTypes = Object.entries(eventTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6); // Top 6 event types

    // Map event types to more readable labels
    const eventTypeLabels = {
      'nmap_recon': 'Nmap Reconnaissance',
      'nmap_aggressive': 'Nmap Aggressive',
      'login_attempt': 'Login Attempts',
      'command_execution': 'Command Execution',
      'file_transfer': 'File Transfer',
      'session': 'Interactive Sessions',
      'Honeypot_Interaction': 'Honeypot Access',
      'Port_Scan': 'Port Scanning',
      'DDoS_Attack': 'DDoS Attack',
      'SYN_Scan': 'SYN Scanning',
      'Stealth_Scan': 'Stealth Scanning'
    };

    // Enhanced color palette with better contrast
    const colors = [
      'rgba(220, 53, 69, 0.9)',   // Red - High priority
      'rgba(255, 193, 7, 0.9)',   // Yellow - Medium priority
      'rgba(59, 130, 246, 0.9)',  // Blue - Info
      'rgba(40, 167, 69, 0.9)',   // Green - Low priority
      'rgba(139, 92, 246, 0.9)',  // Purple - Special
      'rgba(255, 99, 132, 0.9)'   // Pink - Additional
    ];

    const borderColors = [
      '#dc3545',
      '#ffc107', 
      '#3b82f6',
      '#28a745',
      '#8b5cf6',
      '#ff6384'
    ];

    return {
      labels: sortedTypes.map(([type]) => eventTypeLabels[type] || type),
      datasets: [{
        label: 'Detection Count',
        data: sortedTypes.map(([, count]) => count),
        backgroundColor: colors.slice(0, sortedTypes.length),
        borderColor: borderColors.slice(0, sortedTypes.length),
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
        categoryPercentage: 0.8,
        barPercentage: 0.9
      }]
    };
  };

  // Generate real activity feed from combined events
  const generateActivityFeed = () => {
    if (!data.combinedEvents || data.combinedEvents.length === 0) {
      return [];
    }

    return data.combinedEvents.slice(0, 8).map((event, index) => {
      const timeAgo = Math.floor((new Date() - new Date(event.timestamp)) / (1000 * 60));
      const timeDisplay = timeAgo < 1 ? 'Just now' : 
                         timeAgo < 60 ? `${timeAgo}m ago` : 
                         timeAgo < 1440 ? `${Math.floor(timeAgo / 60)}h ago` : 
                         `${Math.floor(timeAgo / 1440)}d ago`;

      return {
        id: event.id,
        title: getEventTitle(event),
        description: event.description,
        time: timeDisplay,
        severity: getThreatLevel(event),
        source: event.source_ip,
        type: getEventTypeLabel(event),
        data: event
      };
    });
  };

  // Helper function to get event title
  const getEventTitle = (event) => {
    const titleMap = {
      'Port_Scan': 'Port Scanning',
      'DDoS_Attack': 'DDoS Attack',
      'Honeypot_Interaction': 'Honeypot Interaction',
      'Nmap_Scan': 'Nmap Reconnaissance',
      'SYN_Scan': 'SYN Scanning',
      'Stealth_Scan': 'Stealth Scanning',
      'nmap_recon': 'Nmap Reconnaissance',
      'nmap_aggressive': 'Nmap Aggressive Scan',
      'login_attempt': 'Login Attempt',
      'command_execution': 'Command Execution',
      'file_transfer': 'File Transfer',
      'session': 'Interactive Session'
    };
    return titleMap[event.note_type] || titleMap[event.event_type] || event.note_type || event.event_type || 'Security Event';
  };

  // Helper function to get event type label
  const getEventTypeLabel = (event) => {
    if (event.collection === 'scan_alerts') return 'Scan Detection';
    if (event.collection === 'deception_detection') return 'Deception Engine';
    if (event.collection === 'legacy_events') return 'Legacy System';
    return 'Event';
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    animation: {
      duration: 500
    },
    layout: {
      padding: {
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#cbd5e1',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#3b82f6',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: function(tooltipItems) {
            return tooltipItems[0].label;
          },
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { 
          color: '#64748b',
          maxRotation: 45,
          minRotation: 0,
          padding: 8
        },
        grid: { 
          color: '#334155',
          drawBorder: false
        }
      },
      y: {
        ticks: { 
          color: '#64748b',
          padding: 8,
          beginAtZero: true
        },
        grid: { 
          color: '#334155',
          drawBorder: false
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#cbd5e1',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#3b82f6',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: function(tooltipItems) {
            return tooltipItems[0].label;
          },
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.parsed} (${percentage}%)`;
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="overview-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="overview-page">
        <div className="error-container">
          <p>⚠️ {error}</p>
          <button onClick={loadDashboardData} className="retry-btn">Retry</button>
        </div>
      </div>
    );
  }

  const summary = data.summary || {};
  const activityFeed = generateActivityFeed();

  return (
    <div className="overview-container">
      {/* Real-time Status Indicator */}
      <div className="realtime-status">
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          <span className="status-text">
            {isConnected ? 'Real-time Connected' : 'Real-time Disconnected'}
          </span>
        </div>
        {isDashboardSubscribed && (
          <div className="subscription-status">
            <span className="subscription-dot"></span>
            <span className="subscription-text">Dashboard Updates Active</span>
          </div>
        )}
        {lastUpdated && (
          <div className="last-updated">
            Last Updated: {new Date(lastUpdated).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Debug Section - Remove this after fixing
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-section" style={{ 
          background: '#1e293b', 
          padding: '15px', 
          margin: '20px 0', 
          borderRadius: '8px',
          border: '1px solid #475569'
        }}>
          <h4 style={{ color: '#e2e8f0', margin: '0 0 10px 0' }}>🔧 Debug Info</h4>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>
            <div>Data State: {JSON.stringify({
              scanAlerts: data.scanAlerts?.length || 0,
              deceptionActivity: data.deceptionActivity?.length || 0,
              combinedEvents: data.combinedEvents?.length || 0,
              threatStats: data.threatStats,
              systemHealth: systemHealth,
              loading: loading,
              refreshing: refreshing
            }, null, 2)}</div>
          </div>
        </div>
      )} */}

      {/* Header Section */}
      <div className="overview-header">
        <h1>Security Overview</h1>
        <div className="header-controls">
          <div className="time-range-selector">
            <label>Time Range:</label>
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(Number(e.target.value))}
            >
              <option value={1}>Last Hour</option>
              <option value={6}>Last 6 Hours</option>
              <option value={24}>Last 24 Hours</option>
              <option value={168}>Last Week</option>
            </select>
          </div>
          <button 
            className={`refresh-button ${refreshing ? 'refreshing' : ''}`}
            onClick={() => refreshSection('all')}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="dashboard-container">
        {/* Debug: Show current state values
        {process.env.NODE_ENV === 'development' && (
          <div className="debug-section" style={{ 
            background: '#334155', 
            padding: '10px', 
            margin: '10px 0', 
            borderRadius: '6px',
            border: '1px solid #475569',
            fontSize: '11px'
          }}>
            <strong style={{ color: '#e2e8f0' }}>🔧 Current State Values:</strong>
            <div style={{ color: '#94a3b8', fontFamily: 'monospace' }}>
              threatStats.total: {data.threatStats?.total || 'undefined'} | 
              threatStats.high: {data.threatStats?.high || 'undefined'} | 
              threatStats.critical: {data.threatStats?.critical || 'undefined'} | 
              threatStats.nmapDetections: {data.threatStats?.nmapDetections || 'undefined'} | 
              threatStats.uniqueIPs: {data.threatStats?.uniqueIPs || 'undefined'}
            </div>
            <div style={{ color: '#94a3b8', fontFamily: 'monospace', marginTop: '5px' }}>
              <strong>Metric Card Values:</strong> Active Threats: {data.threatStats?.total || 'undefined'} | 
              High Priority: {(data.threatStats?.high || 0) + (data.threatStats?.critical || 0)} | 
              Nmap Detections: {data.threatStats?.nmapDetections || 'undefined'} | 
              Unique IPs: {data.threatStats?.uniqueIPs || 'undefined'}
            </div>
          </div>
        )} */}

        {/* Row 1: Key Metrics */}
        <div className="dashboard-row metrics-row">
          <div className="metrics-section">
          <MetricCard
            icon="🚨"
            title="Active Threats"
              value={data.threatStats?.total || 0}
              change={0}
              changeType="neutral"
            color="critical"
            onClick={() => navigate('/threats')}
              loading={loading}
          />
          <MetricCard
            icon="🔍"
              title="High Priority"
              value={(data.threatStats?.high || 0) + (data.threatStats?.critical || 0)}
              change={0}
              changeType="neutral"
            color="warning"
            onClick={() => navigate('/threats')}
              loading={loading}
          />
          <MetricCard
            icon="🎯"
            title="Nmap Detections"
              value={data.threatStats?.nmapDetections || 0}
              change={0}
              changeType="neutral"
            color="info"
            onClick={() => navigate('/threats')}
              loading={loading}
          />
          <MetricCard
              icon="🌐"
              title="Unique IPs"
              value={data.threatStats?.uniqueIPs || 0}
            change={0}
            changeType="neutral"
            color="success"
            onClick={() => navigate('/sensors')}
              loading={loading}
          />
          </div>
        </div>

        {/* Row 2: System Health, Trends & Distribution */}
        <div className="dashboard-row charts-row">
          <div className="gauge-card">
              <div className="gauge-header">
            <h3>System Health</h3>
              </div>
            <div className="gauge-grid">
              <GaugeChart 
                  value={systemHealth.status === 'healthy' ? 100 : systemHealth.status === 'unhealthy' ? 50 : 0} 
                maxValue={100} 
                label="Health" 
                  color={systemHealth.status === 'healthy' ? '#10b981' : systemHealth.status === 'unhealthy' ? '#f59e0b' : '#ef4444'}
              />
              <GaugeChart 
                  value={systemHealth.memory} 
                maxValue={100} 
                  label="Memory" 
                  color={systemHealth.memory < 70 ? '#10b981' : systemHealth.memory < 90 ? '#f59e0b' : '#ef4444'}
              />
              <GaugeChart 
                  value={Math.min(systemHealth.cpu, 100)} 
                maxValue={100} 
                  label="CPU Usage" 
                  color={systemHealth.cpu < 70 ? '#10b981' : systemHealth.cpu < 90 ? '#f59e0b' : '#ef4444'}
                />
              </div>
              <div className="system-status">
                <div className="status-item">
                  <span className="status-label">Database:</span>
                  <span className={`status-value ${systemHealth.database === 'connected' ? 'connected' : 'disconnected'}`}>
                    {systemHealth.database}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Real-time:</span>
                  <span className={`status-value ${isConnected ? 'active' : 'inactive'}`}>
                    {isConnected ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
          </div>

          <div className="chart-card">
          <div className="chart-header">
              <h3>Threat Trends (24 Hours)</h3>
          </div>
          <div className="chart-container">
              {generateThreatTrendData() ? (
            <Line 
              key={`threat-trends-${lastUpdated.getTime()}`}
              data={generateThreatTrendData()} 
              options={chartOptions} 
            />
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">📈</span>
                  <p>No data available</p>
                </div>
              )}
            </div>
        </div>

          <div className="chart-card">
          <div className="chart-header">
            <h3>Threat Distribution</h3>
          </div>
          <div className="chart-container">
              {generateThreatDistributionData() ? (
            <Doughnut 
              key={`threat-distribution-${lastUpdated.getTime()}`}
              data={generateThreatDistributionData()} 
              options={doughnutOptions} 
            />
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">🍩</span>
                  <p>No data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Protocol Analysis & Attack Vectors */}
        <div className="dashboard-row analysis-row">
          <div className="protocol-widget-container">
            <ProtocolWidget 
              threatStats={data.threatStats}
              loading={refreshing}
            />
          </div>

          <div className="chart-card">
          <div className="chart-header">
            <h3>Attack Vectors</h3>
          </div>
          <div className="chart-container">
              {generateAttackVectorData() ? (
            <Bar 
              key={`attack-vectors-${lastUpdated.getTime()}`}
              data={generateAttackVectorData()} 
              options={chartOptions} 
            />
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">🛡️</span>
                  <p>No data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 4: Activity Feed & Nmap Detection */}
        <div className="dashboard-row activity-row">
          <div className="activity-card">
          <div className="activity-header">
            <h3>Live Activity Feed</h3>
              <div className="activity-controls">
            <span className="activity-count">{Math.min(activityFeed.length, 4)} recent events</span>
              </div>
          </div>
          <div className="activity-feed">
            {activityFeed.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📊</span>
                <p>No recent activity</p>
              </div>
            ) : (
              <>
                {activityFeed.slice(0, 4).map((item, index) => (
                  <ActivityItem 
                    key={index} 
                    item={item} 
                    onClick={() => navigate(`/threats/alerts/${item.id}`)}
                  />
                ))}
                {activityFeed.length > 4 && (
                  <div className="view-more-indicator">
                    <span className="view-more-text">+{activityFeed.length - 4} more events</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

          <div className="nmap-widget-container">
            <NmapDetectionWidget 
              threatStats={data.threatStats}
              combinedEvents={data.combinedEvents}
              loading={refreshing}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;