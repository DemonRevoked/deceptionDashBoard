const { ObjectId } = require('mongodb');

class DataProcessor {
  constructor(db) {
    this.db = db;
    // Only initialize collections if database is provided
    if (db) {
      this.eventsCol = db.collection('honeypot_events');
      this.honeypotsCol = db.collection('honeypots');
      this.threatSignaturesCol = db.collection('threat_signatures');
    } else {
      // VPS API mode - no local database
      this.eventsCol = null;
      this.honeypotsCol = null;
      this.threatSignaturesCol = null;
    }
  }

  // Process and normalize raw event data
  async processEventData(rawEvent) {
    try {
      const processed = {
        ...rawEvent,
        _id: rawEvent._id?.toString(),
        honeypot_id: rawEvent.honeypot_id?.toString() || rawEvent.honeypot_name || null,
        raw_log_id: rawEvent.raw_log_id?.toString() || null,
        timestamp: this.normalizeTimestamp(rawEvent.timestamp),
        start_time: this.normalizeTimestamp(rawEvent.start_time),
        end_time: this.normalizeTimestamp(rawEvent.end_time),
        serverTimestamp: this.normalizeTimestamp(rawEvent.serverTimestamp)
      };

      // Add computed fields
      processed.normalized = await this.normalizeEventData(processed);
      processed.insights = await this.generateEventInsights(processed);
      processed.threat_intelligence = await this.enhanceThreatIntelligence(processed);

      return processed;
    } catch (error) {
      console.error('Error processing event data:', error);
      return rawEvent; // Return original if processing fails
    }
  }

  // Process multiple events
  async processEventsData(rawEvents) {
    try {
      const processedEvents = await Promise.all(
        rawEvents.map(event => this.processEventData(event))
      );
      return processedEvents;
    } catch (error) {
      console.error('Error processing events data:', error);
      return rawEvents;
    }
  }

  // Normalize timestamp formats
  normalizeTimestamp(timestamp) {
    if (!timestamp) return null;
    
    try {
      if (timestamp instanceof Date) {
        return timestamp.toISOString();
      } else if (typeof timestamp === 'string') {
        return new Date(timestamp).toISOString();
      } else if (typeof timestamp === 'number') {
        return new Date(timestamp * 1000).toISOString();
      }
      return null;
    } catch (error) {
      console.warn('Invalid timestamp format:', timestamp);
      return null;
    }
  }

  // Normalize and standardize event data
  async normalizeEventData(event) {
    const normalized = {};

    // Normalize IP addresses
    normalized.source_ip = this.normalizeIPAddress(event.source_ip);
    normalized.destination_ip = this.normalizeIPAddress(event.destination_ip);
    
    // Normalize protocol
    normalized.protocol = this.normalizeProtocol(event.protocol);
    
    // Normalize event type
    normalized.event_type = this.normalizeEventType(event.event_type, event.protocol);
    
    // Normalize severity
    normalized.severity = this.normalizeSeverity(event.severity, event.threat_intelligence);
    
    // Add geolocation info
    normalized.geolocation = this.getGeolocationInfo(event.source_ip);
    
    // Normalize honeypot information
    normalized.honeypot_info = await this.getHoneypotInfo(event.honeypot_id, event.honeypot_name);
    
    // Normalize attack details
    normalized.attack_details = this.normalizeAttackDetails(event);
    
    return normalized;
  }

  // Normalize IP address format
  normalizeIPAddress(ip) {
    if (!ip) return null;
    
    // Handle IPv4 and IPv6
    if (typeof ip === 'string') {
      ip = ip.trim();
      
      // Check if it's a private IP
      if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
        return { ip, type: 'private', category: 'local_network' };
      } else if (ip.startsWith('127.')) {
        return { ip, type: 'private', category: 'localhost' };
      } else if (ip === '0.0.0.0') {
        return { ip, type: 'special', category: 'any_address' };
      } else {
        return { ip, type: 'public', category: 'external' };
      }
    }
    
