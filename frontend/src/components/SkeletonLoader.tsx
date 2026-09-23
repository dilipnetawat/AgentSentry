import React from 'react';

export const SkeletonText: React.FC<{ width?: string, className?: string }> = ({ width = '100%', className = '' }) => (
  <div className={`skeleton skeleton-text ${className}`} style={{ width, height: '1.2em' }}></div>
);

export const SkeletonTitle: React.FC = () => (
  <div className="skeleton skeleton-title"></div>
);

export const SkeletonMetric: React.FC = () => (
  <div className="skeleton skeleton-metric"></div>
);

export const SkeletonTable: React.FC<{ rows?: number, columns?: number }> = ({ rows = 5, columns = 4 }) => (
  <div className="table-container border-0 rounded-none w-full">
    <table className="data-table w-full">
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
              <td key={c}><SkeletonText width={Math.random() * 40 + 40 + '%'} /></td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
