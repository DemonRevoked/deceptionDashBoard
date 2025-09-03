import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchSessionById, fetchRawLogs, analyzeSession } from '../../api';
import styles from './HoneypotSessionDetails.module.css';

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
      setLoading(true);
      const result = await analyzeSession(sessionId);
      setAnalysis(result);
    } catch (e) {
      console.error('Analysis failed:', e);
      setError('Failed to analyze session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
          Loading session details...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.error}>
          <span className={styles.errorIcon}>⚠️</span>
          {error}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.error}>
          <span className={styles.errorIcon}>⚠️</span>
          Session not found.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Session Details</h2>
        <div className={styles.sessionStatus}>
          <span className={styles.statusDot} 
                style={{ backgroundColor: session.active ? 'var(--success)' : 'var(--error)' }} />
          {session.active ? 'Active' : 'Ended'}
        </div>
      </div>
      
      <div className={styles.metaGrid}>
        <div className={styles.metaItem}>
          <strong>Session ID</strong>
          <span>{session.session_id}</span>
        </div>
        <div className={styles.metaItem}>
          <strong>Source IP</strong>
          <span>{session.source_ip}</span>
        </div>
        <div className={styles.metaItem}>
          <strong>Start Time</strong>
          <span>{new Date(session.start_time).toLocaleString()}</span>
        </div>
        <div className={styles.metaItem}>
          <strong>End Time</strong>
          <span>{new Date(session.end_time).toLocaleString()}</span>
        </div>
        <div className={styles.metaItem}>
          <strong>Duration</strong>
          <span>{Math.round(session.duration)} seconds</span>
        </div>
        <div className={styles.metaItem}>
          <strong>Exit Code</strong>
          <span>{session.exit_code}</span>
        </div>
      </div>

      {session.terminal && (
        <div className={styles.section}>
          <h3>Terminal Info</h3>
          <div className={styles.terminalGrid}>
            <div className={styles.metaItem}>
              <strong>Type</strong>
              <span>{session.terminal.type}</span>
            </div>
            <div className={styles.metaItem}>
              <strong>TTY</strong>
              <span>{session.terminal.tty}</span>
            </div>
            <div className={styles.metaItem}>
              <strong>Dimensions</strong>
              <span>{session.terminal.columns}x{session.terminal.lines}</span>
            </div>
          </div>
        </div>
      )}

      {session.commands && session.commands.length > 0 && (
        <div className={styles.section}>
          <h3>Commands Executed</h3>
          <div className={styles.commandBlock}>
            {session.commands.map((cmd, i) => (
              <div key={i} className={styles.command}>
                <span className={styles.prompt}>$</span>
                <span className={styles.commandText}>{cmd}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {rawLog && (
        <div className={styles.section}>
          <h3>Raw Session Transcript</h3>
          <div className={styles.transcriptContainer}>
            <pre className={styles.transcript}>
              {rawLog.raw_data}
            </pre>
          </div>
        </div>
      )}

      {!analysis && !loading && (
        <div className={styles.analyzeSection}>
          <button 
            className={styles.analyzeButton}
            onClick={handleAnalyze}
          >
            Analyze Session
          </button>
        </div>
      )}

      {analysis && (
        <div className={styles.section}>
          <div className={styles.analysis}>
            <h3>AI Analysis</h3>
            <p>{analysis.verdict}</p>
            {analysis.risk_level && (
              <div className={`${styles.riskLevel} ${styles[analysis.risk_level.toLowerCase()]}`}>
                Risk Level: {analysis.risk_level}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 