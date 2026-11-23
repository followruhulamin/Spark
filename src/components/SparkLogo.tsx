import React from 'react';

interface SparkLogoProps {
  size?: number;
  className?: string;
  showDot?: boolean;
}

export const SparkLogo: React.FC<SparkLogoProps> = ({
  size = 24,
  className = '',
  showDot = true,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        <linearGradient id="sparkRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B6B" />
          <stop offset="50%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
        <linearGradient id="sparkBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#251619" />
          <stop offset="100%" stopColor="#140D10" />
        </linearGradient>
        <filter id="sparkGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <rect
        x="4"
        y="4"
        width="92"
        height="92"
        rx="22"
        fill="url(#sparkBgGrad)"
        stroke="#EF4444"
        strokeOpacity="0.4"
        strokeWidth="2.5"
      />
      <text
        x="50"
        y="71"
        fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
        fontSize="64"
        fontWeight="900"
        textAnchor="middle"
        fill="url(#sparkRedGrad)"
        filter="url(#sparkGlow)"
      >
        S
      </text>
      {showDot && (
        <circle cx="78" cy="22" r="5" fill="#F87171" className="animate-pulse" />
      )}
    </svg>
  );
};
