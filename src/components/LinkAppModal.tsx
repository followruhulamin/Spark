import React, { useState, useEffect } from 'react';
import { Folder, Link as LinkIcon, X, Check, Loader2 } from 'lucide-react';

interface LinkAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkApp: (path: string, customDomain?: string) => Promise<void>;
  defaultProjectPath?: string;
}

const suggestDomainFromPath = (path: string): string => {
  const folderName = path.replace(/\/+$/, '').split('/').filter(Boolean).pop() || '';
  if (!folderName) return '';
  const clean = folderName
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9.-]/g, '')
    .replace(/-+/g, '-')
    .replace(/\.+/g, '.')
    .replace(/^[-.]+|[-.]+$/g, '');

  if (!clean) return '';
  return clean.endsWith('.test') ? clean : `${clean}.test`;
};

export const LinkAppModal: React.FC<LinkAppModalProps> = ({
  isOpen,
  onClose,
  onLinkApp,
}) => {
  const [folderPath, setFolderPath] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [isCustomDomainManual, setIsCustomDomainManual] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form inputs whenever the modal is opened
  useEffect(() => {
    if (isOpen) {
      setFolderPath('');
      setCustomDomain('');
      setIsCustomDomainManual(false);
      setIsLinking(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectFolder = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const selected = await invoke<string | null>('pick_folder');
      if (selected && typeof selected === 'string') {
        setFolderPath(selected);
        const suggested = suggestDomainFromPath(selected);
        if (!isCustomDomainManual || !customDomain) {
          setCustomDomain(suggested);
        }
      }
    } catch (e) {
      console.error('Failed to open folder picker', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderPath.trim()) {
      setError('Please provide a folder path');
      return;
    }

    setIsLinking(true);
    setError(null);

    try {
      await onLinkApp(folderPath.trim(), customDomain.trim() || undefined);
      setIsLinking(false);
      onClose();
    } catch (err: any) {
      setError(err?.toString() || 'Failed to link app');
      setIsLinking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md p-5 rounded-xl bg-[#1e1e24] border border-white/[0.12] shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <LinkIcon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Link Existing Application</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/[0.08] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/75 mb-1.5">
              Project Directory Path
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={folderPath}
                onChange={(e) => {
                  const val = e.target.value;
                  setFolderPath(val);
                  if (!isCustomDomainManual) {
                    setCustomDomain(suggestDomainFromPath(val));
                  }
                }}
                placeholder="/Users/username/Spark/my-app"
                className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] focus:bg-[#16161a] focus:ring-1 focus:ring-blue-500 border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none font-mono"
              />
              <button
                type="button"
                onClick={handleSelectFolder}
                className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-xs text-white flex items-center space-x-1.5 transition active:scale-95"
              >
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>Browse</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/75 mb-1.5">
              Custom .test Domain Name (Optional)
            </label>
            <input
              type="text"
              value={customDomain}
              onChange={(e) => {
                setCustomDomain(e.target.value);
                setIsCustomDomainManual(true);
              }}
              placeholder="e.g. custom-app.test"
              className="w-full bg-white/[0.05] hover:bg-white/[0.08] focus:bg-[#16161a] focus:ring-1 focus:ring-blue-500 border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none font-mono"
            />
            <p className="mt-1 text-[11px] text-white/40">
              Auto-registers in Spark virtual hosts with zero configuration.
            </p>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={isLinking}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLinking || !folderPath.trim()}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white transition active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              {isLinking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Linking...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Link Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
