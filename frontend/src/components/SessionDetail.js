import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import styles from '../styles/SessionDetail.module.css'; // Import CSS Module
import { fetchSession } from '../api';

function SessionDetail() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const data = await fetchSession(id);
        setSession(data);
      } catch (e) {
        setError(e.message || 'Failed to fetch session details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadSession();
    }
  }, [id]);

  // Memoize the full transcript string. This prevents re-calculating this potentially
  // large string on every render, which is a good practice for performance.
  const fullTranscript = useMemo(() =>
    session ? session.events.map(e => e.data).join('') : ''
  , [session]);

  if (loading) return <div className="loading">Loading session details...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!session) return <p>Session not found.</p>;

  return (
    <div className={styles.container}>
      <h2>Session Details: {session.source_ip}</h2>
      <div className={styles.metaGrid}>
        <div><strong>Session ID:</strong> {session._id}</div>
        <div><strong>Source IP:</strong> {session.source_ip}</div>
        <div><strong>Start Time:</strong> {new Date(session.start_time).toUTCString()}</div>
        <div><strong>End Time:</strong> {new Date(session.end_time).toUTCString()}</div>
      </div>

      <h3>Commands Executed</h3>
      {session.commands.length > 0 ? (
        <pre className={styles.commandBlock}>
          {session.commands.join('\n')}
        </pre>
      ) : (
        <p>No commands were executed in this session.</p>
      )}

      <h3>Full Transcript</h3>
      <pre className={styles.transcript}>
        {fullTranscript}
      </pre>
    </div>
  );
}

export default SessionDetail;