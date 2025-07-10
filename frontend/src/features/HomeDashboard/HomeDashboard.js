import React, { useEffect, useState } from 'react';
import { fetchHoneypots, fetchEvents } from '../../api';
import styles from './HomeDashboard.module.css';
import { Link } from 'react-router-dom';

export default function HomeDashboard() {
  const [honeypots, setHoneypots] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        console.log('Fetching honeypots...');
        const hps = await fetchHoneypots();
        console.log('Honeypots response:', hps);
        setHoneypots(hps);
        
        console.log('Fetching events...');
        // Fetch only session events for the dashboard
        const evs = await fetchEvents({ event_type: 'session', limit: 100 });
        console.log('Events response:', evs);
        setEvents(evs);
      } catch (e) {
        console.error('Dashboard error:', e);
        setError(e.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className={styles.loading}>Loading dashboard...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <h2>Honeypot Dashboard</h2>
      
      <div className={styles.statsSection}>
        <div className={styles.statCard}>
          <h3>Active Honeypots</h3>
          <div className={styles.statValue}>{honeypots.length}</div>
        </div>
        <div className={styles.statCard}>
          <h3>Total Sessions</h3>
          <div className={styles.statValue}>{events.length}</div>
        </div>
        <div className={styles.statCard}>
          <h3>Unique IPs</h3>
          <div className={styles.statValue}>
            {new Set(events.map(ev => ev.source_ip)).size}
          </div>
        </div>
      </div>

      <div className={styles.honeypotSection}>
        <h3>Active Honeypots</h3>
        <div className={styles.grid}>
          {honeypots.length === 0 ? (
            <p>No honeypots found. Please check if the database has been initialized.</p>
          ) : (
            honeypots.map(hp => {
              const hpEvents = events.filter(ev => ev.honeypot_id === hp._id);
              const lastEvent = hpEvents[0];
              const lastEventTime = lastEvent ? new Date(lastEvent.timestamp).toLocaleString() : 'N/A';
              
              return (
                <Link to={`/honeypot/${hp._id}`} key={hp._id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3>{hp.name}</h3>
                    <span className={`${styles.status} ${styles[hp.status]}`}>
                      {hp.status}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <p>Protocol: <b>{hp.protocol.toUpperCase()}</b></p>
                    <p>Type: <b>{hp.type}</b></p>
                    <p>Port: <b>{hp.port}</b></p>
                    <p>Sessions: <b>{hpEvents.length}</b></p>
                    <p>Last Activity: <b>{lastEventTime}</b></p>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      <div className={styles.recentSection}>
        <h3>Recent Sessions</h3>
        {events.length === 0 ? (
          <p>No sessions recorded yet.</p>
        ) : (
          <div className={styles.sessionList}>
            {events.slice(0, 10).map(event => (
              <Link 
                to={`/sessions/${event._id}`} 
                key={event._id} 
                className={styles.sessionItem}
              >
                <div className={styles.sessionHeader}>
                  <span className={styles.sourceIp}>{event.source_ip}</span>
                  <span className={styles.timestamp}>
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className={styles.sessionDetails}>
                  <span>Commands: {event.commands?.length || 0}</span>
                  <span>Duration: {Math.round(event.duration)}s</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 