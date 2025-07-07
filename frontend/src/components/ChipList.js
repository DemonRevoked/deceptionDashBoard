import React from 'react';
import '../styles/ChipList.css';

export default function ChipList({ chips, onRemove }) {
  return (
    <div className="chip-list">
      {chips.map((c, i) => (
        <span key={i} className="chip">
          {c}
          <button onClick={onRemove} className="chip__close">×</button>
        </span>
      ))}
    </div>
  );
}
