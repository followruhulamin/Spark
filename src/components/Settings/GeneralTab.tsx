import React, { useState } from 'react';
import { Folder, Plus, Minus, ShieldCheck, Globe, Check, Loader2, KeyRound, Sparkles, RefreshCw } from 'lucide-react';
import { AppSettings, SupportedIde, UpdateFrequency } from '../../types';

interface GeneralTabProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => Promise<void>;
  onSetupRootCa: () => Promise<string>;
  onSetupDns: () => Promise<string>;
  onAutoConfigureRouting?: () => Promise<string>;
  onEnablePasswordlessSudo?: () => Promise<string>;
  onDisablePasswordlessSudo?: () => Promise<string>;
  appVersion?: string;
  onCheckForUpdates?: () => Promise<void>;
  isCheckingUpdate?: boolean;
  updateStatusText?: string | null;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({
  settings,
  onUpdateSettings,
  onSetupRootCa,
  onSetupDns,
  onAutoConfigureRouting,
  onEnablePasswordlessSudo,
  onDisablePasswordlessSudo,
  appVersion,
  onCheckForUpdates,
  isCheckingUpdate = false,
  updateStatusText = null,
}) => {
  const [newPathInput, setNewPathInput] = useState('');
  const [caLoading, setCaLoading] = useState(false);
  const [dnsLoading, setDnsLoading] = useState(false);
  const [sudoLoading, setSudoLoading] = useState(false);
  const [caMessage, setCaMessage] = useState<string | null>(null);
  const [dnsMessage, setDnsMessage] = useState<string | null>(null);
  const [autoConfigLoading, setAutoConfigLoading] = useState(false);
  const [autoConfigMessage, setAutoConfigMessage] = useState<string | null>(null);
  const [sudoMessage, setSudoMessage] = useState<string | null>(null);
  const [sudoError, setSudoError] = useState(false);

  const handleConfigureBoth = async () => {
    setAutoConfigLoading(true);
    setAutoConfigMessage(null);
    try {
      if (onAutoConfigureRouting) {
        const res = await onAutoConfigureRouting();
        setAutoConfigMessage(res);
      } else {
        await onSetupRootCa();
        await onSetupDns();
        setAutoConfigMessage('Root CA and DNS resolver successfully configured!');
      }
      await onUpdateSettings({
        ...settings,
        root_ca_installed: true,
        dns_resolver_configured: true,
      });
    } catch (e: any) {
      setAutoConfigMessage(e?.toString() || 'Failed to auto-configure routing');
    } finally {
      setAutoConfigLoading(false);
    }
  };

  const formatLastChecked = (dateStr?: string | null): string => {
    if (!dateStr) return 'Never checked';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Never checked';

      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (isToday) {
        return `Today at ${timeStr}`;
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday at ${timeStr}`;
      }

      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
    } catch {
      return 'Never checked';
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

  const handleIdeChange = async (ide: SupportedIde) => {
    const updated = { ...settings, default_ide: ide };
    await onUpdateSettings(updated);
  };

  const handleBrowsePath = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const selected = await invoke<string | null>('pick_folder');
      if (selected) {
        setNewPathInput(selected);
      }
    } catch (e) {
      console.error('Failed to browse path', e);
    }
  };

  const handleAddPath = async () => {
    if (!newPathInput.trim()) return;
    const clean = newPathInput.trim();
    if (!settings.project_paths.includes(clean)) {
      const updated = {
        ...settings,
        project_paths: [...settings.project_paths, clean],
      };
      await onUpdateSettings(updated);
      setNewPathInput('');
    }
  };

  const handleRemovePath = async (p: string) => {
    const updated = {
      ...settings,
      project_paths: settings.project_paths.filter((item) => item !== p),
    };
    await onUpdateSettings(updated);
  };

  const handleInstallCa = async () => {
    setCaLoading(true);
    setCaMessage(null);
    try {
      const res = await onSetupRootCa();
      setCaMessage(res);
      await onUpdateSettings({ ...settings, root_ca_installed: true });
    } catch (e: any) {
      setCaMessage(e?.toString() || 'Failed to install CA');
    } finally {
      setCaLoading(false);
    }
  };

  const handleInstallDns = async () => {
    setDnsLoading(true);
    setDnsMessage(null);
    try {
      const res = await onSetupDns();
      setDnsMessage(res);
      await onUpdateSettings({ ...settings, dns_resolver_configured: true });
    } catch (e: any) {
      setDnsMessage(e?.toString() || 'Failed to configure DNS');
    } finally {
      setDnsLoading(false);
    }
  };

  const handleToggleSudo = async () => {
    setSudoLoading(true);
    setSudoMessage(null);
    setSudoError(false);
    try {
      if (settings.passwordless_sudo) {
        if (onDisablePasswordlessSudo) {
          const res = await onDisablePasswordlessSudo();
          setSudoMessage(res);
          await onUpdateSettings({ ...settings, passwordless_sudo: false });
        }
      } else {
        if (onEnablePasswordlessSudo) {
          const res = await onEnablePasswordlessSudo();
          setSudoMessage(res);
          await onUpdateSettings({ ...settings, passwordless_sudo: true });
        }
      }
    } catch (e: any) {
      setSudoError(true);
      setSudoMessage(e?.toString() || 'Action failed');
    } finally {
      setSudoLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Watched Project Directories */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Watched Project Directories</h4>
            <p className="text-xs text-white/50 mt-0.5">
              Any folder inside these directories is served automatically at <code className="text-blue-400 font-mono">&lt;folder&gt;.test</code>.
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          {settings.project_paths.map((p) => (
            <div
              key={p}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs font-mono text-white/80"
            >
              <div className="flex items-center space-x-2 truncate">
                <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">{p}</span>
              </div>
              {settings.project_paths.length > 1 && (
                <button
                  onClick={() => handleRemovePath(p)}
                  className="p-1 rounded hover:bg-white/[0.08] text-white/40 hover:text-red-400 transition"
                  title="Remove path"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newPathInput}
            onChange={(e) => setNewPathInput(e.target.value)}
            placeholder="e.g. ~/Spark or /Users/username/Sites"
            className="flex-1 bg-white/[0.05] focus:bg-[#16161a] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white outline-none font-mono"
          />
          <button
            type="button"
            onClick={handleBrowsePath}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-white border border-white/[0.08] transition active:scale-95"
          >
            <Folder className="w-3.5 h-3.5 text-amber-400" />
            <span>Browse</span>
          </button>
          <button
            onClick={handleAddPath}
            disabled={!newPathInput.trim()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-50 text-xs font-medium text-white border border-white/[0.08] transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Path</span>
          </button>
        </div>
      </div>

      {/* Startup & Behavior Toggles */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-4">
        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Startup & Behavior</h4>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-white">Launch at Login</div>
            <div className="text-[11px] text-white/50">Start Spark background daemons when you log in to macOS</div>
          </div>
          <button
            onClick={() => handleToggle('launch_at_login')}
            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 ease-in-out ${settings.launch_at_login ? 'bg-blue-600 justify-end' : 'bg-white/20 justify-start'
              }`}
          >
            <span className="w-4 h-4 bg-white rounded-full shadow-md" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-white">Always Show Dock Icon</div>
            <div className="text-[11px] text-white/50">Keep Spark icon in macOS Dock alongside menu bar tray</div>
          </div>
          <button
            onClick={() => handleToggle('always_show_dock_icon')}
            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 ease-in-out ${settings.always_show_dock_icon ? 'bg-blue-600 justify-end' : 'bg-white/20 justify-start'
              }`}
          >
            <span className="w-4 h-4 bg-white rounded-full shadow-md" />
          </button>
        </div>
      </div>

      {/* Software Updates */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Software Updates</span>
            </h4>
            <p className="text-xs text-white/50 mt-0.5">
              Check for new releases, configure check frequency, and install updates.
            </p>
          </div>
          {onCheckForUpdates && (
            <button
              onClick={onCheckForUpdates}
              disabled={isCheckingUpdate}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition active:scale-95 disabled:opacity-50"
            >
              {isCheckingUpdate ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                  <span>Check for Updates</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Current Version & Last Checked Status */}
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-white">Spark v{appVersion || '0.1.0'}</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Installed
              </span>
            </div>
            <div className="text-[11px] text-white/50">
              {updateStatusText || `Last checked: ${formatLastChecked(settings.last_update_check)}`}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-white/40 block">
              {settings.auto_check_updates !== false && settings.update_check_frequency !== 'never'
                ? `Checking ${
                    settings.update_check_frequency === 'weekly'
                      ? 'Weekly'
                      : settings.update_check_frequency === 'monthly'
                      ? 'Monthly'
                      : 'Daily'
                  }`
                : 'Auto-check disabled'}
            </span>
          </div>
        </div>

        {/* Automatically Check for Updates Toggle */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-xs font-medium text-white">Automatically Check for Updates</div>
            <div className="text-[11px] text-white/50">Periodically check GitHub releases for new Spark releases</div>
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

        {/* Check Frequency Dropdown */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-xs font-medium text-white">Check Frequency</div>
            <div className="text-[11px] text-white/50">Choose how often Spark automatically checks for updates</div>
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

        {/* Automatic Install Toggle */}
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

      {/* Default IDE Selector */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">Default Code Editor (IDE)</h4>
        <p className="text-xs text-white/50 mb-3">
          Used when clicking the Code button on any site row.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(['antigravity', 'cursor', 'vscode', 'zed'] as SupportedIde[]).map((ide) => {
            const isSelected = settings.default_ide === ide;
            const labels: Record<SupportedIde, string> = {
              antigravity: 'Antigravity IDE',
              cursor: 'Cursor',
              vscode: 'VS Code',
              zed: 'Zed',
            };
            return (
              <button
                key={ide}
                onClick={() => handleIdeChange(ide)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition ${isSelected
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-semibold'
                  : 'bg-white/[0.04] border-white/[0.08] text-white/70 hover:bg-white/[0.08]'
                  }`}
              >
                {labels[ide]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Zero-Config HTTPS & DNS Setup */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Zero-Config HTTPS & DNS Routing</h4>
            <p className="text-xs text-white/50 mt-0.5">Enables green padlock SSL and local *.test loopback resolution.</p>
          </div>
          {(!settings.root_ca_installed || !settings.dns_resolver_configured) && (
            <button
              onClick={handleConfigureBoth}
              disabled={autoConfigLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20 transition active:scale-95 disabled:opacity-50"
            >
              {autoConfigLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              )}
              <span>Auto-Configure Both</span>
            </button>
          )}
        </div>
        {autoConfigMessage && (
          <p className="text-xs text-emerald-400 font-mono bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
            {autoConfigMessage}
          </p>
        )}

        {/* Root CA */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-white flex items-center space-x-2">
                <span>Local Root Certificate Authority (CA)</span>
                {settings.root_ca_installed ? (
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    Trusted in Keychain
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    Not Trusted Yet
                  </span>
                )}
              </div>
              <div className="text-[11px] text-white/50">Enables green padlock HTTPS on all *.test domains without browser warnings</div>
            </div>
          </div>

          <button
            onClick={handleInstallCa}
            disabled={caLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] transition active:scale-95 disabled:opacity-50"
          >
            {caLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{settings.root_ca_installed ? 'Re-trust CA' : 'Install Root CA'}</span>
          </button>
        </div>
        {caMessage && <p className="text-xs text-emerald-400 font-mono">{caMessage}</p>}

        {/* Local DNS Resolver */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-white flex items-center space-x-2">
                <span>macOS /etc/resolver/test Route</span>
                {settings.dns_resolver_configured ? (
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    Configured (127.0.0.1)
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    Pending
                  </span>
                )}
              </div>
              <div className="text-[11px] text-white/50">Routes any *.test domain request straight to 127.0.0.1 without editing /etc/hosts</div>
            </div>
          </div>

          <button
            onClick={handleInstallDns}
            disabled={dnsLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] transition active:scale-95 disabled:opacity-50"
          >
            {dnsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-blue-400" />}
            <span>Configure Resolver</span>
          </button>
        </div>
        {dnsMessage && <p className="text-xs text-blue-400 font-mono">{dnsMessage}</p>}
      </div>

      {/* Passwordless Administrator Access */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${settings.passwordless_sudo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-purple-500/10 text-purple-400'}`}>
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-white flex items-center space-x-2">
                <span>Passwordless Administrator Access</span>
                {settings.passwordless_sudo ? (
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    Active (No Prompts)
                  </span>
                ) : (
                  <span className="text-[10px] text-white/50 bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.08]">
                    Not Configured
                  </span>
                )}
              </div>
              <div className="text-[11px] text-white/50">
                Authorize once so Spark can configure DNS, trust SSL certificates, and manage daemons without asking for your macOS password each time.
              </div>
            </div>
          </div>

          <button
            onClick={handleToggleSudo}
            disabled={sudoLoading}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition active:scale-95 disabled:opacity-50 ${
              settings.passwordless_sudo
                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border-purple-500/30'
            }`}
          >
            {sudoLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : settings.passwordless_sudo ? (
              <span>Revoke Access</span>
            ) : (
              <span>Authorize (One-Time)</span>
            )}
          </button>
        </div>
        {sudoMessage && (
          <p className={`text-xs font-mono ${sudoError ? 'text-red-400' : 'text-emerald-400'}`}>
            {sudoMessage}
          </p>
        )}
      </div>
    </div>
  );
};
