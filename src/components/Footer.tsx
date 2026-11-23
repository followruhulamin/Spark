import React from 'react';
import { ServiceHealth } from '../types';

interface FooterProps {
  appVersion: string;
  serviceHealth: ServiceHealth;
}

export const Footer: React.FC<FooterProps> = ({ appVersion, serviceHealth }) => {
  return (
    <footer className="shrink-0 h-[30px] z-30 flex items-center justify-between px-4 bg-[#141418]/95 backdrop-blur-xl border-t border-white/[0.08] select-none text-[11px] font-mono">
      {/* Left: App Version */}
      <div className="flex items-center space-x-2 text-white/40">
        <span className="font-semibold text-white/50">Spark</span>
        <span className="text-white/20">•</span>
        <span className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.06] text-white/50">
          v{appVersion}
        </span>
      </div>

      {/* Right: Service Health Indicators */}
      <div className="flex items-center space-x-2">
        <div
          title={`Nginx Web Server: ${serviceHealth.nginx}`}
          className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition pointer-events-auto"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              serviceHealth.nginx === 'running'
                ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                : 'bg-red-400 shadow-[0_0_6px_#f87171]'
            }`}
          />
          <span className="text-white/60">Nginx</span>
        </div>

        <div
          title={`PHP-FPM: ${serviceHealth.php}`}
          className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition pointer-events-auto"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              serviceHealth.php === 'running'
                ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                : 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
            }`}
          />
          <span className="text-white/60">PHP</span>
        </div>

        <div
          title={`MySQL Server: ${serviceHealth.mysql}`}
          className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition pointer-events-auto"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              serviceHealth.mysql === 'running'
                ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                : 'bg-red-400 shadow-[0_0_6px_#f87171]'
            }`}
          />
          <span className="text-white/60">MySQL</span>
        </div>

        <div
          title={`DNS (*.test): ${serviceHealth.dns}`}
          className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition pointer-events-auto"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              serviceHealth.dns === 'running'
                ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                : 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
            }`}
          />
          <span className="text-white/60">DNS</span>
        </div>
      </div>
    </footer>
  );
};
