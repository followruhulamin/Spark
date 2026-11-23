import React, { useState, useEffect } from 'react';
import { RefreshCw, Save, Loader2, FileCode, Trash2, Download } from 'lucide-react';
import { confirm as tauriConfirm } from '@tauri-apps/plugin-dialog';
import { AppSettings, PhpIniSettings, PhpVersionInfo } from '../../types';

interface PhpTabProps {
  phpVersions: PhpVersionInfo[];
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => Promise<void>;
  onSetActiveVersion: (version: string) => Promise<string>;
  onGetPhpIni: (version: string) => Promise<PhpIniSettings>;
  onUpdatePhpIni: (version: string, newSettings: PhpIniSettings) => Promise<string>;
  onCheckPatchUpdates: (version: string) => Promise<string>;
  onInstallVersion?: (version: string) => Promise<string>;
  onUninstallVersion?: (version: string) => Promise<string>;
  onRefreshVersions?: () => Promise<void>;
}

export const PhpTab: React.FC<PhpTabProps> = ({
  phpVersions,
  settings,
  onUpdateSettings,
  onSetActiveVersion,
  onGetPhpIni,
  onUpdatePhpIni,
  onCheckPatchUpdates,
  onInstallVersion,
  onUninstallVersion,
  onRefreshVersions,
}) => {
  const [activeVersion, setActiveVersion] = useState(settings.active_php_version || '8.4');
  const [iniSettings, setIniSettings] = useState<PhpIniSettings>({
    memory_limit: '512M',
    upload_max_filesize: '128M',
    max_execution_time: '120',
    post_max_size: '128M',
    ini_path: '',
  });
  const [isSavingIni, setIsSavingIni] = useState(false);
  const [iniMessage, setIniMessage] = useState<string | null>(null);
  const [isIniError, setIsIniError] = useState(false);
  const [patchMessage, setPatchMessage] = useState<string | null>(null);
  const [isCheckingPatch, setIsCheckingPatch] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    loadIni(activeVersion);
  }, [activeVersion]);

  useEffect(() => {
    if (!settings.active_php_version && phpVersions.length > 0) {
      const active = phpVersions.find((v) => v.is_active)?.version ||
                     phpVersions.find((v) => v.is_installed)?.version ||
                     '8.4';
      setActiveVersion(active);
    }
  }, [phpVersions, settings.active_php_version]);

  const loadIni = async (ver: string) => {
    try {
      const data = await onGetPhpIni(ver);
      setIniSettings(data);
    } catch {
      // fallback
    }
  };

  const handleVersionSwitch = async (ver: string) => {
    setActiveVersion(ver);
    await onSetActiveVersion(ver);
    await onUpdateSettings({ ...settings, active_php_version: ver });
  };

  const handleRowClick = async (item: PhpVersionInfo) => {
    if (item.is_installed) {
      handleVersionSwitch(item.version);
    } else {
      let confirmed = false;
      try {
        confirmed = await tauriConfirm(
          `PHP ${item.version} is not currently installed.\nWould you like to install it now via Homebrew?`,
          {
            title: 'Install PHP Version',
            kind: 'info',
            okLabel: 'Install',
            cancelLabel: 'Cancel',
          }
        );
      } catch {
        confirmed = window.confirm(`PHP ${item.version} is not currently installed. Would you like to install it now?`);
      }
      if (confirmed) {
        await handleInstall(item.version);
      }
    }
  };

  const handleInstall = async (ver: string) => {
    if (!onInstallVersion) return;
    setLoadingAction(ver);
    setActionMessage(null);
    try {
      const res = await onInstallVersion(ver);
      setActionMessage(res);
      if (onRefreshVersions) await onRefreshVersions();
    } catch (err: any) {
      setActionMessage(err?.toString() || `Failed to install PHP ${ver}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUninstall = async (ver: string) => {
    if (!onUninstallVersion) return;
    let confirmed = false;
    try {
      confirmed = await tauriConfirm(
        `Are you sure you want to uninstall PHP ${ver}?\n(This will remove the runtime binaries from your Mac)`,
        {
          title: 'Uninstall PHP Version',
          kind: 'warning',
          okLabel: 'Uninstall',
          cancelLabel: 'Cancel',
        }
      );
    } catch {
      confirmed = window.confirm(`Are you sure you want to uninstall PHP ${ver}?`);
    }

    if (!confirmed) return;

    setLoadingAction(ver);
    setActionMessage(null);
    try {
      const res = await onUninstallVersion(ver);
      setActionMessage(res);
      if (onRefreshVersions) await onRefreshVersions();
    } catch (err: any) {
      setActionMessage(err?.toString() || `Failed to uninstall PHP ${ver}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggleAutoPatch = async () => {
    const updated = { ...settings, php_auto_patch: !settings.php_auto_patch };
    await onUpdateSettings(updated);
  };

  const handleSaveIni = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingIni(true);
    setIniMessage(null);
    setIsIniError(false);
    try {
      const res = await onUpdatePhpIni(activeVersion, iniSettings);
      setIniMessage(res);
      setIsIniError(false);
    } catch (err: any) {
      setIniMessage(err?.toString() || 'Failed to save php.ini');
      setIsIniError(true);
    } finally {
      setIsSavingIni(false);
    }
  };

  const handleCheckPatches = async () => {
    setIsCheckingPatch(true);
    setPatchMessage(null);
    try {
      const res = await onCheckPatchUpdates(activeVersion);
      setPatchMessage(res);
    } catch (err: any) {
      setPatchMessage(err?.toString() || 'Error checking updates');
    } finally {
      setIsCheckingPatch(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Available & Installed PHP Versions */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">PHP Versions</h4>
            <p className="text-xs text-white/50 mt-0.5">
              Select the active global CLI and default Web Server PHP-FPM pool version.
            </p>
          </div>
        </div>

        {actionMessage && (
          <div className="mb-3 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-300 flex items-center justify-between">
            <span>{actionMessage}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-white/40 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
        )}

        <div className="divide-y divide-white/[0.06] border border-white/[0.06] rounded-xl overflow-hidden bg-white/[0.02]">
          {phpVersions.map((item) => {
            const isCurrent = activeVersion.startsWith(item.version);
            const isActionLoading = loadingAction === item.version;
            return (
              <div
                key={item.version}
                onClick={() => handleRowClick(item)}
                className={`group flex items-center justify-between p-3 transition-all cursor-pointer select-none ${
                  isCurrent ? 'bg-blue-600/[0.12]' : 'hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1 mr-3">
                  <input
                    type="radio"
                    name="active_php"
                    checked={isCurrent}
                    onChange={() => handleVersionSwitch(item.version)}
                    onClick={(e) => e.stopPropagation()}
                    className="accent-blue-500 w-4 h-4 cursor-pointer shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-white font-mono">PHP {item.version}</span>
                      <span className="text-[10px] text-white/50 font-mono">({item.full_version})</span>
                      {isCurrent && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                          Active Global
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-white/40 font-mono mt-0.5 truncate">
                      {item.binary_path || 'Not installed in local runtimes'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                      item.is_installed
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-white/[0.05] text-white/40'
                    }`}
                  >
                    {item.is_installed ? 'Installed' : 'Available'}
                  </span>

                  {item.is_installed ? (
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleUninstall(item.version)}
                      className="px-2 py-1 text-[11px] font-medium text-red-400/90 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg flex items-center space-x-1 transition-all disabled:opacity-50"
                      title={`Uninstall PHP ${item.version}`}
                    >
                      {isActionLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin text-red-400" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      <span>Uninstall</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleInstall(item.version)}
                      className="px-2 py-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg flex items-center space-x-1 transition-all disabled:opacity-50"
                      title={`Install PHP ${item.version}`}
                    >
                      {isActionLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      <span>Install</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Auto-Patch / Bugfix Updater */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Auto-Patch & Security Updater</h4>
            <p className="text-xs text-white/50 mt-0.5">
              Automatically apply patch updates (e.g. 8.5.13 → 8.5.14) without breaking custom php.ini configurations.
            </p>
          </div>
          <button
            onClick={handleToggleAutoPatch}
            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 ease-in-out shrink-0 ${
              settings.php_auto_patch ? 'bg-blue-600 justify-end' : 'bg-white/20 justify-start'
            }`}
          >
            <span className="w-4 h-4 bg-white rounded-full shadow-md" />
          </button>
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={handleCheckPatches}
            disabled={isCheckingPatch}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-white border border-white/[0.08] transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingPatch ? 'animate-spin text-blue-400' : ''}`} />
            <span>Check for Patch Updates</span>
          </button>
          {patchMessage && <span className="text-xs text-emerald-400 font-mono">{patchMessage}</span>}
        </div>
      </div>

      {/* Configuration Quick-Edit (php.ini) */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <FileCode className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Active php.ini Quick Config (PHP {activeVersion})
            </h4>
          </div>
          {iniSettings.ini_path && (
            <span className="text-[10px] text-white/40 font-mono truncate max-w-xs" title={iniSettings.ini_path}>
              {iniSettings.ini_path}
            </span>
          )}
        </div>

        <form onSubmit={handleSaveIni} className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-white/60 mb-1">memory_limit</label>
              <input
                type="text"
                value={iniSettings.memory_limit}
                onChange={(e) => setIniSettings({ ...iniSettings, memory_limit: e.target.value })}
                className="w-full bg-white/[0.05] focus:bg-[#16161a] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-white/60 mb-1">upload_max_filesize</label>
              <input
                type="text"
                value={iniSettings.upload_max_filesize}
                onChange={(e) => setIniSettings({ ...iniSettings, upload_max_filesize: e.target.value })}
                className="w-full bg-white/[0.05] focus:bg-[#16161a] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-white/60 mb-1">post_max_size</label>
              <input
                type="text"
                value={iniSettings.post_max_size}
                onChange={(e) => setIniSettings({ ...iniSettings, post_max_size: e.target.value })}
                className="w-full bg-white/[0.05] focus:bg-[#16161a] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-white/60 mb-1">max_execution_time</label>
              <input
                type="text"
                value={iniSettings.max_execution_time}
                onChange={(e) => setIniSettings({ ...iniSettings, max_execution_time: e.target.value })}
                className="w-full bg-white/[0.05] focus:bg-[#16161a] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-white/40">Changes apply to CLI and local Web Server immediately</span>
            <div className="flex items-center space-x-3">
              {iniMessage && (
                <span className={`text-xs font-mono ${isIniError ? 'text-red-400' : 'text-emerald-400'}`}>
                  {iniMessage}
                </span>
              )}
              <button
                type="submit"
                disabled={isSavingIni}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50"
              >
                {isSavingIni ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save php.ini</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
