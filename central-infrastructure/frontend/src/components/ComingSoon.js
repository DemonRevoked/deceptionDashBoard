import React from 'react';
import './ComingSoon.css';

const ComingSoon = ({ 
  title = "Feature Coming Soon", 
  description = "This feature is currently under development and will be available soon.",
  icon = "🚧",
  expectedDate = "Q1 2025",
  features = []
}) => {
  return (
    <div className="coming-soon-page">
      <div className="coming-soon-container">
        <div className="coming-soon-icon">
          {icon}
        </div>
        
        <h1 className="coming-soon-title">{title}</h1>
        
        <p className="coming-soon-description">{description}</p>
        
        <div className="coming-soon-timeline">
          <div className="timeline-item">
            <span className="timeline-icon">📅</span>
            <span className="timeline-text">Expected Release: {expectedDate}</span>
          </div>
        </div>

        {features.length > 0 && (
          <div className="coming-soon-features">
            <h3>What's Coming:</h3>
            <ul className="features-list">
              {features.map((feature, index) => (
                <li key={index} className="feature-item">
                  <span className="feature-icon">✨</span>
                  <span className="feature-text">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="coming-soon-actions">
          <button className="btn btn-primary" onClick={() => window.history.back()}>
            ← Go Back
          </button>
          <button className="btn btn-secondary" onClick={() => window.location.href = '/'}>
            🏠 Dashboard
          </button>
        </div>

        <div className="coming-soon-footer">
          <p>Stay tuned for updates! 🚀</p>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
