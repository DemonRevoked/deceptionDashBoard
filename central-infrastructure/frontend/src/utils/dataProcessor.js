// Enhanced data processing utilities for streamlined database structure
// Handles scan_alerts and deception_detection collections per Connection.md

/**
 * Normalize event data from different collections into a unified format
 */
export const normalizeEvent = (event, collection = 'auto') => {
  console.log('🔧 normalizeEvent called with:', { event, collection });
  
  // Auto-detect collection type if not specified
  if (collection === 'auto') {
    if (event.note_type && event.source_ip && event.dest_port) {
      collection = 'scan_alerts'; // Primary scan alerts collection
      console.log('🔧 Auto-detected collection: scan_alerts');
    } else if (event.note_type && event.source_ip && event.attack_category === 'honeypot_engagement') {
      collection = 'deception_detection'; // Honeypot deception detection
      console.log('🔧 Auto-detected collection: deception_detection');
    } else if (event.event_type && event.protocol && event.source_ip) {
      collection = 'legacy_events'; // Legacy events collection
      console.log('🔧 Auto-detected collection: legacy_events');
    } else {
      console.log('🔧 Could not auto-detect collection, using unknown');
      collection = 'unknown';
    }
  }

  const baseEvent = {
    id: event._id || event.id,
    timestamp: event.timestamp,
    collection: collection
  };

  console.log('🔧 Base event created:', baseEvent);

  switch (collection) {
    case 'scan_alerts':
      const scanAlert = {
        ...baseEvent,
        source_ip: event.source_ip || event.attackerIP,
        severity: event.severity || mapThreatLevelToSeverity(event.threatLevel || 'medium'),
        event_type: event.note_type || event.alertType,
        protocol: extractProtocolFromPort(event.dest_port),
        dest_port: event.dest_port,
        message: event.message,
        uid: event.uid,
        client_id: event.clientId,
        threat_level: event.threatLevel || event.severity || 'medium',
        source: event.source || 'enhanced_zeek',
        description: event.message || 'Network security alert',
        category: event.attack_category || 'network_scan',
        scan_type: event.details?.scan_type,
        user_agent: event.details?.user_agent,
        target_path: event.details?.path,
        method: event.details?.method
      };
      console.log('🔧 Normalized scan alert:', scanAlert);
      return scanAlert;

    case 'deception_detection':
      const deceptionEvent = {
        ...baseEvent,
        source_ip: event.source_ip || event.attackerIP,
        severity: event.severity || mapThreatLevelToSeverity(event.threatLevel || 'medium'),
        event_type: event.note_type || event.alertType,
        protocol: extractProtocolFromPort(event.dest_port),
        dest_port: event.dest_port,
        message: event.message,
        uid: event.uid,
        client_id: event.clientId,
        threat_level: event.threatLevel || event.severity || 'medium',
        source: event.source || 'deception_engine',
        description: event.message || 'Honeypot interaction detected',
        category: event.attack_category || 'honeypot_engagement',
        honeypot_id: event.dest_port,
        session_id: event.uid
      };
      console.log('🔧 Normalized deception event:', deceptionEvent);
      return deceptionEvent;

    case 'legacy_events':
      const legacyEvent = {
        ...baseEvent,
        source_ip: event.source_ip,
        severity: event.severity || 'medium',
        event_type: event.event_type || 'interaction',
        protocol: event.protocol,
        honeypot_id: event.honeypot_id,
        session_id: event.session_id,
        description: event.description || 'Legacy event',
        category: 'legacy_event'
      };
      console.log('🔧 Normalized legacy event:', legacyEvent);
      return legacyEvent;

    default:
      console.log('🔧 Using default event normalization');
      return baseEvent;
  }
};

/**
 * Generate human-readable description for events
 */
export const generateEventDescription = (event) => {
  if (event.event_type === 'nmap_recon') {
    return `Nmap reconnaissance scan detected${event.data?.scan_type ? ` (${event.data.scan_type})` : ''}`;
  }
  if (event.event_type === 'nmap_aggressive') {
    return `Nmap aggressive scan detected${event.data?.scan_type ? ` (${event.data.scan_type})` : ''}`;
  }
  if (event.event_type === 'login_attempt') {
    return `Login attempt on ${event.protocol || 'unknown'} service`;
  }
  if (event.event_type === 'command_execution') {
    return `Command execution attempt detected`;
  }
  if (event.event_type === 'file_transfer') {
    return `File transfer attempt on ${event.protocol || 'unknown'} service`;
  }
  if (event.event_type === 'session') {
    return `Interactive session on ${event.protocol || 'unknown'} service`;
  }
  return event.description || `${event.event_type || 'Unknown'} event detected`;
};

