import React, { useState, useEffect } from 'react';
import { FolderInput, Folder, Loader2, ArrowRight, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { Site } from '../types';

interface MoveSiteModalProps {
  site: Site | null;
  isOpen: boolean;
  onClose: () => void;
  onMove: (id: string, newDestination: string) => Promise<void>;
}

export const MoveSiteModal: React.FC<MoveSiteModalProps> = ({
  site,
  isOpen,
  onClose,
  onMove,
}) => {
  const [destinationFolder, setDestinationFolder] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDestinationFolder('');
      setIsMoving(false);
      setError(null);
    }
  }, [isOpen, site]);

  if (!isOpen || !site) return null;

  // Extract folder name from current path
  const currentPath = site.path;
  const folderName = currentPath.split('/').filter(Boolean).pop() || site.name;

  // Calculate target path preview
  const calculatedTargetPath = destinationFolder.trim()
    ? destinationFolder.trim().endsWith(`/${folderName}`)
      ? destinationFolder.trim()
      : `${destinationFolder.trim().replace(/\/+$/, '')}/${folderName}`
    : '';

  const handleSelectFolder = async () => {
    try {
      const selected = await invoke<string | null>('pick_folder');
      if (selected && typeof selected === 'string') {
        setDestinationFolder(selected);
        setError(null);
      }
    } catch (e: any) {
      console.error('Failed to open folder picker', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationFolder.trim()) {
      setError('Please select or specify a destination directory');
      return;
    }

    if (calculatedTargetPath === currentPath) {
      setError('Destination is identical to the current location');
      return;
    }

    setIsMoving(true);
    setError(null);

    try {
      await onMove(site.id, destinationFolder.trim());
      setIsMoving(false);
      onClose();
    } catch (err: any) {
      console.error('Failed to move site:', err);
      setError(err?.message || err?.toString() || 'Failed to move site folder');
      setIsMoving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#18181e] border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col text-white animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FolderInput className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">Move Site Folder</h3>
              <p className="text-[11px] text-white/50 font-mono truncate max-w-[260px]">
                {site.domain}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isMoving}
            className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/[0.08] transition disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Current Location */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-1.5">
              Current Location
            </label>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs font-mono text-white/70 truncate flex items-center space-x-2">
              <Folder className="w-3.5 h-3.5 text-white/40 shrink-0" />
              <span className="truncate">{currentPath}</span>
            </div>
          </div>

          {/* Destination Directory */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-1.5">
              Select Destination Folder
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={destinationFolder}
                onChange={(e) => setDestinationFolder(e.target.value)}
                placeholder="/Users/username/Projects or ~/Spark"
                disabled={isMoving}
                className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] focus:bg-[#16161a] focus:ring-1 focus:ring-emerald-500 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 outline-none font-mono transition"
              />
              <button
                type="button"
                onClick={handleSelectFolder}
                disabled={isMoving}
                className="px-3.5 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-xs text-white flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50 shrink-0"
              >
                <Folder className="w-3.5 h-3.5 text-emerald-400" />
                <span>Browse...</span>
              </button>
            </div>
          </div>

          {/* Calculated Preview */}
          {calculatedTargetPath && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
              <div className="flex items-center space-x-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Target Relocation Path</span>
              </div>
              <div className="font-mono text-[11px] break-all opacity-90 text-white/90">
                {calculatedTargetPath}
              </div>
            </div>
          )}

          <p className="text-[11px] text-white/40 leading-relaxed">
            Spark will move the entire folder on disk and update your local <code className="text-white/60">*.test</code> Nginx virtual host route automatically.
          </p>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={isMoving}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isMoving || !destinationFolder.trim()}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white transition active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              {isMoving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Moving Folder...</span>
                </>
              ) : (
                <>
                  <FolderInput className="w-3.5 h-3.5" />
                  <span>Move Site</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
