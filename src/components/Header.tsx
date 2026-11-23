import React from 'react';
import { RefreshCw, Plus, Settings, Search } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { SparkLogo } from './SparkLogo';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isCreateOpen: boolean;
  onToggleCreate: () => void;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  siteCount: number;
  missingRequiredCount?: number;
  onOpenSetup?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  isCreateOpen,
  onToggleCreate,
  isSettingsOpen,
  onToggleSettings,
  onRefresh,
  isRefreshing,
  siteCount,
  missingRequiredCount = 0,
  onOpenSetup,
}) => {
  const handleMouseDown = async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (!target.closest('button, input, select, a, [role="button"]')) {
      try {
        const appWindow = getCurrentWindow();
        if (e.detail === 2) {
          await appWindow.toggleMaximize();
        } else {
          await appWindow.startDragging();
        }
      } catch (err) {
        console.error('Drag error:', err);
      }
    }
  };

  const handleDoubleClick = async (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('button, input, select, a, [role="button"]')) {
      try {
        const appWindow = getCurrentWindow();
        await appWindow.toggleMaximize();
      } catch (err) {
        console.error('Toggle maximize error:', err);
      }
    }
  };

  return (
    <header
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      className="shrink-0 h-[50px] z-30 flex items-center justify-between px-4 bg-[#16161a]/95 backdrop-blur-xl border-b border-white/[0.08] select-none cursor-default"
    >
      <div data-tauri-drag-region className="w-full flex items-center justify-between">
        {/* Left: Native macOS Window Controls (Traffic Lights) spacing + Window Title */}
        <div data-tauri-drag-region className="flex items-center pl-[80px] space-x-2">
          <SparkLogo size={18} showDot={false} />
          <span
            data-tauri-drag-region
            className="text-[13px] font-semibold text-white tracking-tight pointer-events-none select-none leading-none"
          >
            {isSettingsOpen ? 'Spark Settings' : 'Spark'}
          </span>
        </div>

        {/* Middle: Search Bar */}
        <div data-tauri-drag-region className="flex-1 max-w-sm mx-4">
          <div data-tauri-drag-region className="relative flex items-center">
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-white/35 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={`Search ${siteCount} local sites...`}
              className="w-full bg-white/[0.06] hover:bg-white/[0.08] focus:bg-[#1e1e24] focus:ring-1 focus:ring-blue-500/50 border border-white/[0.08] rounded-md pl-8 pr-8 py-1.5 text-xs text-white placeholder-white/40 transition outline-none cursor-text"
            />
            {searchQuery ? (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 text-[10px] text-white/40 hover:text-white"
              >
                ✕
              </button>
            ) : (
              <kbd className="absolute right-2 px-1 py-0.5 text-[10px] font-mono text-white/30 bg-white/[0.04] rounded border border-white/[0.06] pointer-events-none">
                ⌘K
              </kbd>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div data-tauri-drag-region className="flex items-center space-x-2">
          {missingRequiredCount > 0 && onOpenSetup && (
            <button
              onClick={onOpenSetup}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition active:scale-95 animate-pulse"
              title="Essential components need setup"
            >
              <span>Setup Required ({missingRequiredCount})</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh Sites and Services"
            className="p-1.5 rounded-md hover:bg-white/[0.08] text-white/70 hover:text-white transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <button
            onClick={onToggleCreate}
            title={isCreateOpen ? "Close New App (Esc)" : "Create New App"}
            className={`relative group p-1.5 rounded-lg flex items-center justify-center transition-all duration-300 active:scale-95 ${
              isCreateOpen
                ? 'bg-gradient-to-tr from-blue-700 to-indigo-800 text-white shadow-md shadow-blue-600/40 ring-1 ring-white/20'
                : 'bg-gradient-to-tr from-blue-600 via-indigo-500 to-sky-400 hover:from-blue-500 hover:via-indigo-400 hover:to-sky-300 text-white shadow-md shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-105 btn-glow-pulse'
            }`}
          >
            <Plus
              className={`w-4 h-4 transition-transform duration-300 ease-out ${
                isCreateOpen ? 'rotate-45' : 'group-hover:rotate-90'
              }`}
            />
          </button>

          <button
            onClick={onToggleSettings}
            title="Preferences & Settings (⌘,)"
            className={`p-1.5 rounded-md transition active:scale-95 ${
              isSettingsOpen
                ? 'bg-blue-600 text-white'
                : 'hover:bg-white/[0.08] text-white/70 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
