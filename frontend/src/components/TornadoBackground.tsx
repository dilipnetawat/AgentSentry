import React from 'react';

const TornadoBackground: React.FC = () => (
  <div className="tornado-background" aria-hidden="true">
    <svg viewBox="0 0 520 280" role="presentation">
      <defs>
        <linearGradient id="vortex-line" x1="0" x2="1">
          <stop offset="0" stopColor="#49dfff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#49dfff" stopOpacity="0.64" />
          <stop offset="1" stopColor="#8a73ff" stopOpacity="0" />
        </linearGradient>
        <filter id="vortex-glow"><feGaussianBlur stdDeviation="2.5" /></filter>
      </defs>
      <g fill="none" stroke="url(#vortex-line)" strokeLinecap="round">
        <path d="M30 48 C150 12 390 12 488 52 C394 86 142 82 66 116 C150 150 356 142 446 174 C356 214 166 205 112 232" strokeWidth="2" />
        <path d="M70 74 C176 45 354 48 454 78 C362 110 184 104 106 134 C190 169 324 158 412 190" strokeWidth="1.3" opacity="0.72" />
        <path d="M112 101 C200 79 326 83 410 104 C334 134 224 127 154 151 C218 178 302 174 370 198" strokeWidth="1" opacity="0.56" />
      </g>
      <g fill="#68e8ff" filter="url(#vortex-glow)" opacity="0.7">
        <circle cx="87" cy="94" r="3" /><circle cx="176" cy="58" r="2" /><circle cx="325" cy="78" r="2.5" /><circle cx="414" cy="148" r="2" /><circle cx="245" cy="177" r="2" />
      </g>
    </svg>
  </div>
);

export default TornadoBackground;
