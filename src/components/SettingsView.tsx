import React, { useState, useRef, useEffect } from 'react';
import { Sliders, FileCode, Layers, Database, ArrowLeft, Cpu } from 'lucide-react';
import {
  AppSettings,
  DatabaseInfo,
  DependencyItem,
  MysqlStatus,
  NodeVersionInfo,
  PackageManagersState,
  PhpIniSettings,
  PhpVersionInfo,
  ScaffoldLogEvent,
} from '../types';
import { GeneralTab } from './Settings/GeneralTab';
import { DependenciesTab } from './Settings/DependenciesTab';
import { PhpTab } from './Settings/PhpTab';
import { NodeTab } from './Settings/NodeTab';
import { MysqlTab } from './Settings/MysqlTab';

type SettingsTab = 'general' | 'dependencies' | 'php' | 'node' | 'mysql';

interface SettingsViewProps {
  settings: AppSettings;
  phpVersions: PhpVersionInfo[];
  nodeVersions: NodeVersionInfo[];
  mysqlStatus: MysqlStatus;
  databases: DatabaseInfo[];
  packageManagers: PackageManagersState;
  dependencies: DependencyItem[];
  onClose: () => void;
  onUpdateSettings: (newSettings: AppSettings) => Promise<void>;
  onSetupRootCa: () => Promise<string>;
  onSetupDns: () => Promise<string>;
  onAutoConfigureRouting?: () => Promise<string>;
  onEnablePasswordlessSudo?: () => Promise<string>;
  onDisablePasswordlessSudo?: () => Promise<string>;
  onSetActivePhpVersion: (ver: string) => Promise<string>;
  onGetPhpIni: (ver: string) => Promise<PhpIniSettings>;
  onUpdatePhpIni: (ver: string, newSettings: PhpIniSettings) => Promise<string>;
  onCheckPhpPatches: (ver: string) => Promise<string>;
  onSetActiveNodeVersion: (ver: string) => Promise<string>;
  onTogglePackageManager: (mgr: string, enable: boolean) => Promise<string>;
  onStartMysql: () => Promise<string>;
  onStopMysql: () => Promise<string>;
  onRestartMysql: () => Promise<string>;
  onCreateDatabase: (name: string, collation: string) => Promise<string>;
  onDropDatabase: (name: string) => Promise<string>;
  onOpenDatabaseClient: (dbName?: string) => Promise<string>;
  onRefreshDependencies: () => Promise<void>;
  onInstallDependency: (id: string) => Promise<string>;
  onUninstallDependency?: (id: string) => Promise<string>;
  onInstallAllMissing: () => Promise<string>;
  dependencyLogs: ScaffoldLogEvent[];
  isInstallingDependency: boolean;
  activeInstallingId: string | null;
  appVersion?: string;
  onCheckForUpdates?: () => Promise<void>;
  isCheckingUpdate?: boolean;
  updateStatusText?: string | null;
  onInstallPhpVersion?: (ver: string) => Promise<string>;
  onUninstallPhpVersion?: (ver: string) => Promise<string>;
  onInstallNodeVersion?: (ver: string) => Promise<string>;
  onUninstallNodeVersion?: (ver: string) => Promise<string>;
  onRefreshVersions?: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  phpVersions,
  nodeVersions,
  mysqlStatus,
  databases,
  packageManagers,
  dependencies,
  onClose,
  onUpdateSettings,
  onSetupRootCa,
  onSetupDns,
  onAutoConfigureRouting,
  onEnablePasswordlessSudo,
  onDisablePasswordlessSudo,
  onSetActivePhpVersion,
  onGetPhpIni,
  onUpdatePhpIni,
  onCheckPhpPatches,
  onSetActiveNodeVersion,
  onTogglePackageManager,
  onStartMysql,
  onStopMysql,
  onRestartMysql,
  onCreateDatabase,
  onDropDatabase,
  onOpenDatabaseClient,
  onRefreshDependencies,
  onInstallDependency,
  onUninstallDependency,
  onInstallAllMissing,
  dependencyLogs,
  isInstallingDependency,
  activeInstallingId,
  appVersion,
  onCheckForUpdates,
  isCheckingUpdate,
  updateStatusText,
  onInstallPhpVersion,
  onUninstallPhpVersion,
  onInstallNodeVersion,
  onUninstallNodeVersion,
  onRefreshVersions,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  const missingCount = dependencies.filter((d) => d.is_required && !d.is_installed).length;

