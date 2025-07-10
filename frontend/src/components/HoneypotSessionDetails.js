import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchSessionById, fetchRawLogs, analyzeSession } from '../api';
import styles from '../styles/HoneypotSessionDetails.module.css';

export default function HoneypotSessionDetails() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [rawLog, setRawLog] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const sessionData = await fetchSessionById(sessionId);
        console.log('Fetched session data:', sessionData);
        setSession(sessionData);

        if (sessionData.raw_log_id) {
          const rawLogData = await fetchRawLogs({ raw_log_id: sessionData.raw_log_id });
          console.log('Fetched raw log data:', rawLogData);
          setRawLog(rawLogData[0]);
        }
      } catch (e) {
        console.error('Error loading session:', e);
        setError(e.message || 'Failed to load session data');
      } finally {
        setLoading(false);
      }
    }
    if (sessionId) loadData();
  }, [sessionId]);

  const handleAnalyze = async () => {
    try {
      const result = await analyzeSession(sessionId);
      setAnalysis(result);
    } catch (e) {
      console.error('Analysis failed:', e);
    }
  };

  if (loading) return <div className={styles.loading}>Loading session details...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;
  if (!session) return <div className={styles.error}>Session not found.</div>;

  return (
    <div className={styles.container}>
      <h2>Session Details</h2>
      
      <div className={styles.metaGrid}>
        <div>
          <strong>Session ID:</strong> {session.session_id}
        </div>
        <div>
          <strong>Source IP:</strong> {session.source_ip}
        </div>
        <div>
          <strong>Start Time:</strong> {new Date(session.start_time).toLocaleString()}
        </div>
        <div>
          <strong>End Time:</strong> {new Date(session.end_time).toLocaleString()}
        </div>
        <div>
          <strong>Duration:</strong> {Math.round(session.duration)} seconds
        </div>
        <div>
          <strong>Exit Code:</strong> {session.exit_code}
        </div>
      </div>

      {session.terminal && (
        <>
          <h3>Terminal Info</h3>
          <div className={styles.metaGrid}>
            <div>
              <strong>Type:</strong> {session.terminal.type}
            </div>
            <div>
              <strong>TTY:</strong> {session.terminal.tty}
            </div>
            <div>
              <strong>Dimensions:</strong> {session.terminal.columns}x{session.terminal.lines}
            </div>
          </div>
        </>
      )}

      {session.commands && (
        <>
          <h3>Commands</h3>
          <div className={styles.commandBlock}>
            {session.commands.map((cmd, i) => (
              <div key={i} className={styles.command}>
                <span className={styles.prompt}>$ </span>
                {cmd}
              </div>
            ))}
          </div>
        </>
      )}

      {rawLog && (
        <>
          <h3>Raw Session Transcript</h3>
          <pre className={styles.transcript}>
            {rawLog.raw_data}
          </pre>
        </>
      )}

      {!analysis && (
        <button 
          className={styles.analyzeButton}
          onClick={handleAnalyze}
        >
          Analyze Session
        </button>
      )}

      {analysis && (
        <div className={styles.analysis}>
          <h3>AI Analysis</h3>
          <p>{analysis.verdict}</p>
        </div>
      )}
    </div>
  );
} 