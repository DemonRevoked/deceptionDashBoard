import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/SessionList.module.css'; // Import CSS Module
import { fetchSessions } from '../api';

function SessionList() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const data = await fetchSessions();
        setSessions(data);
      } catch (e) {
        setError(e.message || 'Failed to fetch sessions');
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, []);

  if (loading) return <div className="loading">Loading SSH sessions...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className={styles.container}>
      <h2>SSH Honeypot Sessions</h2>
      {sessions.length === 0 ? (
        <p>No SSH sessions captured yet.</p>
      ) : (
        <table className={`table ${styles.sessionTable}`}>
          <thead>
            <tr>
              <th>Timestamp (UTC)</th>
              <th>Source IP</th>
              <th>Commands Executed</th>
              <th>AI Verdict</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session._id}>
                <td>{new Date(session.start_time).toUTCString()}</td>
                <td>{session.source_ip}</td>
                <td>{session.commands.length}</td>
                <td className={styles.verdict}>{session.aiVerdict || 'N/A'}</td>
                <td><Link to={`/sessions/${session._id}`}>View Details</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default SessionList;