/**
 * Map threat levels to severity for consistency
 */
export const mapThreatLevelToSeverity = (threatLevel) => {
  const mapping = {
    'critical': 'high',
    'high': 'high',
    'medium': 'medium',
    'low': 'low',
    'info': 'low'
  };
  return mapping[threatLevel?.toLowerCase()] || 'medium';
};

/**
 * Extract protocol from port number or string (e.g., 22 -> "ssh", "80/tcp" -> "http")
 */
export const extractProtocolFromPort = (portInput) => {
  if (!portInput) return 'unknown';
  
  // Convert to string and handle both formats: number (80) or string ("80/tcp")
  const portString = String(portInput);
  const port = portString.split('/')[0];
  
  const protocolMap = {
    '22': 'ssh',
    '21': 'ftp',
    '23': 'telnet',
    '80': 'http',
    '443': 'https',
    '25': 'smtp',
    '53': 'dns',
    '110': 'pop3',
    '143': 'imap',
    '993': 'imaps',
    '995': 'pop3s'
  };
  
  return protocolMap[port] || portString;
};

/**
 * Get enhanced threat level based on event type and content
 */
export const getThreatLevel = (event) => {
  if (event.collection === 'scan_alerts') {
    return event.threat_level || event.severity || 'medium';
  }
  if (event.collection === 'deception_detection') {
    return event.threat_level || event.severity || 'medium';
  }
  if (event.collection === 'legacy_events') {
    switch (event.event_type) {
      case 'nmap_aggressive':
      case 'command_execution':
        return 'high';
      case 'nmap_recon':
      case 'login_attempt':
      case 'file_transfer':
        return 'medium';
      case 'session':
        return 'low';
      default:
        return event.severity || 'low';
    }
  }
  
  return event.severity || 'low';
};

/**
 * Get color for severity/threat level
 */
export const getSeverityColor = (severity) => {
  const colors = {
    'critical': '#dc3545',
    'high': '#dc3545',
    'medium': '#ffc107',
    'low': '#28a745',
    'info': '#17a2b8'
  };
  return colors[severity?.toLowerCase()] || colors.medium;
};

/**
 * Combine and sort events from multiple collections
 */
