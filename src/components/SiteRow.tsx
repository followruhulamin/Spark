import React, { useState, useEffect, useRef } from 'react';
import { confirm as tauriConfirm } from '@tauri-apps/plugin-dialog';
import {
  Compass,
  Lock,
  Unlock,
  Star,
  Code,
  Terminal,
  Trash2,
  Folder,
  FolderInput,
  Box,
  MoreVertical,
  Unlink,
  FileCode,
  Check,
  X,
} from 'lucide-react';
import { Site, SupportedIde } from '../types';
import { MoveSiteModal } from './MoveSiteModal';

interface SiteRowProps {
  site: Site;
  defaultIde: SupportedIde;
  onOpenBrowser: (url: string) => void;
  onToggleFavorite: (id: string) => void;
  onToggleHttps: (id: string) => void;
  onOpenIde: (path: string) => void;
  onOpenTerminal: (path: string) => void;
  onSetPhpVersion: (id: string, version: string) => void;
  onUnlink: (id: string) => void;
  onDelete: (id: string) => void;
  onMove?: (id: string, newDestination: string) => Promise<void>;
}

const FRAMEWORK_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  laravel: { label: 'Laravel', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  react: { label: 'React', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  vue: { label: 'Vue', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  svelte: { label: 'Svelte', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  livewire: { label: 'Livewire', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
  php: { label: 'PHP', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  static: { label: 'Static', color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20' },
};

export const SiteRow: React.FC<SiteRowProps> = ({
  site,
  defaultIde,
  onOpenBrowser,
  onToggleFavorite,
  onToggleHttps,
  onOpenIde,
  onOpenTerminal,
  onSetPhpVersion,
  onUnlink,
  onDelete,
  onMove,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPhpModalOpen, setIsPhpModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen && !isPhpModalOpen && !isMoveModalOpen) return;

    const handleClickOutside = (event: MouseEvent | PointerEvent) => {
      const target = event.target as Node;
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setIsPhpModalOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen, isPhpModalOpen]);

  const frameworkInfo = FRAMEWORK_BADGES[site.framework] || FRAMEWORK_BADGES.laravel;
  const protocol = site.secured ? 'https' : 'http';
  const siteUrl = `${protocol}://${site.domain}`;

  const handleUnlinkClick = async () => {
    setIsMenuOpen(false);
    try {
      const confirmed = await tauriConfirm(
        `Unlink '${site.name}' from Spark?\n\nThis will remove the site from Spark. Your project files will NOT be deleted from disk.`,
        {
          title: 'Unlink App',
          kind: 'info',
          okLabel: 'Unlink App',
          cancelLabel: 'Cancel',
        }
      );
      if (confirmed) {
        onUnlink(site.id);
      }
    } catch {
      if (
        window.confirm(
          `Unlink '${site.name}' from Spark?\n\n(Your project files will NOT be deleted)`
        )
      ) {
        onUnlink(site.id);
      }
    }
  };

  const handleDeleteClick = async () => {
    setIsMenuOpen(false);
    try {
      const confirmed = await tauriConfirm(
        `Are you sure you want to completely delete '${site.name}'?\n\n⚠️ WARNING: This will permanently delete the folder and all its contents from disk:\n${site.path}\n\nThis action cannot be undone!`,
        {
          title: 'Delete App & Folder',
          kind: 'warning',
          okLabel: 'Delete Permanently',
          cancelLabel: 'Cancel',
        }
      );
      if (confirmed) {
        onDelete(site.id);
      }
    } catch {
      if (
        window.confirm(
          `Are you sure you want to completely delete '${site.name}'?\n\n⚠️ WARNING: This will permanently delete the folder from disk:\n${site.path}\n\nThis cannot be undone!`
        )
      ) {
        onDelete(site.id);
      }
    }
  };

  return (
    <div className="group flex items-center justify-between px-4 py-3 hover:bg-white/[0.04] border-b border-white/[0.05] transition-colors duration-150">
      {/* Left: Framework Icon, Domain & Local Path */}
      <div className="flex items-center space-x-3.5 min-w-0 flex-1">
        {/* Framework Badge */}
        <div
          title={`Framework: ${frameworkInfo.label}`}
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${frameworkInfo.bg}`}
        >
          <Box className={`w-4 h-4 ${frameworkInfo.color}`} />
        </div>

        {/* Domain & Path */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <span
              onClick={() => onOpenBrowser(siteUrl)}
              className="text-sm font-medium text-white/95 hover:text-blue-400 transition cursor-pointer truncate tracking-tight font-sans"
            >
              {site.domain}
            </span>

            {/* Framework Pill */}
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${frameworkInfo.bg} ${frameworkInfo.color}`}
            >
              {frameworkInfo.label}
            </span>

            {/* HTTPS State Pill */}
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                site.secured
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-white/[0.04] border-white/[0.06] text-white/40'
              }`}
            >
              {site.secured ? 'SSL' : 'HTTP'}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 mt-0.5 text-xs text-white/40 truncate">
            <Folder className="w-3 h-3 shrink-0 text-white/30" />
            <span className="truncate font-mono text-[11px] hover:text-white/70 transition" title={site.path}>
              {site.path}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center space-x-1 pl-4 shrink-0">
        {/* HTTPS Padlock Toggle */}
        <button
          onClick={() => onToggleHttps(site.id)}
          title={site.secured ? 'HTTPS Enabled (Local CA Valid) - Click to disable' : 'HTTPS Disabled - Click to enable'}
          className={`p-1.5 rounded-md transition active:scale-95 ${
            site.secured
              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
              : 'hover:bg-white/[0.08] text-white/40 hover:text-white/80'
          }`}
        >
          {site.secured ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </button>

        {/* Open in Browser */}
        <button
          onClick={() => onOpenBrowser(siteUrl)}
          title={`Open ${siteUrl} in Browser`}
          className="p-1.5 rounded-md hover:bg-white/[0.08] text-white/70 hover:text-white transition active:scale-95"
        >
          <Compass className="w-4 h-4" />
        </button>

        {/* Open in IDE */}
        <button
          onClick={() => onOpenIde(site.path)}
          title={`Open in ${defaultIde.toUpperCase()}`}
          className="p-1.5 rounded-md hover:bg-white/[0.08] text-white/70 hover:text-white transition active:scale-95"
        >
          <Code className="w-4 h-4" />
        </button>

        {/* Favorite Toggle */}
        <button
          onClick={() => onToggleFavorite(site.id)}
          title={site.favorite ? 'Remove from favorites' : 'Add to favorites'}
          className={`p-1.5 rounded-md transition active:scale-95 ${
            site.favorite ? 'text-amber-400 hover:text-amber-300' : 'text-white/30 hover:text-white/70'
          }`}
        >
          <Star className={`w-4 h-4 ${site.favorite ? 'fill-amber-400' : ''}`} />
        </button>

        {/* More Actions Menu (Three Dots) */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title="More actions"
            className={`p-1.5 rounded-md transition active:scale-95 ${
              isMenuOpen
                ? 'bg-white/[0.12] text-white'
                : 'hover:bg-white/[0.08] text-white/50 hover:text-white'
            }`}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 py-1.5 rounded-xl bg-[#22222a] border border-white/[0.12] shadow-2xl z-30 text-xs backdrop-blur-md">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenTerminal(site.path);
                }}
                className="w-full text-left px-3 py-2 hover:bg-white/[0.08] transition flex items-center space-x-2.5 text-white/80 hover:text-white"
              >
                <Terminal className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Open in Terminal</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsPhpModalOpen(true);
                }}
                className="w-full text-left px-3 py-2 hover:bg-white/[0.08] transition flex items-center space-x-2.5 text-white/80 hover:text-white"
              >
                <FileCode className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Change PHP Version</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsMoveModalOpen(true);
                }}
                className="w-full text-left px-3 py-2 hover:bg-white/[0.08] transition flex items-center space-x-2.5 text-white/80 hover:text-white"
              >
                <FolderInput className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Move Site</span>
              </button>

              <div className="my-1 border-t border-white/[0.08]" />

              <button
                onClick={handleUnlinkClick}
                title="Remove site from Spark (keeps project files on disk)"
                className="w-full text-left px-3 py-2 hover:bg-amber-500/10 text-amber-400/90 hover:text-amber-300 transition flex items-center space-x-2.5"
              >
                <Unlink className="w-3.5 h-3.5 shrink-0" />
                <span>Unlink App</span>
              </button>

              <button
                onClick={handleDeleteClick}
                title="Completely delete folder from disk"
                className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition flex items-center space-x-2.5"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Delete Site</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Change PHP Version Modal Popup */}
      {isPhpModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsPhpModalOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-[#1c1c24] border border-white/[0.12] shadow-2xl p-5 text-left text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Change PHP Version</h3>
                  <p className="text-[11px] text-white/50 font-mono truncate max-w-[220px]">
                    {site.domain}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPhpModalOpen(false)}
                className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Options List */}
            <div className="py-3 space-y-1.5">
              {[
                { id: 'default', label: 'Global (Default)', desc: 'Inherits the system-wide active PHP version' },
                { id: '8.6', label: 'PHP 8.6 (Dev)', desc: 'Isolated FastCGI pool (/tmp/spark-php86.sock)' },
                { id: '8.5', label: 'PHP 8.5', desc: 'Isolated FastCGI pool (/tmp/spark-php85.sock)' },
                { id: '8.4', label: 'PHP 8.4', desc: 'Isolated FastCGI pool (/tmp/spark-php84.sock)' },
                { id: '8.3', label: 'PHP 8.3', desc: 'Isolated FastCGI pool (/tmp/spark-php83.sock)' },
                { id: '8.2', label: 'PHP 8.2', desc: 'Isolated FastCGI pool (/tmp/spark-php82.sock)' },
                { id: '8.1', label: 'PHP 8.1', desc: 'Isolated FastCGI pool (/tmp/spark-php81.sock)' },
              ].map((opt) => {
                const isSelected = site.php_version === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      onSetPhpVersion(site.id, opt.id);
                      setIsPhpModalOpen(false);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-blue-600/[0.12] border-blue-500/40 text-white'
                        : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.06] text-white/80'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-white/30 bg-transparent'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium font-mono flex items-center space-x-1.5">
                          <span>{opt.label}</span>
                          {isSelected && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-white/40 mt-0.5 truncate">{opt.desc}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-2" />}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end">
              <button
                onClick={() => setIsPhpModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Site Modal Popup */}
      <MoveSiteModal
        site={site}
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        onMove={onMove || (async () => {})}
      />
    </div>
  );
};
