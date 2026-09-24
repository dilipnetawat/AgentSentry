import React from 'react';

const GridBackground: React.FC = () => (
  <div className="grid-background-wrapper" aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
    <div style={{
      position: 'absolute',
      inset: '-50%',
      backgroundImage: `
        linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
      `,
      backgroundSize: '32px 32px',
      transform: 'perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px)',
      opacity: 0.5,
    }} />
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(ellipse at center, transparent 0%, var(--bg-base) 70%)',
    }} />
  </div>
);

export default GridBackground;
