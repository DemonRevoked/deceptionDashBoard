import React from 'react';
import '../styles/SkeletonLoader.css';

export default function SkeletonLoader({ count = 3 }) {
  return (
    <div className="skeleton-container">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card" />
      ))}
    </div>
  );
}