export const combineAndSortEvents = (eventCollections) => {
  const allEvents = [];
  
  // Process each collection
  Object.entries(eventCollections).forEach(([collection, events]) => {
    if (Array.isArray(events)) {
      events.forEach(event => {
        allEvents.push(normalizeEvent(event, collection));
      });
    }
  });
  
  // Sort by timestamp (newest first)
  return allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

/**
 * Calculate threat statistics for dashboard
 */
export const calculateThreatStats = (events) => {
  console.log('🔧 calculateThreatStats called with events:', events);
  
  const stats = {
    total: events.length,
    high: 0,
    medium: 0,
    low: 0,
    critical: 0,
    info: 0,
    byProtocol: {},
    byEventType: {},
    byCollection: {},
    nmapDetections: 0,
    activeIPs: new Set(),
    topAttackers: {}
  };
  
  console.log('🔧 Initial stats object:', stats);
  
  events.forEach((event, index) => {
    console.log(`🔧 Processing event ${index}:`, event);
    
    const severity = getThreatLevel(event);
    console.log(`🔧 Event ${index} severity:`, severity);
    
    stats[severity] = (stats[severity] || 0) + 1;
    
    // Protocol distribution
    if (event.protocol) {
      stats.byProtocol[event.protocol] = (stats.byProtocol[event.protocol] || 0) + 1;
    }
    
    // Event type distribution
    if (event.event_type) {
      stats.byEventType[event.event_type] = (stats.byEventType[event.event_type] || 0) + 1;
    }
    
    // Collection distribution
    stats.byCollection[event.collection] = (stats.byCollection[event.collection] || 0) + 1;
    
    // Nmap detection count
    if (event.event_type?.includes('nmap') || event.scan_type) {
      stats.nmapDetections++;
    }
    
    // Active IPs
    if (event.source_ip) {
      stats.activeIPs.add(event.source_ip);
      stats.topAttackers[event.source_ip] = (stats.topAttackers[event.source_ip] || 0) + 1;
    }
  });
  
  // Convert active IPs to count
  stats.uniqueIPs = stats.activeIPs.size;
  delete stats.activeIPs;
  
  // Sort top attackers
  stats.topAttackers = Object.entries(stats.topAttackers)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .reduce((obj, [ip, count]) => {
      obj[ip] = count;
      return obj;
    }, {});
  
  console.log('🔧 Final calculated stats:', stats);
  return stats;
};

/**
 * Create timeline data for charts
 */
export const createTimelineData = (events, hours = 24) => {
  const now = new Date();
  const timeSlots = {};
  
  // Initialize time slots
  for (let i = 0; i < hours; i++) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = time.getHours();
    const key = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')} ${String(hour).padStart(2, '0')}:00`;
    timeSlots[key] = {
      timestamp: key,
      total: 0,
      high: 0,
      medium: 0,
      low: 0,
      nmap: 0
    };
  }
  
  // Count events in each time slot
  events.forEach(event => {
    const eventTime = new Date(event.timestamp);
    const hour = eventTime.getHours();
    const key = `${eventTime.getFullYear()}-${String(eventTime.getMonth() + 1).padStart(2, '0')}-${String(eventTime.getDate()).padStart(2, '0')} ${String(hour).padStart(2, '0')}:00`;
    
    if (timeSlots[key]) {
      timeSlots[key].total++;
      const severity = getThreatLevel(event);
      timeSlots[key][severity] = (timeSlots[key][severity] || 0) + 1;
      
      if (event.event_type?.includes('nmap') || event.scan_type) {
        timeSlots[key].nmap++;
      }
    }
  });
  
  return Object.values(timeSlots).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

/**
 * Filter events by various criteria
 */
export const filterEvents = (events, filters) => {
  return events.filter(event => {
    // Severity filter
    if (filters.severity && filters.severity.length > 0) {
      const eventSeverity = getThreatLevel(event);
      if (!filters.severity.includes(eventSeverity)) return false;
    }
    
    // Protocol filter
    if (filters.protocol && filters.protocol.length > 0) {
      if (!filters.protocol.includes(event.protocol)) return false;
    }
    
    // Event type filter
    if (filters.eventType && filters.eventType.length > 0) {
      if (!filters.eventType.includes(event.event_type)) return false;
    }
    
    // Source IP filter
    if (filters.sourceIP && filters.sourceIP.trim()) {
      if (!event.source_ip?.includes(filters.sourceIP.trim())) return false;
    }
    
    // Collection filter
    if (filters.collection && filters.collection.length > 0) {
      if (!filters.collection.includes(event.collection)) return false;
    }
    
    // Time range filter
    if (filters.timeRange) {
      const eventTime = new Date(event.timestamp);
      const now = new Date();
      const hoursAgo = now.getTime() - (filters.timeRange * 60 * 60 * 1000);
      if (eventTime.getTime() < hoursAgo) return false;
    }
    
    // Search query filter
    if (filters.search && filters.search.trim()) {
      const query = filters.search.trim().toLowerCase();
      const searchableText = [
        event.source_ip,
        event.event_type,
        event.protocol,
        event.description,
        event.scan_type,
        event.user_agent,
        event.message
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) return false;
    }
    
    return true;
  });
};

/**
 * Export events to CSV format
 */
export const exportEventsToCSV = (events) => {
  const headers = [
    'Timestamp',
    'Source IP',
    'Event Type',
    'Severity',
    'Protocol',
    'Scan Type',
    'Description',
    'Collection',
    'Honeypot ID',
    'User Agent',
    'Target Path'
  ];
  
  const csvData = events.map(event => [
    event.timestamp,
    event.source_ip || '',
    event.event_type || '',
    getThreatLevel(event),
    event.protocol || '',
    event.scan_type || '',
    event.description || '',
    event.collection || '',
    event.honeypot_id || '',
    event.user_agent || '',
    event.target_path || ''
  ]);
  
  const csvContent = [headers, ...csvData]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  
  return csvContent;
};
