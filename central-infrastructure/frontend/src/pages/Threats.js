import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import ThreatFilters from '../components/threats/ThreatFilters';
import ThreatTable from '../components/threats/ThreatTable';
import ThreatTabs from '../components/threats/ThreatTabs';
import EnhancedFilters from '../components/EnhancedFilters';
import TTPTimeline from '../components/TTPTimeline';
import ThreatsIOCs from './ThreatsIOCs';
import ThreatsTTPs from './ThreatsTTPs';
import ThreatsCampaigns from './ThreatsCampaigns';
import { 
  fetchThreatFeed, 
  fetchScanAlerts,
  fetchDeceptionActivity,
  fetchEvents,
  fetchCombinedThreatData
} from '../api';
import { enhancedEventsApi } from '../api/enhancedApi';
import { 
  combineAndSortEvents, 
  calculateThreatStats,
  normalizeEvent,
  exportEventsToCSV
} from '../utils/dataProcessor';
import './Threats.css';

const Threats = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Local state for controls (previously from GlobalControls)
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedClient, setSelectedClient] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  const [activeTab, setActiveTab] = useState('alerts');
  const [threats, setThreats] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [threatStats, setThreatStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [useEnhancedFilters, setUseEnhancedFilters] = useState(true);
  const [filters, setFilters] = useState({
    severity: 'all',
    platform: 'all',
    status: 'all',
    search: ''
  });
  const [savedViews, setSavedViews] = useState([
    { name: 'Critical Threats', filters: { severity: 'critical' } },
    { name: 'Network Attacks', filters: { platform: 'network' } },
    { name: 'Deception Engine Activity', filters: { platform: 'honeypot' } }
  ]);

  const loadThreats = useCallback(async () => {
    try {
      setLoading(true);
      
      if (useEnhancedFilters) {
        // Use the working client dashboard API for better data processing and insights
        console.log('🔧 Loading enhanced events from VPS API...');
        
        // Convert timeRange string to hours number for API compatibility
        const hours = timeRange === '1h' ? 1 : 
                     timeRange === '6h' ? 6 : 
                     timeRange === '12h' ? 12 : 
                     timeRange === '24h' ? 24 : 
                     timeRange === '7d' ? 168 : 24;
        
        const enhancedData = await fetchCombinedThreatData({ 
          limit: 500,
          hours: hours 
        });

        if (enhancedData && (enhancedData.scanAlerts || enhancedData.deceptionActivity)) {
          console.log('🔧 Enhanced events loaded:', (enhancedData.scanAlerts?.length || 0) + (enhancedData.deceptionActivity?.length || 0));
          
          // Combine and normalize all events
          const allEventsData = combineAndSortEvents({
            scan_alerts: enhancedData.scanAlerts || [],
            deception_detection: enhancedData.deceptionActivity || []
          });
          
          setAllEvents(allEventsData);
          setFilteredEvents(allEventsData);
          
          // Calculate threat stats from enhanced data
          const enhancedStats = calculateThreatStats(allEventsData);
          setThreatStats(enhancedStats);

          // Convert enhanced events to legacy threat format for backward compatibility
          const legacyThreats = allEventsData.map(event => {
            const platform = event.collection === 'scan_alerts' ? 'Scan_Detection_Engine' : 'Deception_Engine';
            console.log('🔧 Platform mapping for event:', {
              id: event.id,
              collection: event.collection,
              note_type: event.note_type,
              platform: platform,
              source_ip: event.source_ip
            });
            
            return {
              ...event,
              id: event.id || `event-${Math.random()}`,
              type: event.collection === 'scan_alerts' ? 'scan_detection' : 'deception_engine',
              platform: platform,
              severity: event.severity || 'medium',
              timestamp: new Date(event.timestamp || Date.now()),
              source: event.source_ip,
              target: event.dest_port || event.honeypot_id,
              status: 'new',
              message: event.message,
              alertType: event.note_type || event.event_type
            };
          });

          setThreats(legacyThreats);
        } else {
          console.warn('No enhanced events data received');
          setAllEvents([]);
          setFilteredEvents([]);
          setThreats([]);
        }
      } else {
        // Use legacy combined threat data fetching
        console.log('🔧 Loading legacy combined threat data...');
        
        // Convert timeRange string to hours number for API compatibility
        const hours = timeRange === '1h' ? 1 : 
                     timeRange === '6h' ? 6 : 
                     timeRange === '12h' ? 12 : 
                     timeRange === '24h' ? 24 : 
                     timeRange === '7d' ? 168 : 24;
        
        const combinedData = await fetchCombinedThreatData({ 
          limit: 500,
          hours: hours 
        });

        if (combinedData && (combinedData.scanAlerts || combinedData.deceptionActivity)) {
          // Combine and normalize all events
          const allEventsData = combineAndSortEvents({
            scan_alerts: combinedData.scanAlerts || [],
            deception_detection: combinedData.deceptionActivity || []
          });

          setAllEvents(allEventsData);
          setFilteredEvents(allEventsData);
          setThreatStats(calculateThreatStats(allEventsData));

          // Convert to legacy threat format for backward compatibility
          const legacyThreats = allEventsData.map(event => ({
            ...event,
            id: event.id || `event-${Math.random()}`,
            type: event.collection === 'scan_alerts' ? 'scan_detection' : 'deception_engine',
            platform: event.collection === 'scan_alerts' ? 'Scan_Detection_Engine' : 'Deception_Engine',
            severity: event.severity || 'medium',
            timestamp: new Date(event.timestamp || Date.now()),
            source: event.source_ip,
            target: event.dest_port || event.honeypot_id,
            status: 'new',
            message: event.message,
            alertType: event.note_type || event.event_type
          }));

          setThreats(legacyThreats);

          // Log any errors from data fetching
          if (combinedData.errors && combinedData.errors.length > 0) {
            console.warn('Data fetching warnings:', combinedData.errors);
          }
        } else {
          // Fallback to individual API calls
          console.warn('Using fallback data fetching method');
          const [threatData, scanData, deceptionData] = await Promise.all([
            fetchThreatFeed(500).catch(() => []),
            fetchScanAlerts({ hours: hours, limit: 200 }).catch(() => []),
            fetchDeceptionActivity({ hours: hours, limit: 200 }).catch(() => [])
          ]);

          // Normalize and combine data
          const normalizedEvents = [
            ...(Array.isArray(threatData) ? threatData : []).map(t => normalizeEvent(t, 'scan_alerts')),
            ...(Array.isArray(scanData) ? scanData : []).map(z => normalizeEvent(z, 'scan_alerts')),
            ...(Array.isArray(deceptionData) ? deceptionData : []).map(e => normalizeEvent(e, 'deception_detection'))
          ];

          setAllEvents(normalizedEvents);
          setFilteredEvents(normalizedEvents);
          setThreatStats(calculateThreatStats(normalizedEvents));

          // Legacy format
          const legacyThreats = normalizedEvents.map(event => {
            const platform = event.collection === 'scan_alerts' ? 'Scan_Detection_Engine' : 'Deception_Engine';
            console.log('🔧 Platform mapping for fallback event:', {
              id: event.id,
              collection: event.collection,
              note_type: event.note_type,
              platform: platform,
              source_ip: event.source_ip
            });
            
            return {
              ...event,
              id: event.id || `event-${Math.random()}`,
              type: event.collection === 'scan_alerts' ? 'scan_detection' : 'deception_engine',
              platform: platform,
              severity: event.severity || 'medium',
              timestamp: new Date(event.timestamp || Date.now()),
              source: event.source_ip,
              target: event.dest_port || event.honeypot_id,
              status: 'new',
              message: event.message,
              alertType: event.note_type || event.event_type
            };
          });

          setThreats(legacyThreats);
        }
      }
    } catch (error) {
      console.error('Error loading threats:', error);
      setAllEvents([]);
      setFilteredEvents([]);
      setThreats([]);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, [useEnhancedFilters]);

  // Load threats on component mount and when filters change
  useEffect(() => {
    loadThreats();
  }, [loadThreats]);

  // Handle tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Reset filters when switching tabs
    setFilters({
      severity: 'all',
      platform: 'all',
      status: 'all',
      search: ''
    });
  };

  // Handle enhanced filter changes
  const handleEnhancedFilterChange = (newFilters) => {
    setFilteredEvents(newFilters);
  };

  // Handle legacy filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Apply filters to threats
  const applyFilters = (threatsList) => {
    return threatsList.filter(threat => {
      if (filters.severity !== 'all' && threat.severity !== filters.severity) return false;
      if (filters.platform !== 'all' && threat.platform !== filters.platform) return false;
      if (filters.status !== 'all' && threat.status !== filters.status) return false;
      if (filters.search && !threat.message?.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  };

  const filteredThreats = applyFilters(threats);

  // Handle threat click for detailed view
  const handleThreatClick = (threat) => {
    navigate(`/attack-detail/${threat.id}`, { 
      state: { threat, from: 'threats' } 
    });
  };

  // Export functionality
  const handleExport = () => {
    const dataToExport = useEnhancedFilters ? filteredEvents : filteredThreats;
    if (dataToExport.length > 0) {
      exportEventsToCSV(dataToExport, `threats-export-${new Date().toISOString().split('T')[0]}`);
    }
  };

  // Update time range
  const handleTimeRangeChange = (newTimeRange) => {
    setTimeRange(newTimeRange);
  };

  // Update client selection
  const handleClientChange = (newClient) => {
    setSelectedClient(newClient);
  };

  // Refresh data
  const handleRefresh = () => {
    loadThreats();
  };

  // Enhanced filter toggle
  const toggleEnhancedFilters = () => {
    setUseEnhancedFilters(!useEnhancedFilters);
  };

  const handleSaveView = (name) => {
    setSavedViews([...savedViews, { name, filters: { ...filters } }]);
  };

  const handleLoadView = (view) => {
    setFilters({ ...filters, ...view.filters });
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'alerts':
        return (
          <>
            {useEnhancedFilters ? (
              <EnhancedFilters
                events={allEvents}
                onFilterChange={handleEnhancedFilterChange}
                loading={loading}
                className="threats-enhanced-filters"
              />
            ) : (
              <ThreatFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                savedViews={savedViews}
                onSaveView={handleSaveView}
                onLoadView={handleLoadView}
                resultCount={filteredThreats.length}
              />
            )}

            <div className="threats-main">
              <ThreatTable
                threats={useEnhancedFilters ? filteredEvents.map(event => ({
                  ...event,
                  id: event.id || `event-${Math.random()}`,
                  type: event.collection === 'scan_alerts' ? 'scan_detection' : 'deception_engine',
                  platform: event.collection === 'scan_alerts' ? 'Scan_Detection_Engine' : 'Deception_Engine',
                  severity: event.severity || 'medium',
                  timestamp: new Date(event.timestamp || Date.now()),
                  source: event.source_ip,
                  target: event.dest_port || event.honeypot_id,
                  status: 'new',
                  message: event.message,
                  alertType: event.note_type || event.event_type
                })) : filteredThreats}
                loading={loading}
                onThreatClick={handleThreatClick}
              />
            </div>
          </>
        );

      case 'iocs':
        return <ThreatsIOCs events={allEvents} timeRange={timeRange} />;

      case 'ttps':
        return <ThreatsTTPs events={allEvents} timeRange={timeRange} />;

      case 'campaigns':
        return <ThreatsCampaigns events={allEvents} timeRange={timeRange} />;

      default:
        return null;
    }
  };

  return (
    <div className="threats-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Threat Intelligence</h1>
          <p>Monitor, analyze, and respond to security threats across all vectors</p>
        </div>
        <div className="header-actions">
          <button 
            className={`btn ${useEnhancedFilters ? 'btn-primary' : 'btn-secondary'}`}
            onClick={toggleEnhancedFilters}
          >
            🔧 {useEnhancedFilters ? 'Enhanced' : 'Basic'} Filters
          </button>
          <button className="btn btn-secondary" onClick={handleExport}>
            📊 Export ({useEnhancedFilters ? filteredEvents.length : filteredThreats.length})
          </button>
          <button className="btn btn-primary" onClick={handleRefresh}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <ThreatTabs activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="threats-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Threats;

