// src/components/SearchBar.js
import React from 'react';
import '../styles/SearchBar.css';

export default function SearchBar({ value, onChange }) {
  return (
    <div className="search-bar">
      <input
        className="search-bar__input"
        type="text"
        placeholder="Search by IP, Session ID or command..."
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}