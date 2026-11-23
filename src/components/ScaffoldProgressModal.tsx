import React, { useEffect, useRef } from 'react';
import { Terminal, CheckCircle2, AlertCircle, Compass, Code, X, Loader2 } from 'lucide-react';
import { ScaffoldLogEvent, Site, SupportedIde } from '../types';

interface ScaffoldProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ScaffoldLogEvent[];
  isDone: boolean;
  error: string | null;
  createdSite: Site | null;
  defaultIde: SupportedIde;
  onOpenBrowser: (url: string) => void;
  onOpenIde: (path: string) => void;
}

export const ScaffoldProgressModal: React.FC<ScaffoldProgressModalProps> = ({
  isOpen,
  onClose,
  logs,
  isDone,
  error,
  createdSite,
  defaultIde,
  onOpenBrowser,
  onOpenIde,
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-xl bg-[#1a1a20] border border-white/[0.12] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#16161a] border-b border-white/[0.08]">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1.5 mr-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block" />
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-white/70 font-mono">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span>Scaffolding Engine</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isDone && !error && (
              <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Running...</span>
              </div>
            )}
            {isDone && (
              <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>Completed</span>
              </div>
            )}
            {error && (
              <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[11px] text-red-400">
                <AlertCircle className="w-3 h-3" />
                <span>Error</span>
              </div>
            )}
            <button
              onClick={onClose}
              disabled={!isDone && !error}
              className="p-1 rounded-md text-white/40 hover:text-white transition disabled:opacity-30"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Terminal Output */}
        <div className="p-4 bg-[#121216] font-mono text-xs text-white/80 overflow-y-auto flex-1 space-y-1 select-text">
          {logs.length === 0 ? (
            <div className="text-white/30 italic">Initializing background process...</div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`flex items-start space-x-2 ${
                  log.is_error ? 'text-red-400' : log.step === 'complete' ? 'text-emerald-400 font-semibold' : 'text-white/70'
                }`}
              >
                <span className="text-white/30 shrink-0 select-none">&gt;</span>
                <span className="break-all whitespace-pre-wrap">{log.message}</span>
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Completion Footer */}
        {isDone && createdSite && (
          <div className="px-5 py-4 bg-[#18181e] border-t border-white/[0.08] flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">
                {createdSite.name} is ready!
              </div>
              <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
                https://{createdSite.domain}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onOpenBrowser(`https://${createdSite.domain}`)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition active:scale-95 shadow-md shadow-emerald-500/20"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Open in Browser</span>
              </button>

              <button
                onClick={() => onOpenIde(createdSite.path)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/[0.08] transition active:scale-95"
              >
                <Code className="w-3.5 h-3.5" />
                <span>Open in {defaultIde.toUpperCase()}</span>
              </button>

              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] hover:bg-white/[0.08] text-white/70 hover:text-white transition"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
