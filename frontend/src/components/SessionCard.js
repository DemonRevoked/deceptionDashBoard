import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/SessionCard.css';

export default function SessionCard({
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
    <div className="session-card">
      <div
        className="session-card__header"
        onClick={toggle}
        tabIndex={0}
        onKeyPress={e => e.key === 'Enter' && toggle()}
      >
        <span
          className="session-card__arrow"
          style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          ▶
        </span>
        <span className="session-card__ip">{ip}</span>
        <span className="session-card__meta">
          {sessions.length} session{sessions.length !== 1 && 's'} • last {lastTime} • {totalCmds}{' '}
          cmd{totalCmds !== 1 && 's'}
        </span>
        <button
          className="session-card__analyze-btn"
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
          <ul className="session-card__list">
            {sessions.map(sess => (
              <li key={sess.session_id} className="session-card__item">
                <Link
                  to={`/sessions/${encodeURIComponent(sess.session_id)}`}
                  className="session-card__link"
                >
                  <code className="session-card__code">
                    {sess.commands?.join('   |   ') || '[no commands]'}
                  </code>
                </Link>
              </li>
            ))}
          </ul>

          {analysis.verdict && (
            <div className="session-card__ai-verdict">
              <h3>AI Verdict</h3>
              <p>{analysis.verdict}</p>
            </div>
          )}
        </>
      )}
    </div>
);
}
