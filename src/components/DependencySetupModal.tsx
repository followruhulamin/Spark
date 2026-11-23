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
  KeyRound,
  Zap,
  Folder,
  Code,
  Check,
} from 'lucide-react';
import { AppSettings, DependencyItem, ScaffoldLogEvent, SupportedIde } from '../types';
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
  settings?: AppSettings;
  onUpdateSettings?: (newSettings: AppSettings) => Promise<void>;
  onRunInitialSetup?: (opts: { enableSudo: boolean; defaultIde: SupportedIde }) => Promise<string>;
  onSetupRootCa?: () => Promise<string>;
  onSetupDns?: () => Promise<string>;
  onEnablePasswordlessSudo?: () => Promise<string>;
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
  settings,
  onUpdateSettings,
  onRunInitialSetup,
  onSetupRootCa,
  onSetupDns,
  onEnablePasswordlessSudo,
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'details'>('quick');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enableSudo, setEnableSudo] = useState<boolean>(true);
  const [selectedIde, setSelectedIde] = useState<SupportedIde>(settings?.default_ide || 'antigravity');
  const [isAutoSettingUp, setIsAutoSettingUp] = useState<boolean>(false);
  const [setupSuccess, setSetupSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const brew = dependencies.find((d) => d.id === 'brew');
  const brewInstalled = brew?.is_installed ?? false;

  const rootCaDep = dependencies.find((d) => d.id === 'root_ca');
  const rootCaReady = settings?.root_ca_installed || (rootCaDep?.is_installed ?? false);

  const dnsDep = dependencies.find((d) => d.id === 'dns_resolver');
  const dnsReady = settings?.dns_resolver_configured || (dnsDep?.is_installed ?? false);

  const requiredDeps = dependencies.filter((d) => d.is_required && d.id !== 'brew');
  const missingRequired = dependencies.filter((d) => d.is_required && !d.is_installed);
  const allDepsReady = missingRequired.length === 0;

  const isEverythingConfigured = rootCaReady && dnsReady && allDepsReady;

  const handleAutoSetup = async () => {
    setErrorMessage(null);
    setIsAutoSettingUp(true);
    try {
      if (onRunInitialSetup) {
        await onRunInitialSetup({ enableSudo, defaultIde: selectedIde });
      } else {
        if (onSetupRootCa) await onSetupRootCa();
        if (onSetupDns) await onSetupDns();
        if (enableSudo && onEnablePasswordlessSudo) await onEnablePasswordlessSudo();
        await onInstallAllMissing();
      }

      await onRefreshDependencies();

      if (onUpdateSettings && settings) {
        await onUpdateSettings({
          ...settings,
          default_ide: selectedIde,
          initial_setup_completed: true,
          root_ca_installed: true,
          dns_resolver_configured: true,
          passwordless_sudo: enableSudo ? true : settings.passwordless_sudo,
        });
      }

      setSetupSuccess(true);
    } catch (e: any) {
      setErrorMessage(e?.toString() || 'Failed to complete initial setup');
    } finally {
      setIsAutoSettingUp(false);
    }
  };

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

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <SparkLogo size={16} showDot={false} />
                <span>Spark First-Time Setup & Onboarding</span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Configure Your Local Development Environment
              </h2>
              <p className="text-xs text-white/50 mt-1 max-w-lg">
                Spark automatically manages native Nginx, local *.test DNS routing, SSL certificates, PHP engines, and Node runtimes without Docker.
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center space-x-1 mt-4 pt-3 border-t border-white/[0.06]">
            <button
              onClick={() => setActiveTab('quick')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium transition ${
                activeTab === 'quick'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick Auto-Setup (Recommended)</span>
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium transition ${
                activeTab === 'details'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Components ({dependencies.length})</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {activeTab === 'quick' ? (
            /* Tab A: Quick Auto-Setup View */
            <div className="space-y-3.5">
              {/* Card 1: Zero-Config HTTPS Root CA */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 border border-emerald-500/20">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-white">Local Root Certificate Authority (CA)</span>
                      {rootCaReady ? (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Trusted in Keychain
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Needs Setup
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-white/50 truncate mt-0.5">
                      Enables trusted green padlock HTTPS on all *.test domains without browser warnings.
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: macOS .test DNS Resolver */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 border border-blue-500/20">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-white">macOS /etc/resolver/test Route</span>
                      {dnsReady ? (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Configured (127.0.0.1)
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Needs Setup
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-white/50 truncate mt-0.5">
                      Routes any *.test domain request straight to 127.0.0.1 without editing /etc/hosts.
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Passwordless Administrator Access */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0 border border-purple-500/20">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-white">Passwordless Administrator Access</span>
                      <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                        One-Time macOS Prompt
                      </span>
                    </div>
                    <div className="text-[11px] text-white/50 mt-0.5">
                      Authorize once so Spark configures DNS, SSL certificates, and background daemons without asking for your password every time.
                    </div>
                  </div>
                </div>
                <label className="flex items-center space-x-2 cursor-pointer ml-3 shrink-0">
                  <input
                    type="checkbox"
                    checked={enableSudo}
                    onChange={(e) => setEnableSudo(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-white/70 select-none">Enable</span>
                </label>
              </div>

              {/* Card 4: Projects Directory & Preferred Editor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <Folder className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-white">Watched Projects Directory</span>
                  </div>
                  <div className="text-[11px] text-white/50 mb-2">
                    Sites placed here are served at <code className="text-blue-400 font-mono">&lt;folder&gt;.test</code>.
                  </div>
                  <div className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] font-mono text-[11px] text-white/80 truncate">
                    ~/Spark
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <Code className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-white">Default Code Editor (IDE)</span>
                  </div>
                  <div className="text-[11px] text-white/50 mb-2">
                    Used when opening site projects.
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['antigravity', 'cursor', 'vscode', 'zed'] as SupportedIde[]).map((ide) => {
                      const labels: Record<SupportedIde, string> = {
                        antigravity: 'Antigravity',
                        cursor: 'Cursor',
                        vscode: 'VS Code',
                        zed: 'Zed',
                      };
                      return (
                        <button
                          key={ide}
                          type="button"
                          onClick={() => setSelectedIde(ide)}
                          className={`px-2 py-1 rounded text-[11px] font-medium border text-center transition ${
                            selectedIde === ide
                              ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-semibold'
                              : 'bg-white/[0.03] border-white/[0.08] text-white/60 hover:bg-white/[0.06]'
                          }`}
                        >
                          {labels[ide]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Card 5: Core Runtimes Status */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-white">Essential Development Runtimes</span>
                      <span className="text-[10px] font-mono text-white/50">
                        ({requiredDeps.filter((d) => d.is_installed).length}/{requiredDeps.length} Ready)
                      </span>
                    </div>
                    <div className="text-[11px] text-white/50 mt-0.5">
                      Nginx, Dnsmasq, PHP 8.4 engine, and Composer package manager.
                    </div>
                  </div>
                </div>
                {allDepsReady ? (
                  <span className="flex items-center space-x-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Ready</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Auto-installed
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* Tab B: Detailed Dependencies List */
            <div className="space-y-4">
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
                            <div
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0"
                              title={`${dep.name} is installed`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </div>
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
            </div>
          )}

          {/* Success Banner */}
          {setupSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Spark has been configured successfully! SSL Root CA trusted and *.test domains active.</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Installation Logs */}
          {(isInstalling || isAutoSettingUp || logs.length > 0) && (
            <div className="p-3.5 rounded-xl bg-[#0e0e12] border border-white/[0.08] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-white/70">
                <span className="flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  <span>Setup Progress</span>
                </span>
                {(isInstalling || isAutoSettingUp) && (
                  <span className="text-blue-400 flex items-center space-x-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Configuring Spark...</span>
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
            {isEverythingConfigured || setupSuccess ? (
              <span className="text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>All essential components and routes ready!</span>
              </span>
            ) : (
              <span>Automatic zero-config setup takes ~5 seconds</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {activeTab === 'quick' ? (
              isEverythingConfigured || setupSuccess ? (
                <button
                  onClick={onClose}
                  className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-500/25 transition active:scale-95"
                >
                  <span>Continue to Spark</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleAutoSetup}
                  disabled={isInstalling || isAutoSettingUp}
                  className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition active:scale-95 disabled:opacity-50"
                >
                  {isInstalling || isAutoSettingUp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 text-amber-300" />
                  )}
                  <span>Set Up Spark Automatically</span>
                </button>
              )
            ) : (
              !allDepsReady ? (
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
                  <span>Install All Missing</span>
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-500/25 transition active:scale-95"
                >
                  <span>Continue to Spark</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
