import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { ServiceHealth } from '../types';

interface FooterProps {
  appVersion: string;
  serviceHealth: ServiceHealth;
  newVersion?: string | null;
  onOpenUpdate?: () => void;
  onRestartServices?: () => void;
  isRestarting?: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  appVersion,
  serviceHealth,
  newVersion,
  onOpenUpdate,
  onRestartServices,
  isRestarting,
}) => {
  return (
    <footer className="shrink-0 h-[30px] z-30 flex items-center justify-between px-4 bg-[#141418]/95 backdrop-blur-xl border-t border-white/[0.08] select-none text-[11px] font-mono">
      {/* Left: App Version & Updates */}
      <div className="flex items-center space-x-2 text-white/40">
        <span className="font-semibold text-white/50">Spark</span>
        <span className="text-white/20">•</span>
        <span className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.06] text-white/50">
          v{appVersion}
        </span>
        {newVersion && onOpenUpdate && (
          <button
            onClick={onOpenUpdate}
            className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 transition text-[10px] animate-pulse pointer-events-auto"
            title={`Spark update v${newVersion} is available. Click to review.`}
          >
            <Sparkles className="w-2.5 h-2.5 text-blue-400" />
            <span className="font-sans font-medium">Update to v{newVersion}</span>
          </button>
        )}
      </div>

      {/* Right: Service Health Indicators & Restart */}
      <div className="flex items-center space-x-2">
        {onRestartServices && (
          <button
            onClick={onRestartServices}
            disabled={isRestarting}
            title="Restart all local background services"
            className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.08] text-white/70 hover:text-white transition disabled:opacity-50 pointer-events-auto mr-1"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isRestarting ? 'animate-spin text-blue-400' : ''}`} />
            <span className="font-sans font-medium text-[10px]">Restart</span>
          </button>
        )}

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
