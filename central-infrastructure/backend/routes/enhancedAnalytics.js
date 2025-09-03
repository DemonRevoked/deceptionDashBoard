const express = require('express');
const AnalyticsService = require('../services/analyticsService');

const router = express.Router();

module.exports = function(db) {
  const analyticsService = new AnalyticsService(db);

  // GET: Comprehensive security analytics
  router.get('/comprehensive', async (req, res) => {
    try {
      const { time_range = 24 } = req.query;
      
      console.log('Generating comprehensive security analytics for', time_range, 'hours');
      
      const analytics = await analyticsService.generateSecurityAnalytics(Number(time_range));
      
      res.json({
        analytics,
        metadata: {
          time_range: `${time_range}h`,
          generated_at: new Date().toISOString(),
          data_source: 'enhanced_analytics'
        }
      });
    } catch (error) {
      console.error('Error generating comprehensive analytics:', error);
      res.status(500).json({ 
        error: 'Failed to generate comprehensive analytics',
        details: error.message 
      });
    }
  });

  // GET: Overview analytics
  router.get('/overview', async (req, res) => {
    try {
      const { time_range = 24 } = req.query;
      
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - Number(time_range));

      // Fetch events for analysis
      const events = await db.collection('zeek_alerts').find({
        timestamp: { $gte: startTime }
      }).sort({ timestamp: -1 }).toArray();

      // Process events
      const processedEvents = await analyticsService.dataProcessor.processEventsData(events);

      // Generate overview analytics
      const overview = await analyticsService.generateOverviewAnalytics(processedEvents, Number(time_range));
      
      res.json({
        overview,
        metadata: {
          time_range: `${time_range}h`,
          generated_at: new Date().toISOString(),
          data_source: 'enhanced_analytics'
        }
      });
    } catch (error) {
      console.error('Error generating overview analytics:', error);
      res.status(500).json({ 
        error: 'Failed to generate overview analytics',
        details: error.message 
      });
    }
  });

  // GET: Threat analysis
  router.get('/threats', async (req, res) => {
    try {
      const { time_range = 24 } = req.query;
      
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - Number(time_range));

      // Fetch events for analysis
      const events = await db.collection('zeek_alerts').find({
        timestamp: { $gte: startTime }
      }).sort({ timestamp: -1 }).toArray();

      // Process events
      const processedEvents = await analyticsService.dataProcessor.processEventsData(events);

      // Generate threat analysis
      const threatAnalysis = await analyticsService.generateThreatAnalysis(processedEvents, Number(time_range));
      
      res.json({
        threat_analysis: threatAnalysis,
        metadata: {
          time_range: `${time_range}h`,
          generated_at: new Date().toISOString(),
          data_source: 'enhanced_analytics'
        }
      });
    } catch (error) {
      console.error('Error generating threat analysis:', error);
      res.status(500).json({ 
        error: 'Failed to generate threat analysis',
        details: error.message 
      });
    }
  });

  // GET: Attack pattern analysis
  router.get('/attack-patterns', async (req, res) => {
    try {
      const { time_range = 24 } = req.query;
      
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - Number(time_range));

      // Fetch events for analysis
      const events = await db.collection('zeek_alerts').find({
        timestamp: { $gte: startTime }
      }).sort({ timestamp: -1 }).toArray();

      // Process events
      const processedEvents = await analyticsService.dataProcessor.processEventsData(events);

      // Generate attack pattern analysis
      const patternAnalysis = await analyticsService.generateAttackPatternAnalysis(processedEvents, Number(time_range));
      
      res.json({
        attack_patterns: patternAnalysis,
        metadata: {
          time_range: `${time_range}h`,
          generated_at: new Date().toISOString(),
          data_source: 'enhanced_analytics'
        }
      });
    } catch (error) {
      console.error('Error generating attack pattern analysis:', error);
      res.status(500).json({ 
        error: 'Failed to generate attack pattern analysis',
        details: error.message 
      });
    }
  });

  // GET: Geographic analysis
  router.get('/geographic', async (req, res) => {
    try {
      const { time_range = 24 } = req.query;
      
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - Number(time_range));

      // Fetch events for analysis
      const events = await db.collection('zeek_alerts').find({
        timestamp: { $gte: startTime }
      }).sort({ timestamp: -1 }).toArray();

      // Process events
      const processedEvents = await analyticsService.dataProcessor.processEventsData(events);

      // Generate geographic analysis
      const geoAnalysis = await analyticsService.generateGeographicAnalysis(processedEvents, Number(timeRange));
      
      res.json({
        geographic_analysis: geoAnalysis,
        metadata: {
          time_range: `${time_range}h`,
          generated_at: new Date().toISOString(),
          data_source: 'enhanced_analytics'
        }
      });
    } catch (error) {
      console.error('Error generating geographic analysis:', error);
      res.status(500).json({ 
        error: 'Failed to generate geographic analysis',
        details: error.message 
      });
    }
  });

  // GET: Protocol analysis
  router.get('/protocols', async (req, res) => {
    try {
      const { time_range = 24 } = req.query;
      
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - Number(time_range));

      // Fetch events for analysis
      const events = await db.collection('zeek_alerts').find({
        timestamp: { $gte: startTime }
      }).sort({ timestamp: -1 }).toArray();

      // Process events
      const processedEvents = await analyticsService.dataProcessor.processEventsData(events);

      // Generate protocol analysis
      const protocolAnalysis = await analyticsService.generateProtocolAnalysis(processedEvents, Number(time_range));
      
      res.json({
        protocol_analysis: protocolAnalysis,
        metadata: {
          time_range: `${time_range}h`,
          generated_at: new Date().toISOString(),
          data_source: 'enhanced_analytics'
        }
      });
    } catch (error) {
      console.error('Error generating protocol analysis:', error);
      res.status(500).json({ 
        error: 'Failed to generate protocol analysis',
        details: error.message 
      });
    }
  });

  // GET: Honeypot analysis
  router.get('/honeypots', async (req, res) => {
    try {
      const { time_range = 24 } = req.query;
      
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - Number(time_range));

      // Fetch events for analysis
      const events = await db.collection('zeek_alerts').find({
        timestamp: { $gte: startTime }
      }).sort({ timestamp: -1 }).toArray();

      // Process events
      const processedEvents = await analyticsService.dataProcessor.processEventsData(events);

      // Generate honeypot analysis
      const honeypotAnalysis = await analyticsService.generateHoneypotAnalysis(processedEvents, Number(time_range));
      
      res.json({
        honeypot_analysis: honeypotAnalysis,
        metadata: {
          time_range: `${time_range}h`,
          generated_at: new Date().toISOString(),
          data_source: 'enhanced_analytics'
        }
      });
    } catch (error) {
      console.error('Error generating honeypot analysis:', error);
      res.status(500).json({ 
        error: 'Failed to generate honeypot analysis',
        details: error.message 
      });
    }
  });

  // GET: Correlation analysis
  router.get('/correlations', async (req, res) => {
    try {
      const { time_range = 24 } = req.query;
      
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - Number(time_range));

      // Fetch events for analysis
      const events = await db.collection('zeek_alerts').find({
        timestamp: { $gte: startTime }
      }).sort({ timestamp: -1 }).toArray();

      // Process events
      const processedEvents = await analyticsService.dataProcessor.processEventsData(events);

      // Generate correlation analysis
      const correlationAnalysis = await analyticsService.generateCorrelationAnalysis(processedEvents, Number(time_range));
      
      res.json({
        correlation_analysis: correlationAnalysis,
        metadata: {
          time_range: `${time_range}h`,
          generated_at: new Date().toISOString(),
          data_source: 'enhanced_analytics'
        }
      });
    } catch (error) {
      console.error('Error generating correlation analysis:', error);
      res.status(500).json({ 
        error: 'Failed to generate correlation analysis',
        details: error.message 
      });
    }
  });

  // GET: Risk assessment
  router.get('/risk-assessment', async (req, res) => {
    try {
      const { time_range = 24 } = req.query;
      
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - Number(time_range));

      // Fetch events for analysis
      const events = await db.collection('zeek_alerts').find({
        timestamp: { $gte: startTime }
      }).sort({ timestamp: -1 }).toArray();

      // Process events
      const processedEvents = await analyticsService.dataProcessor.processEventsData(events);

      // Generate risk assessment
      const riskAssessment = await analyticsService.generateRiskAssessment(processedEvents, Number(time_range));
      
      res.json({
        risk_assessment: riskAssessment,
        metadata: {
          time_range: `${time_range}h`,
          generated_at: new Date().toISOString(),
          data_source: 'enhanced_analytics'
        }
      });
    } catch (error) {
      console.error('Error generating risk assessment:', error);
      res.status(500).json({ 
        error: 'Failed to generate risk assessment',
        details: error.message 
      });
    }
  });

  // GET: Trend analysis
  router.get('/trends', async (req, res) => {
    try {
      const { time_range = 24 } = req.query;
      
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - Number(time_range));

      // Fetch events for analysis
      const events = await db.collection('zeek_alerts').find({
        timestamp: { $gte: startTime }
      }).sort({ timestamp: -1 }).toArray();

      // Process events
      const processedEvents = await analyticsService.dataProcessor.processEventsData(events);

      // Generate trend analysis
      const trendAnalysis = await analyticsService.generateTrendAnalysis(processedEvents, Number(time_range));
      
      res.json({
        trend_analysis: trendAnalysis,
        metadata: {
          time_range: `${time_range}h`,
          generated_at: new Date().toISOString(),
          data_source: 'enhanced_analytics'
        }
      });
    } catch (error) {
      console.error('Error generating trend analysis:', error);
      res.status(500).json({ 
        error: 'Failed to generate trend analysis',
        details: error.message 
      });
    }
  });

  // GET: Security recommendations
  router.get('/recommendations', async (req, res) => {
    try {
      const { time_range = 24 } = req.query;
      
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - Number(time_range));

      // Fetch events for analysis
      const events = await db.collection('zeek_alerts').find({
        timestamp: { $gte: startTime }
      }).sort({ timestamp: -1 }).toArray();

      // Process events
      const processedEvents = await analyticsService.dataProcessor.processEventsData(events);

      // Generate security recommendations
      const recommendations = await analyticsService.generateSecurityRecommendations(processedEvents, Number(time_range));
      
      res.json({
        security_recommendations: recommendations,
        metadata: {
          time_range: `${time_range}h`,
          generated_at: new Date().toISOString(),
          data_source: 'enhanced_analytics'
        }
      });
    } catch (error) {
      console.error('Error generating security recommendations:', error);
      res.status(500).json({ 
        error: 'Failed to generate security recommendations',
        details: error.message 
      });
    }
  });

  // GET: Real-time analytics dashboard
  router.get('/dashboard/real-time', async (req, res) => {
    try {
      const { time_range = 1 } = req.query; // Default to 1 hour for real-time
      
      const startTime = new Date();
      startTime.setMinutes(startTime.getMinutes() - Number(time_range) * 60);

      // Fetch recent events
      const events = await db.collection('honeypot_events').find({
        timestamp: { $gte: startTime }
      }).sort({ timestamp: -1 }).toArray();

      // Process events
      const processedEvents = await analyticsService.dataProcessor.processEventsData(events);

      // Generate real-time analytics
      const realTimeAnalytics = {
        current_activity: {
          events_per_minute: calculateEventsPerMinute(processedEvents, time_range),
          active_attackers: countActiveAttackers(processedEvents),
          current_threats: identifyCurrentThreats(processedEvents),
          system_status: getSystemStatus(processedEvents)
        },
        alerts: {
          critical: countCriticalAlerts(processedEvents),
          high: countHighAlerts(processedEvents),
          recent: getRecentAlerts(processedEvents, 10)
        },
        trends: {
          event_trend: calculateEventTrend(processedEvents, time_range),
          threat_trend: calculateThreatTrend(processedEvents, time_range),
          attack_trend: calculateAttackTrend(processedEvents, time_range)
        }
      };
      
      res.json({
        real_time_analytics: realTimeAnalytics,
        metadata: {
          time_range: `${time_range}h`,
          generated_at: new Date().toISOString(),
          data_source: 'enhanced_analytics_real_time'
        }
      });
    } catch (error) {
      console.error('Error generating real-time analytics:', error);
      res.status(500).json({ 
        error: 'Failed to generate real-time analytics',
        details: error.message 
      });
    }
  });

  // GET: Custom analytics query
  router.post('/custom', async (req, res) => {
    try {
      const { 
        time_range = 24,
        filters = {},
        metrics = [],
        group_by = [],
        sort_by = 'timestamp',
        sort_order = 'desc',
        limit = 100
      } = req.body;

      const startTime = new Date();
      startTime.setHours(startTime.getHours() - Number(time_range));

      // Build query with filters
      const query = { timestamp: { $gte: startTime } };
      
      // Apply filters
      if (filters.protocol) query.protocol = filters.protocol;
      if (filters.honeypot_id) query.honeypot_id = filters.honeypot_id;
      if (filters.source_ip) query.source_ip = filters.source_ip;
      if (filters.event_type) query.event_type = filters.event_type;
      if (filters.severity) query.severity = filters.severity;
      if (filters.category) query.category = filters.category;

      // Fetch events
      const events = await db.collection('honeypot_events')
        .find(query)
        .sort({ [sort_by]: sort_order === 'desc' ? -1 : 1 })
        .limit(Number(limit))
        .toArray();

      // Process events
      const processedEvents = await analyticsService.dataProcessor.processEventsData(events);

      // Generate custom analytics based on requested metrics
      const customAnalytics = generateCustomAnalytics(processedEvents, metrics, group_by);
      
      res.json({
        custom_analytics: customAnalytics,
        metadata: {
          time_range: `${time_range}h`,
          filters,
          metrics,
          group_by,
          total_events: processedEvents.length,
          generated_at: new Date().toISOString(),
          data_source: 'enhanced_analytics_custom'
        }
      });
    } catch (error) {
      console.error('Error generating custom analytics:', error);
      res.status(500).json({ 
        error: 'Failed to generate custom analytics',
        details: error.message 
      });
    }
  });

  // Helper methods for real-time analytics

  // Calculate events per minute
  function calculateEventsPerMinute(events, timeRange) {
    const totalEvents = events.length;
    const minutes = timeRange * 60;
    return Math.round((totalEvents / minutes) * 100) / 100;
  }

  // Count active attackers
  function countActiveAttackers(events) {
    const uniqueIPs = new Set();
    events.forEach(event => {
      const ip = event.normalized?.source_ip?.ip || event.source_ip;
      if (ip) uniqueIPs.add(ip);
    });
    return uniqueIPs.size;
  }

  // Identify current threats
  function identifyCurrentThreats(events) {
    return events
      .filter(event => event.normalized?.severity === 'High' || event.normalized?.severity === 'Critical')
      .slice(0, 5)
      .map(event => ({
        id: event._id,
        severity: event.normalized?.severity,
        source_ip: event.normalized?.source_ip?.ip,
        event_type: event.normalized?.event_type,
        timestamp: event.timestamp
      }));
  }

  // Get system status
  function getSystemStatus(events) {
    const status = {
      total_events: events.length,
              threat_level: calculateOverallThreatLevel(events),
        active_protocols: countActiveProtocols(events),
        honeypot_coverage: calculateHoneypotCoverage(events)
    };
    
    return status;
  }

  // Count critical alerts
  function countCriticalAlerts(events) {
    return events.filter(event => event.normalized?.severity === 'Critical').length;
  }

  // Count high alerts
  function countHighAlerts(events) {
    return events.filter(event => event.normalized?.severity === 'High').length;
  }

  // Get recent alerts
  function getRecentAlerts(events, limit) {
    return events
      .filter(event => event.normalized?.severity === 'High' || event.normalized?.severity === 'Critical')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit)
      .map(event => ({
        id: event._id,
        severity: event.normalized?.severity,
        source_ip: event.normalized?.source_ip?.ip,
        event_type: event.normalized?.event_type,
        timestamp: event.timestamp
      }));
  }

  // Calculate event trend
  function calculateEventTrend(events, timeRange) {
    // Simple trend calculation - compare first and second half of time period
    if (events.length < 2) return 'stable';
    
    const midPoint = Math.floor(events.length / 2);
    const firstHalf = events.slice(0, midPoint).length;
    const secondHalf = events.slice(midPoint).length;
    
    if (secondHalf > firstHalf * 1.2) return 'increasing';
    if (secondHalf < firstHalf * 0.8) return 'decreasing';
    return 'stable';
  }

  // Calculate threat trend
  calculateThreatTrend(events, timeRange) {
    // Similar trend calculation for threats
    const threats = events.filter(event => 
      event.normalized?.severity === 'High' || event.normalized?.severity === 'Critical'
    );
    
    if (threats.length < 2) return 'stable';
    
    const midPoint = Math.floor(threats.length / 2);
    const firstHalf = threats.slice(0, midPoint).length;
    const secondHalf = threats.slice(midPoint).length;
    
    if (secondHalf > firstHalf * 1.2) return 'increasing';
    if (secondHalf < firstHalf * 0.8) return 'decreasing';
    return 'stable';
  }

  // Calculate attack trend
  calculateAttackTrend(events, timeRange) {
    // Similar trend calculation for attacks
    const attacks = events.filter(event => 
      event.normalized?.event_type === 'Attack_Attempt' || event.normalized?.event_type === 'Command_Execution'
    );
    
    if (attacks.length < 2) return 'stable';
    
    const midPoint = Math.floor(attacks.length / 2);
    const firstHalf = attacks.slice(0, midPoint).length;
    const secondHalf = attacks.slice(midPoint).length;
    
    if (secondHalf > firstHalf * 1.2) return 'increasing';
    if (secondHalf < firstHalf * 0.8) return 'decreasing';
    return 'stable';
  }

  // Calculate overall threat level
  calculateOverallThreatLevel(events) {
    const threatLevels = events.map(event => event.normalized?.severity || 'Medium');
    const critical = threatLevels.filter(level => level === 'Critical').length;
    const high = threatLevels.filter(level => level === 'High').length;
    
    if (critical > 0) return 'Critical';
    if (high > 0) return 'High';
    if (threatLevels.some(level => level === 'Medium')) return 'Medium';
    return 'Low';
  }

  // Count active protocols
  countActiveProtocols(events) {
    const protocols = new Set();
    events.forEach(event => {
      const protocol = event.normalized?.protocol?.normalized || event.protocol;
      if (protocol) protocols.add(protocol);
    });
    return protocols.size;
  }

  // Calculate honeypot coverage
  calculateHoneypotCoverage(events) {
    const honeypots = new Set();
    events.forEach(event => {
      const honeypot = event.normalized?.honeypot_info?.name || event.honeypot_name;
      if (honeypot) honeypots.add(honeypot);
    });
    
    // This would typically compare against total deployed honeypots
    // For now, just return the count of active ones
    return honeypots.size;
  }

  // Generate custom analytics
  generateCustomAnalytics(events, metrics, groupBy) {
    const analytics = {};
    
    // Generate metrics based on requested fields
    metrics.forEach(metric => {
      analytics[metric] = calculateMetric(events, metric);
    });
    
    // Group data if requested
    if (groupBy.length > 0) {
              analytics.grouped_data = groupDataByFields(events, groupBy);
    }
    
    return analytics;
  }

  // Calculate specific metric
  calculateMetric(events, metric) {
    switch (metric) {
      case 'total_events':
        return events.length;
      case 'unique_attackers':
        return countUniqueAttackers(events);
      case 'threat_distribution':
        return distributeByThreatLevel(events);
      case 'protocol_distribution':
        return distributeByProtocol(events);
      case 'attack_type_distribution':
        return distributeByAttackType(events);
      case 'geographic_distribution':
        return distributeByGeographic(events);
      default:
        return null;
    }
  }

  // Group data by fields
  groupDataByFields(events, groupBy) {
    const grouped = {};
    
    groupBy.forEach(field => {
      grouped[field] = {};
      events.forEach(event => {
        const value = getFieldValue(event, field);
        if (!grouped[field][value]) {
          grouped[field][value] = [];
        }
        grouped[field][value].push(event._id);
      });
    });
    
    return grouped;
  }

  // Get field value from event
  getFieldValue(event, field) {
    switch (field) {
      case 'source_ip':
        return event.normalized?.source_ip?.ip || event.source_ip || 'Unknown';
      case 'protocol':
        return event.normalized?.protocol?.normalized || event.protocol || 'Unknown';
      case 'event_type':
        return event.normalized?.event_type || event.event_type || 'Unknown';
      case 'severity':
        return event.normalized?.severity || event.severity || 'Unknown';
      case 'honeypot':
        return event.normalized?.honeypot_info?.name || event.honeypot_name || 'Unknown';
      default:
        return 'Unknown';
    }
  }

  // Helper methods for distributions
  distributeByThreatLevel(events) {
    const distribution = {};
    events.forEach(event => {
      const level = event.normalized?.severity || 'Unknown';
      distribution[level] = (distribution[level] || 0) + 1;
    });
    return distribution;
  }

  distributeByProtocol(events) {
    const distribution = {};
    events.forEach(event => {
      const protocol = event.normalized?.protocol?.normalized || 'Unknown';
      distribution[protocol] = (distribution[protocol] || 0) + 1;
    });
    return distribution;
  }

  distributeByAttackType(events) {
    const distribution = {};
    events.forEach(event => {
      const type = event.normalized?.event_type || 'Unknown';
      distribution[type] = (distribution[type] || 0) + 1;
    });
    return distribution;
  }

  distributeByGeographic(events) {
    const distribution = {};
    events.forEach(event => {
      const country = event.normalized?.geolocation?.country || 'Unknown';
      distribution[country] = (distribution[country] || 0) + 1;
    });
    return distribution;
  }

  countUniqueAttackers(events) {
    const uniqueIPs = new Set();
    events.forEach(event => {
      const ip = event.normalized?.source_ip?.ip || event.source_ip;
      if (ip) uniqueIPs.add(ip);
    });
    return uniqueIPs.size;
  }

  return router;
};
