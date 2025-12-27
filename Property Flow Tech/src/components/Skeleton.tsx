import React from 'react';
import './Skeleton.css';

export const SkeletonCard: React.FC<{ count?: number }> = ({ count = 1 }) => {
  return (
    <>
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-card-top">
            <div className="skeleton skeleton-unit"></div>
            <div className="skeleton skeleton-title"></div>
          </div>
          <div className="skeleton-card-grid">
            <div className="skeleton skeleton-meta"></div>
            <div className="skeleton skeleton-meta"></div>
            <div className="skeleton skeleton-meta"></div>
          </div>
        </div>
      ))}
    </>
  );
};

export const SkeletonText: React.FC<{ lines?: number; width?: string }> = ({ lines = 1, width = '100%' }) => {
  return (
    <>
      {Array(lines).fill(0).map((_, i) => (
        <div key={i} className="skeleton" style={{ width, height: '1rem', marginBottom: '0.5rem' }}></div>
      ))}
    </>
  );
};

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="skeleton-table">
      {Array(rows).fill(0).map((_, rowIdx) => (
        <div key={rowIdx} className="skeleton-table-row">
          {Array(cols).fill(0).map((_, colIdx) => (
            <div key={colIdx} className="skeleton" style={{ flex: 1, height: '2rem' }}></div>
          ))}
        </div>
      ))}
    </div>
  );
};
