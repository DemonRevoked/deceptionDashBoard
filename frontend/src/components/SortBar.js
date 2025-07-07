import React from 'react';
import '../styles/SortBar.css';

export default function SortBar({ sortBy, onChange }) {
  return (
    <select
      className="sort-bar"
      value={sortBy}
      onChange={e => onChange(e.target.value)}
    >
      <option value="recent">Sort by Recent</option>
      <option value="count">Sort by Session Count</option>
    </select>
  );
}
