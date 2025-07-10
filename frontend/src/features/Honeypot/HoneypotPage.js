import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchHoneypots, fetchEvents } from '../../api';
import styles from './HoneypotPage.module.css';

export default function HoneypotPage() {
  const { id } = useParams();
  const [honeypot, setHoneypot] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        console.log('Loading data for honeypot ID:', id);
        const hps = await fetchHoneypots();
        console.log('Fetched honeypots:', hps);
        const hp = hps.find(h => h._id === id);
        console.log('Found honeypot:', hp);
        setHoneypot(hp);
        const evs = await fetchEvents({ honeypot_id: id, limit: 100 });
        console.log('Fetched events:', evs);
        setEvents(evs);
      } catch (e) {
        console.error('Error loading data:', e);
        setError(e.message || 'Failed to load honeypot data');
      } finally {
        setLoading(false);
      }
    }
    if (id) loadData();
  }, [id]);

  if (loading) return <div className={styles.loading}>Loading honeypot...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;
  if (!honeypot) return <div className={styles.error}>Honeypot not found.</div>;

  return (
    <div className={styles.container}>
      <h2>{honeypot.name} ({honeypot.protocol})</h2>
      <p>Status: <b>{honeypot.status}</b></p>
      <p>Events: {events.length}</p>
      <table className={styles.eventTable}>
        <thead>
          <tr>
            <th>Timestamp (UTC)</th>
            <th>Source IP</th>
            <th>Event Type</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {events.map(ev => (
            <tr key={ev._id}>
              <td>{new Date(ev.timestamp).toUTCString()}</td>
              <td>{ev.source_ip || '-'}</td>
              <td>{ev.event_type}</td>
              <td>
                {ev.event_type === 'session' ? (
                  <div>
                    <p>Duration: {Math.round(ev.duration)}s</p>
                    <p>Commands: {ev.commands?.length || 0}</p>
                    <pre>{ev.commands?.join('\n') || '[no commands]'}</pre>
                  </div>
                ) : (
                  JSON.stringify(ev)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 