    return { ip: String(ip), type: 'unknown', category: 'unknown' };
  }

  // Normalize protocol information
  normalizeProtocol(protocol) {
    if (!protocol) return 'unknown';
    
    const protocolMap = {
      'ssh': 'SSH',
      'telnet': 'Telnet',
      'ftp': 'FTP',
      'http': 'HTTP',
      'https': 'HTTPS',
      's7': 'S7',
      'modbus': 'Modbus',
      'dnp3': 'DNP3',
      'iec104': 'IEC 60870-5-104',
      'tcp': 'TCP',
      'udp': 'UDP'
    };
    
    const normalized = protocolMap[protocol.toLowerCase()] || protocol;
    return {
      original: protocol,
      normalized: normalized,
      category: this.getProtocolCategory(normalized)
    };
  }

  // Get protocol category
  getProtocolCategory(protocol) {
    const categories = {
      'SSH': 'IT_Protocol',
      'Telnet': 'IT_Protocol',
      'FTP': 'IT_Protocol',
      'HTTP': 'IT_Protocol',
      'HTTPS': 'IT_Protocol',
      'S7': 'OT_Protocol',
      'Modbus': 'OT_Protocol',
      'DNP3': 'OT_Protocol',
      'IEC 60870-5-104': 'OT_Protocol',
      'TCP': 'Transport_Protocol',
      'UDP': 'Transport_Protocol'
    };
    
    return categories[protocol] || 'Unknown';
  }

  // Normalize event type
  normalizeEventType(eventType, protocol) {
    if (!eventType) {
      // Infer event type from protocol if available
      if (protocol) {
        const protocolStr = typeof protocol === 'object' ? protocol.normalized : protocol;
        return this.inferEventTypeFromProtocol(protocolStr);
      }
      return 'unknown';
    }
    
    const eventTypeMap = {
      'connection': 'Connection_Attempt',
      'login': 'Authentication_Attempt',
      'command': 'Command_Execution',
      'scan': 'Port_Scan',
      'attack': 'Attack_Attempt',
      'session': 'Session_Data',
      'alert': 'Security_Alert'
    };
    
    return eventTypeMap[eventType.toLowerCase()] || eventType;
  }

  // Infer event type from protocol
  inferEventTypeFromProtocol(protocol) {
    const protocolEventMap = {
      'SSH': 'Authentication_Attempt',
      'Telnet': 'Authentication_Attempt',
      'FTP': 'Authentication_Attempt',
      'HTTP': 'Connection_Attempt',
      'S7': 'Connection_Attempt',
      'Modbus': 'Connection_Attempt'
    };
    
    return protocolEventMap[protocol] || 'Connection_Attempt';
  }

  // Normalize severity levels
  normalizeSeverity(severity, threatIntelligence) {
    if (severity) {
      const severityMap = {
        'low': 'Low',
        'medium': 'Medium',
        'high': 'High',
        'critical': 'Critical',
        'minimal': 'Minimal'
      };
      return severityMap[severity.toLowerCase()] || severity;
    }
    
    // Infer severity from threat intelligence
    if (threatIntelligence?.threat_level) {
      return this.normalizeSeverity(threatIntelligence.threat_level);
    }
    
    return 'Medium'; // Default severity
  }

  // Get geolocation information
  getGeolocationInfo(ipData) {
    if (!ipData || typeof ipData === 'string') {
      ipData = this.normalizeIPAddress(ipData);
    }
    
    if (!ipData || ipData.type === 'private') {
      return {
        country: 'Local Network',
        region: 'Internal',
        city: 'Internal',
        coordinates: null,
        isp: 'Internal'
      };
    }
    
    // For external IPs, you would integrate with a geolocation service
    // For now, return basic structure
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      coordinates: null,
      isp: 'Unknown'
    };
  }

  // Get honeypot information
  async getHoneypotInfo(honeypotId, honeypotName) {
    try {
      // In VPS API mode, return basic honeypot info without database access
      if (!this.db || !this.honeypotsCol) {
        return {
          id: honeypotId || 'unknown',
          name: honeypotName || 'Unknown',
          type: 'Unknown',
          category: 'Unknown',
          status: 'Unknown',
          port: null,
          description: null
        };
      }
      
      let honeypot = null;
      
      if (honeypotId && ObjectId.isValid(honeypotId)) {
        honeypot = await this.honeypotsCol.findOne({ _id: new ObjectId(honeypotId) });
      } else if (honeypotName) {
        honeypot = await this.honeypotsCol.findOne({ name: honeypotName });
      }
      
      if (honeypot) {
        return {
          id: honeypot._id.toString(),
          name: honeypot.name,
          type: honeypot.type,
          category: honeypot.category,
          status: honeypot.status,
          port: honeypot.port,
          description: honeypot.description
        };
      }
      
      return {
        id: honeypotId,
        name: honeypotName,
        type: 'Unknown',
        category: 'Unknown',
        status: 'Unknown',
        port: null,
        description: null
      };
    } catch (error) {
      console.error('Error getting honeypot info:', error);
      return {
        id: honeypotId,
        name: honeypotName,
        type: 'Unknown',
        category: 'Unknown',
        status: 'Unknown',
        port: null,
        description: null
      };
    }
  }

  // Normalize attack details
  normalizeAttackDetails(event) {
    const details = {};
    
    if (event.data?.commands) {
      details.commands = event.data.commands.map(cmd => ({
        command: cmd.command || cmd,
        timestamp: this.normalizeTimestamp(cmd.timestamp),
        output: cmd.output || null,
        exit_code: cmd.exit_code || null
      }));
    }
    
    if (event.data?.credentials) {
      details.credentials = {
        username: event.data.credentials.username || null,
        password: event.data.credentials.password || null,
        success: event.data.credentials.success || false
      };
    }
    
    if (event.data?.ports) {
      details.ports = {
        scanned: event.data.ports.scanned || event.data.ports,
        open: event.data.ports.open || [],
        closed: event.data.ports.closed || []
      };
    }
    
    if (event.data?.session_data) {
      details.session_data = {
        duration: event.data.session_data.duration || null,
        commands_count: event.data.session_data.commands_count || 0,
        files_accessed: event.data.session_data.files_accessed || []
      };
    }
    
    return details;
  }

  // Generate insights from event data
  async generateEventInsights(event) {
    const insights = {
      risk_score: this.calculateRiskScore(event),
      attack_pattern: this.identifyAttackPattern(event),
      threat_indicators: this.extractThreatIndicators(event),
      behavioral_analysis: this.analyzeBehavior(event),
      correlation_opportunities: await this.identifyCorrelations(event)
    };
    
    return insights;
  }

  // Calculate risk score
  calculateRiskScore(event) {
    let score = 0;
    
    // Base score from severity
    const severityScores = { 'Minimal': 1, 'Low': 2, 'Medium': 3, 'High': 4, 'Critical': 5 };
    score += severityScores[event.normalized?.severity] || 3;
    
    // Add score for attack details
    if (event.normalized?.attack_details?.commands?.length > 0) {
      score += Math.min(event.normalized.attack_details.commands.length, 5);
    }
    
    // Add score for external IP
    if (event.normalized?.geolocation?.country !== 'Local Network') {
      score += 2;
    }
    
    // Add score for successful authentication
    if (event.normalized?.attack_details?.credentials?.success) {
      score += 3;
    }
    
    return Math.min(score, 10); // Cap at 10
  }

  // Identify attack patterns
  identifyAttackPattern(event) {
    const patterns = [];
    
    if (event.normalized?.attack_details?.commands?.length > 5) {
      patterns.push('Command_Flood');
    }
    
    if (event.normalized?.attack_details?.ports?.scanned?.length > 100) {
      patterns.push('Port_Scanning');
    }
    
    if (event.normalized?.attack_details?.credentials?.success) {
      patterns.push('Successful_Authentication');
    }
    
    if (event.normalized?.protocol?.category === 'OT_Protocol') {
      patterns.push('OT_Targeting');
    }
    
    return patterns.length > 0 ? patterns : ['Standard_Attack'];
  }

  // Extract threat indicators
  extractThreatIndicators(event) {
    const indicators = [];
    
    // Command-based indicators
    if (event.normalized?.attack_details?.commands) {
      const suspiciousCommands = ['rm', 'dd', 'format', 'shutdown', 'reboot', 'kill'];
      event.normalized.attack_details.commands.forEach(cmd => {
        if (suspiciousCommands.some(suspicious => cmd.command.includes(suspicious))) {
          indicators.push(`Suspicious_Command:${cmd.command}`);
        }
      });
    }
    
    // Port-based indicators
    if (event.normalized?.attack_details?.ports?.scanned) {
      const criticalPorts = [22, 23, 21, 80, 443, 3389, 5900];
      const criticalScanned = event.normalized.attack_details.ports.scanned.filter(port => 
        criticalPorts.includes(parseInt(port))
      );
      if (criticalScanned.length > 0) {
        indicators.push(`Critical_Port_Scan:${criticalScanned.join(',')}`);
      }
    }
    
    // Protocol-based indicators
    if (event.normalized?.protocol?.category === 'OT_Protocol') {
      indicators.push('OT_Protocol_Access');
    }
    
    return indicators;
  }

  // Analyze behavior patterns
  analyzeBehavior(event) {
    const behavior = {
      aggressiveness: 'Low',
      sophistication: 'Low',
      persistence: 'Low',
      target_focus: 'General'
    };
    
    // Analyze aggressiveness
    if (event.normalized?.attack_details?.commands?.length > 10) {
      behavior.aggressiveness = 'High';
    } else if (event.normalized?.attack_details?.commands?.length > 5) {
      behavior.aggressiveness = 'Medium';
    }
    
    // Analyze sophistication
    if (event.normalized?.attack_details?.credentials?.success) {
      behavior.sophistication = 'Medium';
    }
    
    // Analyze persistence
    if (event.normalized?.attack_details?.session_data?.duration > 300) { // 5 minutes
      behavior.persistence = 'Medium';
    }
    
    // Analyze target focus
    if (event.normalized?.protocol?.category === 'OT_Protocol') {
      behavior.target_focus = 'OT_Specific';
    }
    
    return behavior;
  }

  // Identify correlation opportunities
  async identifyCorrelations(event) {
    const correlations = [];
    
    try {
      // In VPS API mode, skip database-dependent correlations
      if (!this.db || !this.eventsCol) {
        // Return basic correlations based on event data
        if (event.source_ip) {
          correlations.push({
            type: 'IP_Repetition',
            count: 1,
            time_span: '24h',
            note: 'VPS API mode - limited correlation data'
          });
        }
        
        if (event.honeypot_id || event.honeypot_name) {
          correlations.push({
            type: 'Honeypot_Targeting',
            count: 1,
            time_span: '24h',
            note: 'VPS API mode - limited correlation data'
          });
        }
        
        return correlations;
      }
      
      // Find similar attacks from same IP
      const similarAttacks = await this.eventsCol.find({
        source_ip: event.source_ip,
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }).toArray();
      
      if (similarAttacks.length > 1) {
        correlations.push({
          type: 'IP_Repetition',
          count: similarAttacks.length,
          time_span: '24h'
        });
      }
      
      // Find attacks on same honeypot
      if (event.honeypot_id || event.honeypot_name) {
        const honeypotAttacks = await this.eventsCol.find({
          $or: [
            { honeypot_id: event.honeypot_id },
            { honeypot_name: event.honeypot_name }
          ],
          timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }).toArray();
        
        if (honeypotAttacks.length > 1) {
          correlations.push({
            type: 'Honeypot_Targeting',
            count: honeypotAttacks.length,
            time_span: '24h'
          });
        }
      }
      
    } catch (error) {
      console.error('Error identifying correlations:', error);
    }
    
    return correlations;
  }

  // Enhance threat intelligence
  async enhanceThreatIntelligence(event) {
    let threatIntel = event.threat_intelligence || {};
    
    // Add computed threat level if not present
    if (!threatIntel.threat_level) {
      threatIntel.threat_level = this.calculateThreatLevel(event);
    }
    
    // Add confidence score
    threatIntel.confidence = this.calculateConfidence(event);
    
    // Add threat category
    threatIntel.category = this.categorizeThreat(event);
    
    // Add recommended actions
    threatIntel.recommended_actions = this.getRecommendedActions(event);
    
    return threatIntel;
  }

  // Calculate threat level
  calculateThreatLevel(event) {
    const riskScore = this.calculateRiskScore(event);
    
    if (riskScore >= 8) return 'Critical';
    if (riskScore >= 6) return 'High';
    if (riskScore >= 4) return 'Medium';
    if (riskScore >= 2) return 'Low';
    return 'Minimal';
  }

  // Calculate confidence score
  calculateConfidence(event) {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence for well-structured events
    if (event.normalized?.attack_details?.commands) confidence += 0.2;
    if (event.normalized?.attack_details?.credentials) confidence += 0.2;
    if (event.normalized?.geolocation?.country !== 'Local Network') confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  // Categorize threat
  categorizeThreat(event) {
    if (event.normalized?.protocol?.category === 'OT_Protocol') {
      return 'OT_Threat';
    }
    
    if (event.normalized?.attack_details?.credentials?.success) {
      return 'Authentication_Breach';
    }
    
    if (event.normalized?.attack_details?.commands?.length > 0) {
      return 'Command_Execution';
    }
    
    if (event.normalized?.attack_details?.ports?.scanned?.length > 0) {
      return 'Reconnaissance';
    }
    
    return 'General_Attack';
  }

  // Get recommended actions
  getRecommendedActions(event) {
    const actions = [];
    
    if (event.normalized?.severity === 'Critical' || event.normalized?.severity === 'High') {
      actions.push('Immediate_Response_Required');
      actions.push('Block_Source_IP');
      actions.push('Notify_Security_Team');
    }
    
    if (event.normalized?.protocol?.category === 'OT_Protocol') {
      actions.push('OT_Security_Review');
      actions.push('Check_OT_Network_Isolation');
    }
    
    if (event.normalized?.attack_details?.credentials?.success) {
      actions.push('Credential_Reset_Required');
      actions.push('Review_Authentication_Logs');
    }
    
    if (event.normalized?.geolocation?.country !== 'Local Network') {
      actions.push('Geographic_Blocking_Consideration');
    }
    
    return actions.length > 0 ? actions : ['Monitor_Closely'];
  }

  // Process dashboard summary data
  async processDashboardSummary(timeRange = 24) {
    try {
      // In VPS API mode, return empty summary since we don't have local database access
      if (!this.db || !this.eventsCol) {
        return {
          total_events: 0,
          threat_levels: {},
          attack_types: {},
          geographic_distribution: {},
          protocol_distribution: {},
          time_series: [],
          top_attackers: [],
          recent_alerts: [],
          note: 'VPS API mode - no local database access'
        };
      }
      
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - timeRange);
      
      const events = await this.eventsCol.find({
        timestamp: { $gte: startTime }
      }).toArray();
      
      const processedEvents = await this.processEventsData(events);
      
      return {
        total_events: processedEvents.length,
        threat_levels: this.aggregateThreatLevels(processedEvents),
        attack_types: this.aggregateAttackTypes(processedEvents),
        geographic_distribution: this.aggregateGeographicData(processedEvents),
        protocol_distribution: this.aggregateProtocolData(processedEvents),
        time_series: this.createTimeSeries(processedEvents, timeRange),
        top_attackers: this.getTopAttackers(processedEvents),
        recent_alerts: this.getRecentAlerts(processedEvents)
      };
    } catch (error) {
      console.error('Error processing dashboard summary:', error);
      return {};
    }
  }

  // Aggregate threat levels
  aggregateThreatLevels(events) {
    const levels = {};
    events.forEach(event => {
      const level = event.normalized?.severity || 'Unknown';
      levels[level] = (levels[level] || 0) + 1;
    });
    return levels;
  }

  // Aggregate attack types
  aggregateAttackTypes(events) {
    const types = {};
    events.forEach(event => {
      const type = event.normalized?.event_type || 'Unknown';
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }

  // Aggregate geographic data
  aggregateGeographicData(events) {
    const geo = {};
    events.forEach(event => {
      const country = event.normalized?.geolocation?.country || 'Unknown';
      geo[country] = (geo[country] || 0) + 1;
    });
    return geo;
  }

  // Aggregate protocol data
  aggregateProtocolData(events) {
    const protocols = {};
    events.forEach(event => {
      const protocol = event.normalized?.protocol?.normalized || 'Unknown';
      protocols[protocol] = (protocols[protocol] || 0) + 1;
    });
    return protocols;
  }

  // Create time series data
  createTimeSeries(events, hours) {
    const timeSlots = {};
    const now = new Date();
    
    // Initialize time slots
    for (let i = 0; i < hours; i++) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hour = time.getHours();
      timeSlots[hour] = 0;
    }
    
    // Count events in each time slot
    events.forEach(event => {
      const eventTime = new Date(event.timestamp);
      const hour = eventTime.getHours();
      if (timeSlots.hasOwnProperty(hour)) {
        timeSlots[hour]++;
      }
    });
    
    return Object.entries(timeSlots).map(([hour, count]) => ({ hour: parseInt(hour), count }));
  }

  // Get top attackers
  getTopAttackers(events) {
    const attackers = {};
    events.forEach(event => {
      const ip = event.normalized?.source_ip?.ip || event.source_ip;
      if (ip) {
        if (!attackers[ip]) {
          attackers[ip] = {
            ip,
            count: 0,
            threat_levels: new Set(),
            protocols: new Set(),
            last_seen: null
          };
        }
        
        attackers[ip].count++;
        if (event.normalized?.severity) {
          attackers[ip].threat_levels.add(event.normalized.severity);
        }
        if (event.normalized?.protocol?.normalized) {
          attackers[ip].protocols.add(event.normalized.protocol.normalized);
        }
        if (event.timestamp) {
          const eventTime = new Date(event.timestamp);
          if (!attackers[ip].last_seen || eventTime > new Date(attackers[ip].last_seen)) {
            attackers[ip].last_seen = event.timestamp;
          }
        }
      }
    });
    
    return Object.values(attackers)
      .map(attacker => ({
        ...attacker,
        threat_levels: Array.from(attacker.threat_levels),
        protocols: Array.from(attacker.protocols)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // Get recent alerts
  getRecentAlerts(events) {
    return events
      .filter(event => event.normalized?.severity === 'High' || event.normalized?.severity === 'Critical')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20)
      .map(event => ({
        id: event._id,
        timestamp: event.timestamp,
        severity: event.normalized?.severity,
        source_ip: event.normalized?.source_ip?.ip,
        event_type: event.normalized?.event_type,
        honeypot: event.normalized?.honeypot_info?.name,
        description: this.generateAlertDescription(event)
      }));
  }

  // Generate alert description
  generateAlertDescription(event) {
    const parts = [];
    
    if (event.normalized?.severity) {
      parts.push(`${event.normalized.severity} severity`);
    }
    
    if (event.normalized?.event_type) {
      parts.push(`${event.normalized.event_type.toLowerCase().replace(/_/g, ' ')}`);
    }
    
    if (event.normalized?.source_ip?.ip) {
      parts.push(`from ${event.normalized.source_ip.ip}`);
    }
    
    if (event.normalized?.honeypot_info?.name) {
      parts.push(`on ${event.normalized.honeypot_info.name}`);
    }
    
    return parts.join(' ');
  }
}

module.exports = DataProcessor;
