import React, { useState } from 'react';
import {
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Terminal,
  Server,
  Globe,
  FileCode,
  Layers,
  Database,
  ShieldCheck,
  Package,
  Trash2,
} from 'lucide-react';
import { confirm as tauriConfirm } from '@tauri-apps/plugin-dialog';
import { DependencyItem, ScaffoldLogEvent } from '../../types';

interface DependenciesTabProps {
  dependencies: DependencyItem[];
  onRefresh: () => Promise<void>;
  onInstallDependency: (id: string) => Promise<string>;
  onUninstallDependency?: (id: string) => Promise<string>;
  onInstallAllMissing: () => Promise<string>;
  logs: ScaffoldLogEvent[];
  isInstalling: boolean;
  activeInstallingId: string | null;
}

export const formatDependencyVersion = (rawVersion?: string): string => {
  if (!rawVersion) return '';
  const v = rawVersion.trim();

  // If already clean or a status message
  if (
    v === 'Not installed' ||
    v === 'Not configured' ||
    v === 'Needs Setup' ||
    v === 'Trusted in Keychain' ||
    v === 'Not Trusted' ||
    v.includes('127.0.0.1')
  ) {
    return v;
  }

  // Handle nginx version: nginx/1.31.9
  const nginxMatch = v.match(/nginx\/([\d.]+)/i);
  if (nginxMatch) return `v${nginxMatch[1]}`;

  // Handle Dnsmasq version 2.93 ...
  const dnsmasqMatch = v.match(/version\s+([\d.]+)/i);
  if (v.toLowerCase().startsWith('dnsmasq') && dnsmasqMatch) return `v${dnsmasqMatch[1]}`;

  // Handle PHP 8.4.28 ...
  const phpMatch = v.match(/PHP\s+([\d.]+[a-zA-Z0-9_\-.]*)/i);
  if (phpMatch) return `v${phpMatch[1]}`;

  // Handle Composer version 2.8.6 ...
  const compMatch = v.match(/Composer\s+version\s+([\d.]+)/i);
  if (compMatch) return `v${compMatch[1]}`;

  // Handle Homebrew 4.4.19
  const brewMatch = v.match(/Homebrew\s+([\d.]+)/i);
  if (brewMatch) return `v${brewMatch[1]}`;

  // Handle MySQL Ver 9.2.0 ...
  const mysqlMatch = v.match(/Ver\s+([\d.]+)/i);
  if (mysqlMatch) return `v${mysqlMatch[1]}`;

  // If it's already a clean semver like "8.4.28" or "8.5.x"
  if (/^v?[\d]+(\.[\dx]+)+/i.test(v)) {
    return v.startsWith('v') ? v : `v${v}`;
  }

  return v;
};

