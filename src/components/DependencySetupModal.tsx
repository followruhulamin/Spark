import React, { useState } from 'react';
import { SparkLogo } from './SparkLogo';
import {
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Terminal,
  ShieldCheck,
  Server,
  Globe,
  FileCode,
  Layers,
  ArrowRight,
  Package,
  X,
} from 'lucide-react';
import { DependencyItem, ScaffoldLogEvent } from '../types';
import { formatDependencyVersion } from './Settings/DependenciesTab';

interface DependencySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  dependencies: DependencyItem[];
  onInstallDependency: (id: string) => Promise<string>;
  onInstallAllMissing: () => Promise<string>;
  onRefreshDependencies: () => Promise<void>;
  logs: ScaffoldLogEvent[];
  isInstalling: boolean;
  activeInstallingId: string | null;
}

export const DependencySetupModal: React.FC<DependencySetupModalProps> = ({
  isOpen,
  onClose,
  dependencies,
  onInstallDependency,
  onInstallAllMissing,
  onRefreshDependencies,
  logs,
  isInstalling,
  activeInstallingId,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const brew = dependencies.find((d) => d.id === 'brew');
  const brewInstalled = brew?.is_installed ?? false;

  const requiredDeps = dependencies.filter((d) => d.is_required && d.id !== 'brew');
  const missingRequired = dependencies.filter((d) => d.is_required && !d.is_installed);
  const allReady = missingRequired.length === 0;

  const handleInstallBrew = async () => {
    setErrorMessage(null);
    try {
      await onInstallDependency('brew');
      await onRefreshDependencies();
    } catch (e: any) {
      setErrorMessage(e?.toString() || 'Failed to install Homebrew');
    }
  };

  const handleInstallSingle = async (id: string) => {
    setErrorMessage(null);
    try {
      await onInstallDependency(id);
      await onRefreshDependencies();
    } catch (e: any) {
      setErrorMessage(e?.toString() || `Failed to install ${id}`);
    }
  };

  const handleInstallAll = async () => {
    setErrorMessage(null);
    try {
      await onInstallAllMissing();
      await onRefreshDependencies();
    } catch (e: any) {
      setErrorMessage(e?.toString() || 'Failed to install all dependencies');
    }
  };

  const getDepIcon = (id: string) => {
    switch (id) {
      case 'nginx':
        return <Server className="w-4 h-4 text-emerald-400" />;
      case 'dnsmasq':
      case 'dns_resolver':
        return <Globe className="w-4 h-4 text-blue-400" />;
      case 'root_ca':
        return <ShieldCheck className="w-4 h-4 text-cyan-400" />;
      case 'php84':
      case 'php85':
      case 'composer':
        return <FileCode className="w-4 h-4 text-purple-400" />;
      case 'node22':
      case 'node24':
        return <Layers className="w-4 h-4 text-amber-400" />;
      default:
        return <Package className="w-4 h-4 text-white/60" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-[#1a1a20] border border-white/[0.12] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <SparkLogo size={16} showDot={false} />
            <span>Spark First-Time Setup</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Configure Your Local Development Environment
          </h2>
          <p className="text-xs text-white/50 mt-1 max-w-lg">
            Spark automatically manages native Nginx, local DNS routing, SSL certificates, PHP engines, and Node runtimes without Docker.
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Step 1: Homebrew Check */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-white">Homebrew Package Manager</span>
                  <span className="text-[10px] font-mono text-white/50">
                    ({brew?.version || 'brew'})
                  </span>
                </div>
                <div className="text-[11px] text-white/50 mt-0.5">
                  Required to install and manage native PHP, Nginx, and DNS daemons on macOS.
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {brewInstalled ? (
                <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Installed</span>
                </span>
              ) : (
                <button
                  onClick={handleInstallBrew}
                  disabled={isInstalling}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50"
                >
                  {isInstalling && activeInstallingId === 'brew' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Install Homebrew</span>
                </button>
              )}
            </div>
          </div>

          {/* Step 2: Essential Dependencies List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Essential Spark Dependencies
              </h4>
              <span className="text-[11px] font-mono text-white/40">
                {requiredDeps.filter((d) => d.is_installed).length} of {requiredDeps.length} Ready
              </span>
            </div>

            <div className="divide-y divide-white/[0.06] border border-white/[0.06] rounded-xl overflow-hidden bg-white/[0.02]">
              {requiredDeps.map((dep) => {
                const isThisInstalling = activeInstallingId === dep.id;
                return (
                  <div
                    key={dep.id}
                    className="flex items-center justify-between p-3 hover:bg-white/[0.03] transition"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] shrink-0">
                        {getDepIcon(dep.id)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-white">{dep.name}</span>
                          <span className="text-[10px] font-mono text-white/40">({formatDependencyVersion(dep.version)})</span>
                        </div>
                        <div className="text-[11px] text-white/50 truncate mt-0.5">
                          {dep.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 ml-3">
                      {dep.is_installed ? (
                        <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Installed</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleInstallSingle(dep.id)}
                          disabled={isInstalling || !brewInstalled}
                          className="flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20 transition active:scale-95 disabled:opacity-50"
                        >
                          {isThisInstalling ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
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

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Installation Logs */}
          {(isInstalling || logs.length > 0) && (
            <div className="p-3.5 rounded-xl bg-[#0e0e12] border border-white/[0.08] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-white/70">
                <span className="flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  <span>Setup Progress</span>
                </span>
                {isInstalling && (
                  <span className="text-blue-400 flex items-center space-x-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Configuring...</span>
                  </span>
                )}
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 font-mono text-[10px] text-white/50 pt-1">
                {logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start space-x-1.5 ${
                      log.is_error ? 'text-red-400' : log.is_done ? 'text-emerald-400' : 'text-white/60'
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

        {/* Footer Actions */}
        <div className="p-5 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
          <div className="text-xs text-white/40">
            {allReady ? (
              <span className="text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>All essential components ready!</span>
              </span>
            ) : (
              <span>{missingRequired.length} essential setup steps remaining</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!allReady ? (
              <button
                onClick={handleInstallAll}
                disabled={isInstalling || !brewInstalled}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition active:scale-95 disabled:opacity-50"
              >
                {isInstalling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Install All Essential Dependencies</span>
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-500/25 transition active:scale-95"
              >
                <span>Continue to Spark</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
