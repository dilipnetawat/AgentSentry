import React from 'react';

export const SkeletonText: React.FC<{ width?: string; className?: string }> = ({ 
  width = '100%', 
  className = '' 
}) => (
  <div className={`skeleton ${className}`} style={{ width, height: '1.2em' }} />
);

export const SkeletonTitle: React.FC<{ width?: string; className?: string }> = ({ 
  width = '40%', 
  className = '' 
}) => (
  <div className={`skeleton skeleton-title ${className}`} style={{ width }} />
);

export const SkeletonMetric: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton skeleton-metric ${className}`} />
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`p-4 rounded border border-border bg-surface space-y-2 ${className}`}>
    <SkeletonTitle width="35%" />
    <SkeletonText width="90%" />
    <SkeletonText width="60%" />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="table-container">
    <table className="data-table">
      <thead>
        <tr>
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i}><SkeletonText width="60%" /></th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: columns }).map((_, c) => (
              <td key={c}><SkeletonText width={`${Math.floor(Math.random() * 35) + 45}%`} /></td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