export const DependenciesTab: React.FC<DependenciesTabProps> = ({
  dependencies,
  onRefresh,
  onInstallDependency,
  onUninstallDependency,
  onInstallAllMissing,
  logs,
  isInstalling,
  activeInstallingId,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'core' | 'php' | 'node' | 'db'>('all');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const missingRequiredCount = dependencies.filter((d) => d.is_required && !d.is_installed).length;
  const missingTotalCount = dependencies.filter((d) => !d.is_installed).length;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'web_server':
        return <Server className="w-4 h-4 text-emerald-400" />;
      case 'dns':
        return <Globe className="w-4 h-4 text-blue-400" />;
      case 'security':
        return <ShieldCheck className="w-4 h-4 text-cyan-400" />;
      case 'php':
        return <FileCode className="w-4 h-4 text-purple-400" />;
      case 'javascript':
        return <Layers className="w-4 h-4 text-amber-400" />;
      case 'database':
        return <Database className="w-4 h-4 text-orange-400" />;
      case 'package_manager':
        return <Terminal className="w-4 h-4 text-indigo-400" />;
      default:
        return <Package className="w-4 h-4 text-white/60" />;
    }
  };

  const filteredList = dependencies.filter((dep) => {
    if (selectedFilter === 'core') {
      return ['package_manager', 'web_server', 'dns', 'security'].includes(dep.category);
    }
    if (selectedFilter === 'php') {
      return dep.category === 'php';
    }
    if (selectedFilter === 'node') {
      return dep.category === 'javascript';
    }
    if (selectedFilter === 'db') {
      return dep.category === 'database';
    }
    return true;
  });

  const handleInstallOne = async (id: string) => {
    setActionMessage(null);
    try {
      const res = await onInstallDependency(id);
      setActionMessage(res);
      await onRefresh();
    } catch (err: any) {
      setActionMessage(err?.toString() || 'Installation failed');
    }
  };

  const handleInstallAll = async () => {
    setActionMessage(null);
    try {
      const res = await onInstallAllMissing();
      setActionMessage(res);
      await onRefresh();
    } catch (err: any) {
      setActionMessage(err?.toString() || 'Batch install failed');
    }
  };

  const handleUninstallOne = async (dep: DependencyItem) => {
    if (!onUninstallDependency) return;
    let confirmed = false;
    try {
      confirmed = await tauriConfirm(
        `Are you sure you want to uninstall ${dep.name}?\n${
          dep.is_required
            ? '\n⚠️ CAUTION: This is an essential component. Uninstalling it may disrupt local sites and web servers.'
            : '\nThis will stop its background services and remove runtime binaries.'
        }`,
        {
          title: `Uninstall ${dep.name}`,
          kind: 'warning',
          okLabel: 'Uninstall',
          cancelLabel: 'Cancel',
        }
      );
    } catch {
      confirmed = window.confirm(`Are you sure you want to uninstall ${dep.name}?`);
    }

    if (!confirmed) return;

    setActionMessage(null);
    try {
      const res = await onUninstallDependency(dep.id);
      setActionMessage(res);
      await onRefresh();
    } catch (err: any) {
      setActionMessage(err?.toString() || `Uninstallation of ${dep.name} failed`);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/20 via-purple-900/10 to-transparent border border-white/[0.08] flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Dependencies
            </h4>
            {missingRequiredCount > 0 ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {missingRequiredCount} Required Missing
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                All Essentials Ready
              </span>
            )}
          </div>
          <p className="text-xs text-white/50 mt-1">
            Manage system package managers, PHP engines, Node.js runtimes, Nginx web server, and local DNS.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={onRefresh}
            disabled={isInstalling}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] transition active:scale-95 disabled:opacity-50"
            title="Re-scan system dependencies"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isInstalling ? 'animate-spin' : ''}`} />
            <span>Check Status</span>
          </button>

          {missingTotalCount > 0 && (
            <button
              onClick={handleInstallAll}
              disabled={isInstalling}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50"
            >
              {isInstalling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Install Missing ({missingTotalCount})</span>
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-300">
          {actionMessage}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1.5 border-b border-white/[0.08] pb-2 text-xs">
        {[
          { id: 'all' as const, label: 'All Items' },
          { id: 'core' as const, label: 'Core Infrastructure' },
          { id: 'php' as const, label: 'PHP & Composer' },
          { id: 'node' as const, label: 'JavaScript (Node)' },
          { id: 'db' as const, label: 'Database' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              selectedFilter === tab.id
                ? 'bg-white/[0.1] text-white'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dependencies List */}
      <div className="divide-y divide-white/[0.06] border border-white/[0.06] rounded-xl overflow-hidden bg-white/[0.02]">
        {filteredList.map((dep) => {
          const isThisInstalling = activeInstallingId === dep.id || (isInstalling && activeInstallingId === null);
          return (
            <div
              key={dep.id}
              className="flex items-center justify-between p-3.5 hover:bg-white/[0.03] transition"
            >
              <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] shrink-0">
                  {getCategoryIcon(dep.category)}
                </div>

                <div className="min-w-0 flex-1">
                  {/* Line 1: Name only (plus essential badge if required) */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-white">{dep.name}</span>
                    {dep.is_required && (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
                        Essential
                      </span>
                    )}
                  </div>

                  {/* Line 2: Version only */}
                  {dep.version && (
                    <div className="text-[11px] font-mono text-white/50 mt-0.5 truncate">
                      {formatDependencyVersion(dep.version)}
                    </div>
                  )}

                  {/* Line 3: Location (Binary path) */}
                  {dep.binary_path && (
                    <div className="text-[10px] text-white/30 font-mono mt-0.5 truncate">
                      {dep.binary_path}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0 ml-4">
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                    dep.is_installed
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-white/[0.05] text-white/40 border border-white/[0.06]'
                  }`}
                >
                  {dep.is_installed ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{dep.status}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-400/80">{dep.status}</span>
                    </>
                  )}
                </span>

                <button
                  onClick={() => handleInstallOne(dep.id)}
                  disabled={isInstalling}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 disabled:opacity-50 ${
                    dep.is_installed
                      ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white border border-white/[0.06]'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20'
                  }`}
                >
                  {isThisInstalling ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>{dep.is_installed ? 'Update / Reinstall' : 'Install'}</span>
                </button>

                {dep.is_installed && dep.id !== 'brew' && (
                  <button
                    onClick={() => handleUninstallOne(dep)}
                    disabled={isInstalling}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400/90 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition active:scale-95 disabled:opacity-50"
                    title={`Uninstall ${dep.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Uninstall</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Installer Logs Terminal (Shown during/after installation) */}
      {(isInstalling || logs.length > 0) && (
        <div className="p-4 rounded-xl bg-[#0e0e12] border border-white/[0.1] space-y-2">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-mono text-white/80 font-medium">Installation Log Stream</span>
            </div>
            {isInstalling && (
              <span className="text-[10px] font-mono text-blue-400 flex items-center space-x-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Working...</span>
              </span>
            )}
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 font-mono text-[11px] text-white/60 pt-1">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={`flex items-start space-x-2 ${
                  log.is_error ? 'text-red-400' : log.is_done ? 'text-emerald-400' : 'text-white/70'
                }`}
              >
                <span className="text-white/30 shrink-0">[{log.step}]</span>
                <span className="break-all">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
