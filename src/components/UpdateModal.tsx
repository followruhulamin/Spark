import React, { useState } from 'react';
import { ArrowRight, Download, Loader2, Sparkles, X } from 'lucide-react';
import type { Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { SparkLogo } from './SparkLogo';

interface UpdateModalProps {
  update: Update;
  isOpen: boolean;
  onClose: () => void;
  appVersion: string;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  update,
  isOpen,
  onClose,
  appVersion,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadedBytes, setDownloadedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleInstallUpdate = async () => {
    setIsUpdating(true);
    setErrorMessage(null);
    setStatusMessage('Starting download...');
    setDownloadProgress(0);

    try {
      let totalLength = 0;
      let downloaded = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            totalLength = event.data.contentLength ?? 0;
            setTotalBytes(totalLength > 0 ? totalLength : null);
            setStatusMessage('Downloading release update...');
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            setDownloadedBytes(downloaded);
            if (totalLength > 0) {
              const pct = Math.min(100, Math.round((downloaded / totalLength) * 100));
              setDownloadProgress(pct);
            }
            break;
          case 'Finished':
            setDownloadProgress(100);
            setStatusMessage('Verifying signature & applying update...');
            break;
        }
      });

      setStatusMessage('Restarting Spark...');
      await relaunch();
    } catch (err: any) {
      console.error('[Spark Updater] Update installation failed:', err);
      setErrorMessage(err?.message || err?.toString() || 'Failed to download and install update.');
      setIsUpdating(false);
      setStatusMessage(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-md bg-[#18181e] border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col text-white animate-scale-in">
        {/* Header */}
        <div className="relative px-5 pt-5 pb-4 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-b from-white/[0.03] to-transparent">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <SparkLogo size={24} />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold text-white tracking-tight">Software Update Available</h3>
                <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>New</span>
                </span>
              </div>
              <p className="text-[11px] text-white/50">A new version of Spark is ready to install</p>
            </div>
          </div>

          {!isUpdating && (
            <button
              onClick={onClose}
              className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/[0.08] transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Version Comparison */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div>
              <div className="text-[11px] text-white/40 font-medium">CURRENT VERSION</div>
              <div className="text-xs font-mono font-semibold text-white/70">v{appVersion}</div>
            </div>

            <ArrowRight className="w-4 h-4 text-white/30" />

            <div className="text-right">
              <div className="text-[11px] text-blue-400 font-medium">LATEST RELEASE</div>
              <div className="text-xs font-mono font-bold text-blue-400">v{update.version}</div>
            </div>
          </div>

          {/* Release Notes */}
          {update.body && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-white/60">
                <span>Release Notes</span>
                {update.date && (
                  <span className="text-[10px] text-white/40">
                    {new Date(update.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>
              <div className="max-h-40 overflow-y-auto p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-white/80 whitespace-pre-wrap leading-relaxed font-sans">
                {update.body}
              </div>
            </div>
          )}

          {/* Progress / Status display */}
          {isUpdating && (
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-300 font-medium flex items-center space-x-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{statusMessage}</span>
                </span>
                {downloadProgress !== null && (
                  <span className="text-blue-400 font-mono font-semibold">{downloadProgress}%</span>
                )}
              </div>

              {downloadProgress !== null && (
                <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              )}

              {totalBytes !== null && totalBytes > 0 && (
                <div className="text-[10px] text-white/50 text-right font-mono">
                  {formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 space-y-1">
              <div className="font-semibold">Update Error</div>
              <div className="text-[11px] opacity-90">{errorMessage}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-white/[0.02] border-t border-white/[0.08] flex items-center justify-end space-x-2">
          {!isUpdating && (
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.06] transition"
            >
              Remind Me Later
            </button>
          )}

          <button
            onClick={handleInstallUpdate}
            disabled={isUpdating}
            className="flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition active:scale-95 disabled:opacity-50"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Update & Restart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
