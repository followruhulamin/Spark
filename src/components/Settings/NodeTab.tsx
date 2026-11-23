import React, { useState } from 'react';
import { Package, Trash2, Download, Loader2 } from 'lucide-react';
import { confirm as tauriConfirm } from '@tauri-apps/plugin-dialog';
import { AppSettings, NodeVersionInfo, PackageManagersState } from '../../types';

interface NodeTabProps {
  nodeVersions: NodeVersionInfo[];
  settings: AppSettings;
  packageManagers: PackageManagersState;
  onUpdateSettings: (newSettings: AppSettings) => Promise<void>;
  onSetActiveVersion: (version: string) => Promise<string>;
  onTogglePackageManager: (manager: string, enable: boolean) => Promise<string>;
  onInstallVersion?: (version: string) => Promise<string>;
  onUninstallVersion?: (version: string) => Promise<string>;
  onRefreshVersions?: () => Promise<void>;
}

export const NodeTab: React.FC<NodeTabProps> = ({
  nodeVersions,
  settings,
  packageManagers,
  onUpdateSettings,
  onSetActiveVersion,
  onTogglePackageManager,
  onInstallVersion,
  onUninstallVersion,
  onRefreshVersions,
}) => {
  const getDefaultVersion = () => {
    if (settings.active_node_version) {
      return settings.active_node_version;
    }
    const active = nodeVersions.find((v) => v.is_active);
    if (active) return active.version;
    const installed = nodeVersions.find((v) => v.is_installed);
    if (installed) return installed.version;
    return nodeVersions[0]?.version || 'v24.x (Current)';
  };

  const [activeVersion, setActiveVersion] = useState<string>(getDefaultVersion());
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (settings.active_node_version) {
      setActiveVersion(settings.active_node_version);
    } else if (nodeVersions.length > 0) {
      const best = nodeVersions.find((v) => v.is_active)?.version ||
                   nodeVersions.find((v) => v.is_installed)?.version ||
                   nodeVersions[0]?.version;
      if (best) {
        setActiveVersion(best);
        onSetActiveVersion(best);
        onUpdateSettings({ ...settings, active_node_version: best });
      }
    }
  }, [nodeVersions, settings.active_node_version]);

  const handleVersionSwitch = async (ver: string) => {
    setActiveVersion(ver);
    await onSetActiveVersion(ver);
    await onUpdateSettings({ ...settings, active_node_version: ver });
  };

  const handleRowClick = async (item: NodeVersionInfo) => {
    if (item.is_installed) {
      handleVersionSwitch(item.version);
    } else {
      let confirmed = false;
      try {
        confirmed = await tauriConfirm(
          `Node.js ${item.version} is not currently installed.\nWould you like to install it now via Homebrew?`,
          {
            title: 'Install Node.js Runtime',
            kind: 'info',
            okLabel: 'Install',
            cancelLabel: 'Cancel',
          }
        );
      } catch {
        confirmed = window.confirm(`Node.js ${item.version} is not currently installed. Would you like to install it now?`);
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
      setActionMessage(err?.toString() || `Failed to install Node.js ${ver}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUninstall = async (ver: string) => {
    if (!onUninstallVersion) return;
    let confirmed = false;
    try {
      confirmed = await tauriConfirm(
        `Are you sure you want to uninstall Node.js ${ver}?\n(This will remove the runtime binaries from your Mac)`,
        {
          title: 'Uninstall Node.js Runtime',
          kind: 'warning',
          okLabel: 'Uninstall',
          cancelLabel: 'Cancel',
        }
      );
    } catch {
      confirmed = window.confirm(`Are you sure you want to uninstall Node.js ${ver}?`);
    }

    if (!confirmed) return;

    setLoadingAction(ver);
    setActionMessage(null);
    try {
      const res = await onUninstallVersion(ver);
      setActionMessage(res);
      if (onRefreshVersions) await onRefreshVersions();
    } catch (err: any) {
      setActionMessage(err?.toString() || `Failed to uninstall Node.js ${ver}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePmToggle = async (manager: 'npm' | 'pnpm' | 'yarn', currentState: boolean) => {
    setToggleLoading(manager);
    setStatusMessage(null);
    try {
      const res = await onTogglePackageManager(manager, !currentState);
      setStatusMessage(res);
    } catch (err: any) {
      setStatusMessage(err?.toString() || 'Failed to toggle package manager');
    } finally {
      setToggleLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Node.js Version Manager */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Node.js Version Manager</h4>
            <p className="text-xs text-white/50 mt-0.5">
              Manage installed Node.js versions and switch active CLI runtime.
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
          {nodeVersions.map((item) => {
            const isCurrent =
              activeVersion === item.version ||
              item.version.toLowerCase().startsWith(activeVersion.toLowerCase()) ||
              activeVersion.toLowerCase().startsWith(item.version.toLowerCase().split(' ')[0]);
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
                    name="active_node"
                    checked={isCurrent}
                    onChange={() => handleVersionSwitch(item.version)}
                    onClick={(e) => e.stopPropagation()}
                    className="accent-blue-500 w-4 h-4 cursor-pointer shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-white font-mono">{item.version}</span>
                      <span className="text-[10px] text-white/50 font-mono">({item.full_version})</span>
                      {isCurrent && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                          Active Global
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-white/40 font-mono mt-0.5 truncate">
                      {item.binary_path || 'Node.js Runtime'}
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
                      title={`Uninstall Node.js ${item.version}`}
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
                      title={`Install Node.js ${item.version}`}
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

      {/* Package Manager Toggles */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider">JavaScript Package Managers</h4>
          <p className="text-xs text-white/50 mt-0.5">
            Quick status and Corepack toggles for npm, pnpm, and yarn.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* npm */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white font-mono">npm</div>
                <div className="text-[10px] text-white/40 font-mono">
                  {packageManagers.npm ? 'Enabled (Default)' : 'Disabled'}
                </div>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          </div>

          {/* pnpm */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white font-mono">pnpm</div>
                <div className="text-[10px] text-white/40 font-mono">
                  {packageManagers.pnpm ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            </div>
            <button
              onClick={() => handlePmToggle('pnpm', packageManagers.pnpm)}
              disabled={toggleLoading === 'pnpm'}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition duration-200 ease-in-out ${
                packageManagers.pnpm ? 'bg-blue-600 justify-end' : 'bg-white/20 justify-start'
              }`}
            >
              <span className="w-3.5 h-3.5 bg-white rounded-full shadow-md" />
            </button>
          </div>

          {/* yarn */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white font-mono">yarn</div>
                <div className="text-[10px] text-white/40 font-mono">
                  {packageManagers.yarn ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            </div>
            <button
              onClick={() => handlePmToggle('yarn', packageManagers.yarn)}
              disabled={toggleLoading === 'yarn'}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition duration-200 ease-in-out ${
                packageManagers.yarn ? 'bg-blue-600 justify-end' : 'bg-white/20 justify-start'
              }`}
            >
              <span className="w-3.5 h-3.5 bg-white rounded-full shadow-md" />
            </button>
          </div>
        </div>

        {statusMessage && <div className="text-xs text-blue-400 font-mono">{statusMessage}</div>}
      </div>
    </div>
  );
};