  const navItems = [
    { id: 'general' as const, label: 'General', icon: Sliders },
    {
      id: 'dependencies' as const,
      label: 'Dependencies',
      icon: Cpu,
      badge: missingCount > 0 ? missingCount : undefined,
    },
    { id: 'php' as const, label: 'PHP', icon: FileCode },
    { id: 'node' as const, label: 'JavaScript (Node)', icon: Layers },
    { id: 'mysql' as const, label: 'MySQL Server', icon: Database },
  ];

  return (
    <div className="flex flex-1 min-h-0 h-full overflow-hidden bg-[#16161a]">
      {/* Left Sidebar (macOS System Settings Style) */}
      <aside className="w-56 shrink-0 bg-[#1a1a20]/80 backdrop-blur-xl border-r border-white/[0.08] p-3 flex flex-col overflow-y-auto overflow-x-hidden select-none">
        <button
          onClick={onClose}
          className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.06] transition mb-3 shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sites</span>
        </button>

        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-white/70 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Right Content Pane */}
      <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto p-6 bg-[#16161a]">
        <div className="max-w-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white tracking-tight">
              {navItems.find((i) => i.id === activeTab)?.label}
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Configure system runtimes, project paths, and background daemons.
            </p>
          </div>

          {activeTab === 'general' && (
            <GeneralTab
              settings={settings}
              appVersion={appVersion}
              onUpdateSettings={onUpdateSettings}
              onSetupRootCa={onSetupRootCa}
              onSetupDns={onSetupDns}
              onAutoConfigureRouting={onAutoConfigureRouting}
              onEnablePasswordlessSudo={onEnablePasswordlessSudo}
              onDisablePasswordlessSudo={onDisablePasswordlessSudo}
              onCheckForUpdates={onCheckForUpdates}
              isCheckingUpdate={isCheckingUpdate}
              updateStatusText={updateStatusText}
            />
          )}

          {activeTab === 'dependencies' && (
            <DependenciesTab
              dependencies={dependencies}
              onRefresh={onRefreshDependencies}
              onInstallDependency={onInstallDependency}
              onUninstallDependency={onUninstallDependency}
              onInstallAllMissing={onInstallAllMissing}
              logs={dependencyLogs}
              isInstalling={isInstallingDependency}
              activeInstallingId={activeInstallingId}
            />
          )}

          {activeTab === 'php' && (
            <PhpTab
              phpVersions={phpVersions}
              settings={settings}
              onUpdateSettings={onUpdateSettings}
              onSetActiveVersion={onSetActivePhpVersion}
              onGetPhpIni={onGetPhpIni}
              onUpdatePhpIni={onUpdatePhpIni}
              onCheckPatchUpdates={onCheckPhpPatches}
              onInstallVersion={onInstallPhpVersion}
              onUninstallVersion={onUninstallPhpVersion}
              onRefreshVersions={onRefreshVersions}
            />
          )}

          {activeTab === 'node' && (
            <NodeTab
              nodeVersions={nodeVersions}
              settings={settings}
              packageManagers={packageManagers}
              onUpdateSettings={onUpdateSettings}
              onSetActiveVersion={onSetActiveNodeVersion}
              onTogglePackageManager={onTogglePackageManager}
              onInstallVersion={onInstallNodeVersion}
              onUninstallVersion={onUninstallNodeVersion}
              onRefreshVersions={onRefreshVersions}
            />
          )}

          {activeTab === 'mysql' && (
            <MysqlTab
              mysqlStatus={mysqlStatus}
              databases={databases}
              onStartMysql={onStartMysql}
              onStopMysql={onStopMysql}
              onRestartMysql={onRestartMysql}
              onCreateDatabase={onCreateDatabase}
              onDropDatabase={onDropDatabase}
              onOpenClient={onOpenDatabaseClient}
            />
          )}
        </div>
      </main>
    </div>
  );
};
