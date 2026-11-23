import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Download,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import type { Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { invoke } from '@tauri-apps/api/core';
import { AppSettings, UpdateFrequency } from '../../types';
import { SparkLogo } from '../SparkLogo';

interface UpdatesTabProps {
  appVersion: string;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => Promise<void>;
  onCheckForUpdates: () => void;
  isCheckingUpdate: boolean;
  updateStatusText: string | null;
  availableUpdate: Update | null;
}

export const UpdatesTab: React.FC<UpdatesTabProps> = ({
  appVersion,
  settings,
  onUpdateSettings,
  onCheckForUpdates,
  isCheckingUpdate,
  updateStatusText,
  availableUpdate,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadedBytes, setDownloadedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatLastChecked = (isoStr?: string | null) => {
    if (!isoStr) return 'Never checked';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return 'Never checked';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  const handleToggle = async (key: keyof AppSettings) => {
    if (key === 'auto_check_updates') {
      const willBeEnabled = settings.auto_check_updates === false || settings.update_check_frequency === 'never';
      const updated: AppSettings = {
        ...settings,
        auto_check_updates: willBeEnabled,
        update_check_frequency: willBeEnabled
          ? (settings.update_check_frequency === 'never' ? 'daily' : (settings.update_check_frequency || 'daily'))
          : 'never',
      };
      await onUpdateSettings(updated);
      return;
    }
    const updated = { ...settings, [key]: !settings[key] };
    await onUpdateSettings(updated);
  };

  const handleFrequencyChange = async (freq: UpdateFrequency) => {
    if (freq === 'never') {
      await onUpdateSettings({
        ...settings,
        auto_check_updates: false,
        update_check_frequency: 'never',
      });
    } else {
      await onUpdateSettings({
        ...settings,
        auto_check_updates: true,
        update_check_frequency: freq,
      });
    }
  };

  const handleInstallUpdate = async () => {
    if (!availableUpdate) return;
    setIsUpdating(true);
    setErrorMessage(null);
    setStatusMessage('Connecting to GitHub release download...');
    setDownloadProgress(0);

    try {
      let totalLength = 0;
      let downloaded = 0;

      await availableUpdate.downloadAndInstall((event) => {
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
            setStatusMessage('Verifying cryptographic signature & applying...');
            break;
        }
      });

      setStatusMessage('Restarting Spark to complete update...');
      await relaunch();
    } catch (err: any) {
      console.error('[Spark Updater] Update installation failed:', err);
      setErrorMessage(err?.message || err?.toString() || 'Failed to download and install update.');
      setIsUpdating(false);
      setStatusMessage(null);
    }
  };

  const handleManualDownload = async () => {
    if (!availableUpdate) return;
    const downloadUrl = `https://github.com/followruhulamin/Spark/releases/download/v${availableUpdate.version}/Spark_v${availableUpdate.version}.zip`;
    try {
      await invoke('open_in_browser', { url: downloadUrl });
    } catch {
      window.open(downloadUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-white flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>Software Update</span>
        </h3>
        <p className="text-xs text-white/50 mt-1">
          Keep Spark up to date with the latest runtime switches, security patches, and performance optimizations.
        </p>
      </div>

      {/* Main Status & Action Card */}
      <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-4">
        {availableUpdate ? (
          /* State A: Update Available */
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/20">
                  <SparkLogo size={24} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-white">Spark v{availableUpdate.version}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      New Release
                    </span>
                  </div>
                  <div className="text-xs text-white/50 mt-0.5">
                    Currently installed: v{appVersion}
                  </div>
                </div>
              </div>

              {!isUpdating && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleManualDownload}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] transition active:scale-95"
                    title="Download the .zip release directly from GitHub"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Download Manually (.zip)</span>
                  </button>

                  <button
                    onClick={handleInstallUpdate}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 transition active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download & Restart</span>
                  </button>
                </div>
              )}
            </div>

            {/* Release notes summary if available */}
            {availableUpdate.body && (
              <div className="p-3.5 rounded-lg bg-black/40 border border-white/[0.06] text-xs text-white/80 space-y-1.5 max-h-48 overflow-y-auto font-sans">
                <div className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">What's New:</div>
                <div className="whitespace-pre-wrap leading-relaxed text-white/70">
                  {availableUpdate.body}
                </div>
              </div>
            )}

            {/* Live Progress Bar when updating */}
            {isUpdating && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-medium flex items-center space-x-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    <span>{statusMessage || 'Updating Spark...'}</span>
                  </span>
                  <span className="font-mono text-white/50">
                    {downloadProgress !== null ? `${downloadProgress}%` : ''}
                    {totalBytes ? ` (${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)})` : ''}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${downloadProgress ?? 0}%` }}
                  />
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs space-y-2">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  onClick={handleManualDownload}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 text-[11px] font-medium transition"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Spark_v{availableUpdate.version}.zip manually</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* State B: Up to Date, Checking, Error, or GitHub Release */
          (() => {
            const isError = Boolean(
              updateStatusText && /could not reach|error|failed|unable/i.test(updateStatusText)
            );
            const isGitHubUpdateOnly = Boolean(
              updateStatusText && /available on github/i.test(updateStatusText)
            );

            return (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  {isError ? (
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                  ) : isGitHubUpdateOnly ? (
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-white">
                        {isError
                          ? 'Unable to Check for Updates'
                          : isGitHubUpdateOnly
                          ? 'New Spark Release Available'
                          : isCheckingUpdate
                          ? 'Checking for Updates...'
                          : 'Spark is up to date'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/[0.06] text-white/60 border border-white/[0.08]">
                        v{appVersion}
                      </span>
                    </div>
                    <div className={`text-xs mt-0.5 ${isError ? 'text-amber-400/80' : 'text-white/50'}`}>
                      {updateStatusText || `Last checked: ${formatLastChecked(settings.last_update_check)}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {isGitHubUpdateOnly && (
                    <a
                      href="https://github.com/followruhulamin/Spark/releases/latest"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition active:scale-95"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Release</span>
                    </a>
                  )}
                  <button
                    onClick={onCheckForUpdates}
                    disabled={isCheckingUpdate}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] transition active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin text-blue-400' : ''}`} />
                    <span>{isCheckingUpdate ? 'Checking...' : 'Check for Updates'}</span>
                  </button>
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* Automatic Update Preferences Card */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-4">
        <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
          <Calendar className="w-3.5 h-3.5 text-white/50" />
          <span>Automatic Update Preferences</span>
        </h4>

        {/* Toggle: Automatically Check */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-white">Automatically Check for Updates</div>
            <div className="text-[11px] text-white/50">Periodically query GitHub releases for new Spark versions</div>
          </div>
          <button
            onClick={() => handleToggle('auto_check_updates')}
            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 ease-in-out ${
              settings.auto_check_updates !== false && settings.update_check_frequency !== 'never'
                ? 'bg-blue-600 justify-end'
                : 'bg-white/20 justify-start'
            }`}
          >
            <span className="w-4 h-4 bg-white rounded-full shadow-md" />
          </button>
        </div>

        {/* Dropdown: Frequency */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-xs font-medium text-white">Check Frequency</div>
            <div className="text-[11px] text-white/50">Choose how often Spark automatically checks for releases</div>
          </div>
          <select
            value={settings.auto_check_updates === false ? 'never' : (settings.update_check_frequency || 'daily')}
            onChange={(e) => handleFrequencyChange(e.target.value as UpdateFrequency)}
            className="bg-[#1e1e24] hover:bg-[#25252d] text-xs font-medium text-white border border-white/[0.1] rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 transition cursor-pointer"
          >
            <option value="daily">Every Day</option>
            <option value="weekly">Every Week</option>
            <option value="monthly">Every Month</option>
            <option value="never">Never (Turn off auto-check)</option>
          </select>
        </div>

        {/* Toggle: Update App Automatically */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-xs font-medium text-white">Update App Automatically</div>
            <div className="text-[11px] text-white/50">Download and apply stable background updates automatically</div>
          </div>
          <button
            onClick={() => handleToggle('auto_update')}
            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 ease-in-out ${
              settings.auto_update ? 'bg-blue-600 justify-end' : 'bg-white/20 justify-start'
            }`}
          >
            <span className="w-4 h-4 bg-white rounded-full shadow-md" />
          </button>
        </div>
      </div>

      {/* Security & GitHub Release Links */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs text-white/50">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>All updates are cryptographically signed with Minisign verification.</span>
        </div>
        <a
          href="https://github.com/followruhulamin/Spark/releases"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition"
        >
          <span>View GitHub Releases</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
