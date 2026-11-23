import React, { useState, useEffect } from 'react';
import { GitBranch, X, Check, Loader2 } from 'lucide-react';

interface CloneRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloneRepo: (repoUrl: string, targetName: string) => Promise<void>;
}

export const CloneRepoModal: React.FC<CloneRepoModalProps> = ({
  isOpen,
  onClose,
  onCloneRepo,
}) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [appName, setAppName] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset inputs whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setRepoUrl('');
      setAppName('');
      setIsCloning(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUrlChange = (val: string) => {
    setRepoUrl(val);
    if (!appName) {
      // Auto-extract repo name from url: https://github.com/org/my-project.git -> my-project
      const cleaned = val.replace(/\.git$/, '');
      const parts = cleaned.split(/[/:]/);
      const last = parts.pop();
      if (last) {
        setAppName(last);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) {
      setError('Please provide a Git repository URL');
      return;
    }
    if (!appName.trim()) {
      setError('Please provide an application name');
      return;
    }

    setIsCloning(true);
    setError(null);

    try {
      await onCloneRepo(repoUrl.trim(), appName.trim());
      setIsCloning(false);
      onClose();
    } catch (err: any) {
      setError(err?.toString() || 'Failed to clone repository');
      setIsCloning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md p-5 rounded-xl bg-[#1e1e24] border border-white/[0.12] shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <GitBranch className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Clone Git Repository</h3>
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
              Repository URL (HTTPS or SSH)
            </label>
            <input
              type="text"
              autoFocus
              value={repoUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="e.g. git@github.com:laravel/laravel.git"
              className="w-full bg-white/[0.05] hover:bg-white/[0.08] focus:bg-[#16161a] focus:ring-1 focus:ring-blue-500 border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/75 mb-1.5">
              Target Folder & App Name
            </label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="e.g. my-laravel-app"
              className="w-full bg-white/[0.05] hover:bg-white/[0.08] focus:bg-[#16161a] focus:ring-1 focus:ring-blue-500 border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none font-sans"
            />
            {appName && (
              <p className="mt-1 text-[11px] text-white/40">
                Will be served at <span className="text-blue-400 font-mono">{appName.toLowerCase()}.test</span>
              </p>
            )}
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={isCloning}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCloning || !repoUrl.trim() || !appName.trim()}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white transition active:scale-95 shadow-lg shadow-indigo-500/20"
            >
              {isCloning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Cloning...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Clone & Link</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
