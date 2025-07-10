import React, { useEffect, useState } from 'react';
import { fetchEvents, fetchHoneypots, fetchRawLogs } from '../../api';
import styles from './EventsPage.module.css';

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [honeypots, setHoneypots] = useState([]);
  const [filters, setFilters] = useState({ protocol: 'ssh', honeypot_id: '', source_ip: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHoneypots().then(setHoneypots);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchEvents({ ...filters, limit: 100 })
      .then(setEvents)
      .catch(e => setError(e.message || 'Failed to fetch events'))
      .finally(() => setLoading(false));
  }, [filters]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div className={styles.container}>
      <h2>SSH Events</h2>
      <div className={styles.filters}>
        <label>
          Honeypot:
          <select name="honeypot_id" value={filters.honeypot_id} onChange={handleFilterChange}>
            <option value="">All</option>
            {honeypots.map(h => (
              <option key={h._id} value={h._id}>{h.name}</option>
            ))}
          </select>
        </label>
        <label>
          Source IP:
          <input name="source_ip" value={filters.source_ip} onChange={handleFilterChange} placeholder="Filter by IP" />
        </label>
      </div>
      {loading ? (
        <div>Loading events...</div>
      ) : error ? (
        <div className={styles.error}>Error: {error}</div>
      ) : (
        <table className={styles.eventTable}>
          <thead>
            <tr>
              <th>Timestamp (UTC)</th>
              <th>Honeypot</th>
              <th>Protocol</th>
              <th>Source IP</th>
              <th>Commands</th>
              <th>Raw Log</th>
            </tr>
          </thead>
          <tbody>
            {events.map(ev => (
              <tr key={ev._id}>
                <td>{new Date(ev.timestamp * 1000).toUTCString()}</td>
                <td>{honeypots.find(h => h._id === ev.honeypot_id)?.name || ev.honeypot_id}</td>
                <td>{ev.protocol}</td>
                <td>{ev.source_ip || '-'}</td>
                <td><pre>{(ev.commands || []).join('\n')}</pre></td>
                <td><RawLogLink raw_log_id={ev.raw_log_id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function RawLogLink({ raw_log_id }) {
  // For now, just show the ID. You can expand to fetch and show the raw log in a modal.
  return raw_log_id ? <span title={raw_log_id}>View</span> : '-';
} 