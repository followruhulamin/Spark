import React from 'react';

interface SparkLogoProps {
  size?: number;
  className?: string;
  showDot?: boolean;
}

export const SparkLogo: React.FC<SparkLogoProps> = ({
  size = 24,
  className = '',
  showDot = false,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/logo.svg"
        alt="Spark Logo"
        width={size}
        height={size}
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
      {showDot && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse ring-2 ring-mac-bg" />
      )}
    </div>
  );
};
