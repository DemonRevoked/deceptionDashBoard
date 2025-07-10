import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/HoneypotSessionSummary.css';

export default function HoneypotSessionSummary({
  ip,
  sessions,
  isOpen,
  toggle,
  analysis = {},
  onAnalyze
}) {
  // compute last activity & total commands
  const lastTime = new Date(
    Math.max(...sessions.map(s => new Date(s.start_time)))
  ).toLocaleString();
  const totalCmds = sessions.reduce((sum, s) => sum + (s.commands?.length || 0), 0);

  return (
    <div className="session-summary">
      <div
        className="session-summary__header"
        onClick={toggle}
        tabIndex={0}
        onKeyPress={e => e.key === 'Enter' && toggle()}
      >
        <span
          className="session-summary__arrow"
          style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          ▶
        </span>
        <span className="session-summary__ip">{ip}</span>
        <span className="session-summary__meta">
          {sessions.length} session{sessions.length !== 1 && 's'} • last {lastTime} • {totalCmds}{' '}
          cmd{totalCmds !== 1 && 's'}
        </span>
        <button
          className="session-summary__analyze-btn"
          onClick={e => {
            e.stopPropagation();
            onAnalyze(ip);
          }}
          disabled={analysis.loading}
        >
          {analysis.loading ? 'Analyzing…' : 'Analyze Intention'}
        </button>
      </div>

      {isOpen && (
        <>
          <ul className="session-summary__list">
            {sessions.map(sess => (
              <li key={sess.session_id} className="session-summary__item">
                <Link
                  to={`/sessions/${encodeURIComponent(sess.session_id)}`}
                  className="session-summary__link"
                >
                  <div className="session-summary__session-header">
                    <span className="session-summary__time">
                      {new Date(sess.start_time).toLocaleString()}
                    </span>
                    <span className="session-summary__duration">
                      ({Math.round(sess.duration)}s)
                    </span>
                  </div>
                  <code className="session-summary__code">
                    {sess.commands?.join('   |   ') || '[no commands]'}
                  </code>
                </Link>
              </li>
            ))}
          </ul>

          {analysis.verdict && (
            <div className="session-summary__ai-verdict">
              <h3>AI Verdict</h3>
              <p>{analysis.verdict}</p>
            </div>
          )}
        </>
      )}
    </div>
);
}
