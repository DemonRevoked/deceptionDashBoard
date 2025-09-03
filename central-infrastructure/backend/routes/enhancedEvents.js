const express = require('express');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const DataProcessor = require('../services/dataProcessor');
const { authenticateClient, authenticateAdmin } = require('../middleware/clientAuth');

// Middleware to handle both admin and client authentication
const authenticateEnhancedAccess = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Admin users can access all data
    if (req.user.role === 'admin') {
      req.clientId = 'admin'; // Special identifier for admin
      return next();
    }

    // Client users need to have a client_id
    if (!req.user.client_id) {
      return res.status(403).json({ message: 'Access denied: No client ID associated with user' });
    }

    // Store client ID for route handlers
    req.clientId = req.user.client_id;

    // Skip client verification for now - trust the JWT token's client_id
    // TODO: Implement proper client verification when VPS API client endpoints are available
    console.log(`🔐 Client user ${req.user.username} authenticated with client_id: ${req.user.client_id}`);

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Token expired' });
    }
    return res.status(500).json({ message: 'Authentication error' });
  }
};

const router = express.Router();

module.exports = function(vpsApi) {
  const dataProcessor = new DataProcessor(null); // No local database needed for VPS API mode

  // GET: Enhanced events with processed data from VPS API
  router.get('/', authenticateEnhancedAccess, async (req, res) => {
    try {
      console.log(`🔍 Fetching enhanced events for client ${req.clientId} from VPS API with query:`, req.query);
      const { 
        protocol, 
        honeypot_id, 
        source_ip, 
        event_type, 
        category, 
        severity,
        limit = 100,
        include_insights = 'true',
        include_analytics = 'true'
      } = req.query;

      // Only allow these event types to be returned
      const allowedEventTypes = new Set(['scan_alerts', 'deception_detection']);

      // Get collections list from VPS API
      const collections = await vpsApi.getCollectionsList();
      console.log('📚 Available collections:', collections.collections?.map(c => c.name) || []);

      // Filter collections based on user type
      let clientCollections;
      if (req.clientId === 'admin') {
        // Admin users: restrict to only required collections
        clientCollections = (collections.collections || []).filter(c =>
          c.name === 'scan_alerts' || c.name === 'deception_detection' || c.name.startsWith('client_')
        );
        console.log(`🔓 Admin user can access filtered collections:`, clientCollections.map(c => c.name));
      } else {
        // Client users can only access their specific collections and system collections
        clientCollections = (collections.collections || []).filter(c => 
          c.name === `scan_alerts` ||
          c.name === `deception_detection` ||
          c.name === `client_${req.clientId}`
        );
        console.log(`🔒 Client ${req.clientId} can access collections:`, clientCollections.map(c => c.name));
      }

      // Get data from relevant collections
      let allEvents = [];
      
      for (const collection of clientCollections) {
        try {
          // Build filters for VPS API
          const filters = { limit: Math.ceil(limit / clientCollections.length) };
          if (protocol) filters.protocol = protocol;
          if (source_ip) filters.source_ip = source_ip;
          if (event_type) filters.event_type = event_type;
          if (severity) filters.severity = severity;
          
          // For client collections, ensure we only get data for this specific client
          if (collection.name.startsWith('client_') && req.clientId !== 'admin') {
            filters.client_id = req.clientId;
          }
          
          const collectionData = await vpsApi.getCollectionDetails(collection.name, filters);
          console.log(`📄 Retrieved ${collectionData.data?.length || 0} events from ${collection.name} for client ${req.clientId}`);
          
          if (collectionData.data && collectionData.data.length > 0) {
            // Transform VPS API data to match expected format
            const transformedEvents = collectionData.data.map(event => {
              const rawType = String(event.data_type || event.event_type || '').toLowerCase();
              // Infer type from collection when applicable
              const inferredType = (collection.name === 'scan_alerts' || collection.name === 'deception_detection')
                ? collection.name
                : rawType;
              return ({
                _id: event._id || event.data_id,
                timestamp: event.timestamp,
                source_ip: event.source_ip,
                destination_ip: event.destination_ip,
                port: event.port,
                protocol: event.protocol,
                severity: event.severity,
                event_type: inferredType,
                description: event.description,
                payload: event.payload,
                metadata: event.metadata,
                client_id: event.client_id,
                created_at: event.created_at,
                processed: event.processed,
                vpn_server_id: event.vpn_server_id,
                honeypot_id: event.honeypot_id || collection.name,
                honeypot_name: collection.name
              });
            });
            
            // Filter to only include allowed event types
            const filteredEvents = transformedEvents.filter(e =>
              e.event_type && allowedEventTypes.has(String(e.event_type).toLowerCase())
            );

            allEvents = allEvents.concat(filteredEvents);
          }
        } catch (error) {
          console.warn(`⚠️  Failed to retrieve data from collection ${collection.name}:`, error.message);
        }
      }

      console.log(`📊 Total events retrieved: ${allEvents.length}`);

      // Apply additional filtering if needed
      if (honeypot_id) {
        allEvents = allEvents.filter(event => 
          event.honeypot_id === honeypot_id || 
          event.honeypot_name === honeypot_id
        );
      }

      // Sort by timestamp and limit results
      allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      allEvents = allEvents.slice(0, limit);

      // Process events with data processor
      const processedEvents = await dataProcessor.processEventsData(allEvents);

      // Prepare response
      const response = {
        events: processedEvents,
        metadata: {
          total: processedEvents.length,
          query: req.query,
          processing_time: new Date().toISOString(),
          source: 'vps_api',
          collections_queried: clientCollections.map(c => c.name) || []
        }
      };

      // Add analytics if requested
      if (include_analytics === 'true') {
        response.analytics = {
          threat_distribution: dataProcessor.aggregateThreatLevels(processedEvents),
          attack_type_distribution: dataProcessor.aggregateAttackTypes(processedEvents),
          geographic_distribution: dataProcessor.aggregateGeographicData(processedEvents),
          protocol_distribution: dataProcessor.aggregateProtocolData(processedEvents),
          top_attackers: dataProcessor.getTopAttackers(processedEvents)
        };
      }

      res.json(response);
    } catch (error) {
      console.error('❌ Error fetching enhanced events from VPS API:', error);
      res.status(500).json({ 
        error: 'Failed to fetch enhanced events from VPS API',
        details: error.message 
      });
    }
  });

  // GET: Enhanced recent events (last N hours)
  router.get('/recent', authenticateEnhancedAccess, async (req, res) => {
    try {
      const { 
        hours = 24, 
        limit = 100,
        include_insights = 'true',
        include_analytics = 'true'
      } = req.query;

      // Calculate time filter
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - Number(hours));

      const query = {
        timestamp: { $gte: startTime }
      };

      console.log('Enhanced recent events query:', JSON.stringify(query, null, 2));
      
      // Fetch raw events
      const rawEvents = await vpsApi.getCollectionDetails('events', query); // Assuming 'events' is the collection name

      console.log(`Found ${rawEvents.data?.length || 0} recent raw events`);

      // Process events
      const processedEvents = await dataProcessor.processEventsData(rawEvents.data || []);

      // Prepare response
      const response = {
        events: processedEvents,
        metadata: {
          time_range: `${hours}h`,
          total: processedEvents.length,
          start_time: startTime.toISOString(),
          end_time: new Date().toISOString(),
          processing_time: new Date().toISOString()
        }
      };

      // Add analytics if requested
      if (include_analytics === 'true') {
        response.analytics = {
          threat_distribution: dataProcessor.aggregateThreatLevels(processedEvents),
          attack_type_distribution: dataProcessor.aggregateAttackTypes(processedEvents),
          geographic_distribution: dataProcessor.aggregateGeographicData(processedEvents),
          protocol_distribution: dataProcessor.aggregateProtocolData(processedEvents),
          time_series: dataProcessor.createTimeSeries(processedEvents, Number(hours)),
          top_attackers: dataProcessor.getTopAttackers(processedEvents),
          recent_alerts: dataProcessor.getRecentAlerts(processedEvents)
        };
      }

      res.json(response);
    } catch (error) {
      console.error('Error fetching enhanced recent events:', error);
      res.status(500).json({ 
        error: 'Failed to fetch enhanced recent events',
        details: error.message 
      });
    }
  });

  // GET: Enhanced event by ID with full processing
  router.get('/:id', authenticateEnhancedAccess, async (req, res) => {
    try {
      const { id } = req.params;
      const { include_insights = 'true', include_correlations = 'true' } = req.query;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid event ID' });
      }

      // Fetch raw event
      const rawEvent = await vpsApi.getCollectionDetails('events', { _id: id }); // Assuming 'events' is the collection name
      if (!rawEvent.data || rawEvent.data.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Process event with full insights
      const processedEvent = await dataProcessor.processEventData(rawEvent.data[0]);

      // Prepare response
      const response = {
        event: processedEvent,
        metadata: {
          processing_time: new Date().toISOString(),
          includes_insights: include_insights === 'true',
          includes_correlations: include_correlations === 'true'
        }
      };

      // Add correlations if requested
      if (include_correlations === 'true') {
        response.correlations = await dataProcessor.identifyCorrelations(processedEvent);
      }

      res.json(response);
    } catch (error) {
      console.error('Error fetching enhanced event:', error);
      res.status(500).json({ 
        error: 'Failed to fetch enhanced event',
        details: error.message 
      });
    }
  });

  // GET: Enhanced dashboard summary
  router.get('/dashboard/summary', authenticateEnhancedAccess, async (req, res) => {
    try {
      const { time_range = 24 } = req.query;
      
      console.log('Generating enhanced dashboard summary for', time_range, 'hours');
      
      const summary = await dataProcessor.processDashboardSummary(Number(time_range));
      
      res.json({
        summary,
        metadata: {
          time_range: `${time_range}h`,
          generated_at: new Date().toISOString(),
          data_source: 'enhanced_events'
        }
      });
    } catch (error) {
      console.error('Error generating enhanced dashboard summary:', error);
      res.status(500).json({ 
        error: 'Failed to generate enhanced dashboard summary',
        details: error.message 
      });
    }
  });

  // GET: Enhanced threat intelligence summary
  router.get('/threat-intelligence/summary', authenticateEnhancedAccess, async (req, res) => {
    try {
      const { time_range = 24, limit = 50 } = req.query;
      
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - Number(time_range));

      // Fetch events with threat intelligence
      const events = await vpsApi.getCollectionDetails('events', {
        timestamp: { $gte: startTime },
        'threat_intelligence.threat_level': { $exists: true }
      }); // Assuming 'events' is the collection name

      // Process events
      const processedEvents = await dataProcessor.processEventsData(events.data || []);

      // Extract threat intelligence insights
      const threatInsights = {
        total_threats: processedEvents.length,
        threat_levels: {},
        threat_categories: {},
        confidence_distribution: {},
        recommended_actions: {},
        top_threat_indicators: {},
        geographic_threat_distribution: {}
      };

      processedEvents.forEach(event => {
        const threatIntel = event.threat_intelligence;
        if (threatIntel) {
          // Threat levels
          const level = threatIntel.threat_level;
          threatInsights.threat_levels[level] = (threatInsights.threat_levels[level] || 0) + 1;

          // Threat categories
          const category = threatIntel.category;
          threatInsights.threat_categories[category] = (threatInsights.threat_categories[category] || 0) + 1;

          // Confidence distribution
          const confidence = Math.round(threatIntel.confidence * 10) / 10;
          threatInsights.confidence_distribution[confidence] = (threatInsights.confidence_distribution[confidence] || 0) + 1;

          // Recommended actions
          if (threatIntel.recommended_actions) {
            threatIntel.recommended_actions.forEach(action => {
              threatInsights.recommended_actions[action] = (threatInsights.recommended_actions[action] || 0) + 1;
            });
          }

          // Threat indicators
          if (event.insights?.threat_indicators) {
            event.insights.threat_indicators.forEach(indicator => {
              threatInsights.top_threat_indicators[indicator] = (threatInsights.top_threat_indicators[indicator] || 0) + 1;
            });
          }

          // Geographic distribution
          const country = event.normalized?.geolocation?.country || 'Unknown';
          threatInsights.geographic_threat_distribution[country] = (threatInsights.geographic_threat_distribution[country] || 0) + 1;
        }
      });

      res.json({
        threat_intelligence: threatInsights,
        metadata: {
          time_range: `${time_range}h`,
          generated_at: new Date().toISOString(),
          data_source: 'enhanced_events'
        }
      });
    } catch (error) {
      console.error('Error generating threat intelligence summary:', error);
      res.status(500).json({ 
        error: 'Failed to generate threat intelligence summary',
        details: error.message 
      });
    }
  });

  // GET: Enhanced attack pattern analysis
  router.get('/analysis/attack-patterns', authenticateEnhancedAccess, async (req, res) => {
    try {
      const { time_range = 24, min_occurrences = 2 } = req.query;
      
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - Number(time_range));

      // Fetch events
      const events = await vpsApi.getCollectionDetails('events', {
        timestamp: { $gte: startTime }
      }); // Assuming 'events' is the collection name

      // Process events
      const processedEvents = await dataProcessor.processEventsData(events.data || []);

      // Analyze attack patterns
      const patternAnalysis = {
        total_events: processedEvents.length,
        time_range: `${time_range}h`,
        patterns: {},
        behavioral_analysis: {},
        correlation_analysis: {},
        threat_evolution: {}
      };

      // Group events by patterns
      processedEvents.forEach(event => {
        const patterns = event.insights?.attack_pattern || ['Standard_Attack'];
        patterns.forEach(pattern => {
          if (!patternAnalysis.patterns[pattern]) {
            patternAnalysis.patterns[pattern] = {
              count: 0,
              events: [],
              source_ips: new Set(),
              honeypots: new Set(),
              protocols: new Set(),
              threat_levels: new Set()
            };
          }
          
          patternAnalysis.patterns[pattern].count++;
          patternAnalysis.patterns[pattern].events.push(event._id);
          if (event.normalized?.source_ip?.ip) {
            patternAnalysis.patterns[pattern].source_ips.add(event.normalized.source_ip.ip);
          }
          if (event.normalized?.honeypot_info?.name) {
            patternAnalysis.patterns[pattern].honeypots.add(event.normalized.honeypot_info.name);
          }
          if (event.normalized?.protocol?.normalized) {
            patternAnalysis.patterns[pattern].protocols.add(event.normalized.protocol.normalized);
          }
          if (event.normalized?.severity) {
            patternAnalysis.patterns[pattern].threat_levels.add(event.normalized.severity);
          }
        });
      });

      // Convert Sets to arrays and filter by minimum occurrences
      Object.keys(patternAnalysis.patterns).forEach(pattern => {
        const patternData = patternAnalysis.patterns[pattern];
        if (patternData.count >= min_occurrences) {
          patternAnalysis.patterns[pattern] = {
            count: patternData.count,
            events: patternData.events,
            source_ips: Array.from(patternData.source_ips),
            honeypots: Array.from(patternData.honeypots),
            protocols: Array.from(patternData.protocols),
            threat_levels: Array.from(patternData.threat_levels),
            risk_score: calculatePatternRiskScore(patternData)
          };
        } else {
          delete patternAnalysis.patterns[pattern];
        }
      });

      // Behavioral analysis
      processedEvents.forEach(event => {
        const behavior = event.insights?.behavioral_analysis;
        if (behavior) {
          Object.keys(behavior).forEach(behaviorType => {
            const value = behavior[behaviorType];
            if (!patternAnalysis.behavioral_analysis[behaviorType]) {
              patternAnalysis.behavioral_analysis[behaviorType] = {};
            }
            patternAnalysis.behavioral_analysis[behaviorType][value] = 
              (patternAnalysis.behavioral_analysis[behaviorType][value] || 0) + 1;
          });
        }
      });

      res.json({
        attack_patterns: patternAnalysis,
        metadata: {
          time_range: `${time_range}h`,
          min_occurrences: Number(min_occurrences),
          generated_at: new Date().toISOString(),
          data_source: 'enhanced_events'
        }
      });
    } catch (error) {
      console.error('Error analyzing attack patterns:', error);
      res.status(500).json({ 
        error: 'Failed to analyze attack patterns',
        details: error.message 
      });
    }
  });

  // GET: IP Activity Timeline for TTP Analysis
  router.get('/analysis/ip-timeline/:ip', authenticateEnhancedAccess, async (req, res) => {
    try {
      const { ip } = req.params;
      const { time_range = 24 } = req.query;
      
      console.log(`🔍 Fetching activity timeline for IP: ${ip} over ${time_range} hours`);
      
      // Get collections list from VPS API
      const collections = await vpsApi.getCollectionsList();
      
      // Filter collections based on user type (same logic as main endpoint)
      let clientCollections;
      if (req.clientId === 'admin') {
        clientCollections = (collections.collections || []).filter(c =>
          c.name === 'scan_alerts' || c.name === 'deception_detection' || c.name.startsWith('client_')
        );
      } else {
        clientCollections = (collections.collections || []).filter(c => 
          c.name === 'scan_alerts' ||
          c.name === 'deception_detection' ||
          c.name === `client_${req.clientId}`
        );
      }

      let allEvents = [];
      const allowedEventTypes = new Set(['scan_alerts', 'deception_detection']);

      // Fetch events from all collections for the specific IP
      for (const collection of clientCollections) {
        try {
          const filters = { 
            source_ip: ip,
            limit: 1000 // Get more events for timeline analysis
          };
          
          // For client collections, ensure we only get data for this specific client
          if (collection.name.startsWith('client_') && req.clientId !== 'admin') {
            filters.client_id = req.clientId;
          }
          
          const collectionData = await vpsApi.getCollectionDetails(collection.name, filters);
          console.log(`📄 Retrieved ${collectionData.data?.length || 0} events for IP ${ip} from ${collection.name}`);
          
          if (collectionData.data && collectionData.data.length > 0) {
            const transformedEvents = collectionData.data.map(event => {
              const rawType = String(event.data_type || event.event_type || '').toLowerCase();
              const inferredType = (collection.name === 'scan_alerts' || collection.name === 'deception_detection')
                ? collection.name
                : rawType;
              return ({
                _id: event._id || event.data_id,
                timestamp: event.timestamp,
                source_ip: event.source_ip,
                destination_ip: event.destination_ip,
                port: event.port,
                protocol: event.protocol,
                severity: event.severity,
                event_type: inferredType,
                description: event.description,
                payload: event.payload,
                metadata: event.metadata,
                client_id: event.client_id,
                created_at: event.created_at,
                processed: event.processed,
                vpn_server_id: event.vpn_server_id,
                honeypot_id: event.honeypot_id || collection.name,
                honeypot_name: collection.name
              });
            });
            
            // Filter to only include allowed event types
            const filteredEvents = transformedEvents.filter(e =>
              e.event_type && allowedEventTypes.has(String(e.event_type).toLowerCase()) &&
              e.source_ip === ip
            );

            allEvents = allEvents.concat(filteredEvents);
          }
        } catch (error) {
          console.warn(`⚠️  Failed to retrieve IP timeline data from collection ${collection.name}:`, error.message);
        }
      }

      // Sort events by timestamp to create timeline
      allEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Process events to create TTP timeline
      const processedEvents = await dataProcessor.processEventsData(allEvents);

      // Create TTP timeline structure
      const ttpTimeline = {
        ip: ip,
        total_events: processedEvents.length,
        time_range: `${time_range}h`,
        timeline: processedEvents.map(event => ({
          timestamp: event.timestamp,
          time_formatted: new Date(event.timestamp).toLocaleString(),
          event_type: event.event_type,
          activity: getActivityDescription(event),
          honeypot: event.normalized?.honeypot_info?.name || event.honeypot_name,
          port: event.port || event.normalized?.destination_port,
          protocol: event.protocol || event.normalized?.protocol?.normalized,
          severity: event.normalized?.severity || event.severity,
          description: event.description,
          threat_level: event.threat_intelligence?.threat_level || 'Unknown',
          risk_score: event.insights?.risk_score || 0,
          attack_patterns: event.insights?.attack_pattern || [],
          details: {
            payload_preview: event.payload ? String(event.payload).substring(0, 200) : null,
            session_duration: event.session_duration,
            commands_executed: event.commands_executed,
            files_accessed: event.files_accessed
          }
        })),
        summary: {
          first_seen: processedEvents.length > 0 ? processedEvents[0].timestamp : null,
          last_seen: processedEvents.length > 0 ? processedEvents[processedEvents.length - 1].timestamp : null,
          duration_minutes: processedEvents.length > 1 ? 
            Math.round((new Date(processedEvents[processedEvents.length - 1].timestamp) - new Date(processedEvents[0].timestamp)) / (1000 * 60)) : 0,
          honeypots_targeted: [...new Set(processedEvents.map(e => e.normalized?.honeypot_info?.name || e.honeypot_name))],
          ports_targeted: [...new Set(processedEvents.map(e => e.port || e.normalized?.destination_port).filter(p => p))],
          protocols_used: [...new Set(processedEvents.map(e => e.protocol || e.normalized?.protocol?.normalized).filter(p => p))],
          attack_progression: getAttackProgression(processedEvents),
          threat_assessment: assessThreatLevel(processedEvents)
        }
      };

      res.json({
        ttp_timeline: ttpTimeline,
        metadata: {
          ip: ip,
          time_range: `${time_range}h`,
          generated_at: new Date().toISOString(),
          data_source: 'enhanced_events',
          collections_queried: clientCollections.map(c => c.name)
        }
      });
    } catch (error) {
      console.error('❌ Error generating IP activity timeline:', error);
      res.status(500).json({ 
        error: 'Failed to generate IP activity timeline',
        details: error.message 
      });
    }
  });

  // GET: List of active IPs for TTP analysis
  router.get('/analysis/active-ips', authenticateEnhancedAccess, async (req, res) => {
    try {
      const { time_range = 24, min_events = 2 } = req.query;
      
      console.log(`🔍 Fetching active IPs for TTP analysis over ${time_range} hours`);
      
      // Get collections list from VPS API
      const collections = await vpsApi.getCollectionsList();
      
      // Filter collections based on user type
      let clientCollections;
      if (req.clientId === 'admin') {
        clientCollections = (collections.collections || []).filter(c =>
          c.name === 'scan_alerts' || c.name === 'deception_detection' || c.name.startsWith('client_')
        );
      } else {
        clientCollections = (collections.collections || []).filter(c => 
          c.name === 'scan_alerts' ||
          c.name === 'deception_detection' ||
          c.name === `client_${req.clientId}`
        );
      }

      let allEvents = [];
      const allowedEventTypes = new Set(['scan_alerts', 'deception_detection']);

      // Fetch recent events from all collections
      for (const collection of clientCollections) {
        try {
          const filters = { limit: 500 };
          
          // For client collections, ensure we only get data for this specific client
          if (collection.name.startsWith('client_') && req.clientId !== 'admin') {
            filters.client_id = req.clientId;
          }
          
          const collectionData = await vpsApi.getCollectionDetails(collection.name, filters);
          
          if (collectionData.data && collectionData.data.length > 0) {
            const transformedEvents = collectionData.data.map(event => {
              const rawType = String(event.data_type || event.event_type || '').toLowerCase();
              const inferredType = (collection.name === 'scan_alerts' || collection.name === 'deception_detection')
                ? collection.name
                : rawType;
              return ({
                source_ip: event.source_ip,
                timestamp: event.timestamp,
                event_type: inferredType,
                honeypot_name: collection.name,
                severity: event.severity
              });
            });
            
            // Filter to only include allowed event types and valid IPs
            const filteredEvents = transformedEvents.filter(e =>
              e.event_type && allowedEventTypes.has(String(e.event_type).toLowerCase()) &&
              e.source_ip && e.source_ip !== '0.0.0.0' && e.source_ip !== 'unknown'
            );

            allEvents = allEvents.concat(filteredEvents);
          }
        } catch (error) {
          console.warn(`⚠️  Failed to retrieve active IPs from collection ${collection.name}:`, error.message);
        }
      }

      // Group events by IP
      const ipActivity = {};
      allEvents.forEach(event => {
        const ip = event.source_ip;
        if (!ipActivity[ip]) {
          ipActivity[ip] = {
            ip: ip,
            event_count: 0,
            first_seen: event.timestamp,
            last_seen: event.timestamp,
            honeypots: new Set(),
            event_types: new Set(),
            severities: new Set()
          };
        }
        
        ipActivity[ip].event_count++;
        ipActivity[ip].honeypots.add(event.honeypot_name);
        ipActivity[ip].event_types.add(event.event_type);
        if (event.severity) ipActivity[ip].severities.add(event.severity);
        
        // Update time range
        if (new Date(event.timestamp) < new Date(ipActivity[ip].first_seen)) {
          ipActivity[ip].first_seen = event.timestamp;
        }
        if (new Date(event.timestamp) > new Date(ipActivity[ip].last_seen)) {
          ipActivity[ip].last_seen = event.timestamp;
        }
      });

      // Convert to array and filter by minimum events
      const activeIps = Object.values(ipActivity)
        .filter(ip => ip.event_count >= min_events)
        .map(ip => ({
          ip: ip.ip,
          event_count: ip.event_count,
          first_seen: ip.first_seen,
          last_seen: ip.last_seen,
          duration_minutes: Math.round((new Date(ip.last_seen) - new Date(ip.first_seen)) / (1000 * 60)),
          honeypots_targeted: Array.from(ip.honeypots),
          event_types: Array.from(ip.event_types),
          max_severity: getMaxSeverity(Array.from(ip.severities)),
          threat_score: calculateIpThreatScore(ip)
        }))
        .sort((a, b) => b.threat_score - a.threat_score);

      res.json({
        active_ips: activeIps,
        metadata: {
          time_range: `${time_range}h`,
          min_events: Number(min_events),
          total_ips: activeIps.length,
          generated_at: new Date().toISOString(),
          data_source: 'enhanced_events',
          collections_queried: clientCollections.map(c => c.name)
        }
      });
    } catch (error) {
      console.error('❌ Error fetching active IPs:', error);
      res.status(500).json({ 
        error: 'Failed to fetch active IPs',
        details: error.message 
      });
    }
  });

  // Helper functions for TTP analysis
  function getActivityDescription(event) {
    const eventType = event.event_type;
    const honeypot = event.normalized?.honeypot_info?.name || event.honeypot_name;
    const port = event.port || event.normalized?.destination_port;
    
    if (eventType === 'scan_alerts') {
      return `Port scan detected on ${honeypot}:${port}`;
    } else if (eventType === 'deception_detection') {
      if (port === 22 || port === '22') {
        return `SSH connection attempt on ${honeypot}`;
      } else if (port === 80 || port === '80' || port === 443 || port === '443') {
        return `HTTP/Web access attempt on ${honeypot}`;
      } else if (port === 21 || port === '21') {
        return `FTP connection attempt on ${honeypot}`;
      } else if (port === 23 || port === '23') {
        return `Telnet connection attempt on ${honeypot}`;
      } else {
        return `Service interaction on ${honeypot}:${port}`;
      }
    }
    
    return event.description || `Activity detected on ${honeypot}`;
  }

  function getAttackProgression(events) {
    const phases = [];
    
    // Group events by time windows (5-minute intervals)
    const timeWindows = {};
    events.forEach(event => {
      const windowTime = Math.floor(new Date(event.timestamp).getTime() / (5 * 60 * 1000)) * (5 * 60 * 1000);
      if (!timeWindows[windowTime]) {
        timeWindows[windowTime] = [];
      }
      timeWindows[windowTime].push(event);
    });
    
    // Analyze each time window
    Object.keys(timeWindows).sort().forEach(windowTime => {
      const windowEvents = timeWindows[windowTime];
      const phase = {
        time: new Date(parseInt(windowTime)).toISOString(),
        activities: windowEvents.length,
        primary_activity: getMostCommonActivity(windowEvents),
        honeypots: [...new Set(windowEvents.map(e => e.normalized?.honeypot_info?.name || e.honeypot_name))],
        ports: [...new Set(windowEvents.map(e => e.port || e.normalized?.destination_port).filter(p => p))]
      };
      phases.push(phase);
    });
    
    return phases;
  }

  function getMostCommonActivity(events) {
    const activities = {};
    events.forEach(event => {
      const activity = getActivityDescription(event);
      activities[activity] = (activities[activity] || 0) + 1;
    });
    
    return Object.keys(activities).reduce((a, b) => activities[a] > activities[b] ? a : b, 'Unknown');
  }

  function assessThreatLevel(events) {
    let score = 0;
    const factors = {
      event_count: events.length,
      unique_honeypots: new Set(events.map(e => e.normalized?.honeypot_info?.name || e.honeypot_name)).size,
      unique_ports: new Set(events.map(e => e.port || e.normalized?.destination_port).filter(p => p)).size,
      duration: events.length > 1 ? (new Date(events[events.length - 1].timestamp) - new Date(events[0].timestamp)) / (1000 * 60) : 0
    };
    
    // Score based on activity volume
    if (factors.event_count > 20) score += 3;
    else if (factors.event_count > 10) score += 2;
    else if (factors.event_count > 5) score += 1;
    
    // Score based on target diversity
    if (factors.unique_honeypots > 3) score += 2;
    else if (factors.unique_honeypots > 1) score += 1;
    
    // Score based on port scanning behavior
    if (factors.unique_ports > 10) score += 3;
    else if (factors.unique_ports > 5) score += 2;
    else if (factors.unique_ports > 2) score += 1;
    
    // Score based on persistence
    if (factors.duration > 60) score += 2; // More than 1 hour
    else if (factors.duration > 15) score += 1; // More than 15 minutes
    
    if (score >= 8) return 'Critical';
    if (score >= 6) return 'High';
    if (score >= 4) return 'Medium';
    if (score >= 2) return 'Low';
    return 'Minimal';
  }

  function getMaxSeverity(severities) {
    const severityOrder = ['Critical', 'High', 'Medium', 'Low', 'Info'];
    for (const severity of severityOrder) {
      if (severities.includes(severity)) return severity;
    }
    return 'Unknown';
  }

  function calculateIpThreatScore(ipData) {
    let score = 0;
    
    // Base score from event count
    score += Math.min(ipData.event_count, 20);
    
    // Add score for targeting multiple honeypots
    score += ipData.honeypots.size * 2;
    
    // Add score for using multiple attack types
    score += ipData.event_types.size * 3;
    
    // Add score for severity
    const maxSeverity = getMaxSeverity(Array.from(ipData.severities));
    if (maxSeverity === 'Critical') score += 10;
    else if (maxSeverity === 'High') score += 7;
    else if (maxSeverity === 'Medium') score += 5;
    else if (maxSeverity === 'Low') score += 2;
    
    return Math.min(score, 50); // Cap at 50
  }

  // Helper method to calculate pattern risk score
  function calculatePatternRiskScore(patternData) {
    let score = 0;
    
    // Base score from count
    score += Math.min(patternData.count, 10);
    
    // Add score for unique source IPs
    score += Math.min(patternData.source_ips.length, 5);
    
    // Add score for multiple honeypots
    if (patternData.honeypots.length > 1) {
      score += 2;
    }
    
    // Add score for critical threat levels
    if (patternData.threat_levels.has('Critical') || patternData.threat_levels.has('Critical') || patternData.threat_levels.has('High')) {
      score += 3;
    }
    
    return Math.min(score, 20); // Cap at 20
  }

  // GET: Deception Detection Data (Frontend Compatible Format)
  router.get('/deception-detection', authenticateEnhancedAccess, async (req, res) => {
    try {
      const { hours = 24, limit = 500, clientId } = req.query;
      
      console.log(`🔍 Fetching deception detection data for client ${req.clientId} over ${hours} hours`);
      
      // Get collections list from VPS API
      const collections = await vpsApi.getCollectionsList();
      
      // Filter collections based on user type
      let clientCollections;
      if (req.clientId === 'admin') {
        clientCollections = (collections.collections || []).filter(c =>
          c.name === 'deception_detection' || c.name.startsWith('client_')
        );
      } else {
        clientCollections = (collections.collections || []).filter(c => 
          c.name === 'deception_detection' ||
          c.name === `client_${req.clientId}`
        );
      }

      let allDeceptionEvents = [];
      
      // Fetch deception events from relevant collections
      for (const collection of clientCollections) {
        try {
          const collectionData = await vpsApi.getCollectionDetails(collection.name, {
            limit: parseInt(limit),
            data_type: 'deception_event',
            start_date: new Date(Date.now() - (parseInt(hours) * 60 * 60 * 1000)).toISOString(),
            end_date: new Date().toISOString()
          });
          
          if (collectionData.success && collectionData.data) {
            // Transform VPS API data to frontend-compatible format
            const transformedEvents = collectionData.data.map(event => ({
              _id: event._id || event.data_id,
              id: event._id || event.data_id,
              timestamp: event.timestamp,
              source_ip: event.source_ip,
              dest_port: event.port || event.dest_port,
              uid: event.uid || event.session_id || event._id,
              message: event.description || event.message || 'Deception event detected',
              note_type: event.data_type || event.note_type || 'deception_event',
              alertType: event.data_type || event.note_type || 'deception_event',
              attackerIP: event.source_ip,
              clientId: event.client_id || req.clientId,
              threatLevel: event.severity || 'medium',
              severity: event.severity || 'medium',
              attack_category: event.attack_category || 'honeypot_engagement',
              protocol: event.protocol || 'tcp',
              honeypot_id: event.honeypot_id || event.dest_port,
              honeypot_name: event.honeypot_name || collection.name,
              session_id: event.session_id || event.uid || event._id,
              details: {
                zeek_note_type: event.data_type || event.note_type,
                message: event.description || event.message,
                dest_port: event.port || event.dest_port,
                uid: event.uid || event.session_id,
                detection_method: 'honeypot_monitoring',
                attack_category: event.attack_category || 'honeypot_engagement',
                severity: event.severity || 'medium'
              }
            }));
            
            allDeceptionEvents = allDeceptionEvents.concat(transformedEvents);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to retrieve data from collection ${collection.name}:`, error.message);
        }
      }

      // Sort by timestamp (newest first)
      allDeceptionEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Apply limit
      if (limit) {
        allDeceptionEvents = allDeceptionEvents.slice(0, parseInt(limit));
      }

      console.log(`🍯 Retrieved ${allDeceptionEvents.length} deception detection events`);
      
      res.json(allDeceptionEvents);
      
    } catch (error) {
      console.error('❌ Error fetching deception detection data:', error);
      res.status(500).json({ 
        error: 'Failed to fetch deception detection data',
        details: error.message 
      });
    }
  });

  // GET: Deception Detection Statistics
  router.get('/deception-detection/stats', authenticateEnhancedAccess, async (req, res) => {
    try {
      const { hours = 24, clientId } = req.query;
      
      console.log(`📊 Fetching deception detection stats for client ${req.clientId} over ${hours} hours`);
      
      // Get collections list from VPS API
      const collections = await vpsApi.getCollectionsList();
      
      // Filter collections based on user type
      let clientCollections;
      if (req.clientId === 'admin') {
        clientCollections = (collections.collections || []).filter(c =>
          c.name === 'deception_detection' || c.name.startsWith('client_')
        );
      } else {
        clientCollections = (collections.collections || []).filter(c => 
          c.name === 'deception_detection' ||
          c.name === `client_${req.clientId}`
        );
      }

      const stats = {
        total: 0,
        by_severity: {},
        by_note_type: {},
        unique_ips: 0,
        time_range: `${hours}h`
      };

      let allEvents = [];
      const uniqueIPs = new Set();
      
      // Fetch events from all collections for statistics
      for (const collection of clientCollections) {
        try {
          const collectionData = await vpsApi.getCollectionDetails(collection.name, {
            limit: 1000, // Get more data for accurate stats
            data_type: 'deception_event',
            start_date: new Date(Date.now() - (parseInt(hours) * 60 * 60 * 1000)).toISOString(),
            end_date: new Date().toISOString()
          });
          
          if (collectionData.success && collectionData.data) {
            collectionData.data.forEach(event => {
              allEvents.push(event);
              if (event.source_ip) uniqueIPs.add(event.source_ip);
              
              // Severity stats
              const severity = event.severity || 'unknown';
              stats.by_severity[severity] = (stats.by_severity[severity] || 0) + 1;
              
              // Note type stats
              const noteType = event.data_type || event.note_type || 'unknown';
              stats.by_note_type[noteType] = (stats.by_note_type[noteType] || 0) + 1;
            });
          }
        } catch (error) {
          console.warn(`⚠️ Failed to retrieve stats from collection ${collection.name}:`, error.message);
        }
      }

      stats.total = allEvents.length;
      stats.unique_ips = uniqueIPs.size;

      console.log(`📊 Deception detection stats: ${stats.total} total events, ${stats.unique_ips} unique IPs`);
      
      res.json(stats);
      
    } catch (error) {
      console.error('❌ Error fetching deception detection stats:', error);
      res.status(500).json({ 
        error: 'Failed to fetch deception detection stats',
        details: error.message 
      });
    }
  });

  return router;
};
