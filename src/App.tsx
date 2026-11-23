import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  AppSettings,
  CreateAppParams,
  DatabaseInfo,
  DependencyItem,
  FullAppState,
  MysqlStatus,
  NodeVersionInfo,
  PackageManagersState,
  PhpVersionInfo,
  ScaffoldLogEvent,
  ServiceHealth,
  Site,
  StarterKit,
} from './types';
import { Header } from './components/Header';
import { CreateAppCard } from './components/CreateAppCard';
import { SiteList } from './components/SiteList';
import { LinkAppModal } from './components/LinkAppModal';
import { CloneRepoModal } from './components/CloneRepoModal';
import { ScaffoldProgressModal } from './components/ScaffoldProgressModal';
import { SettingsView } from './components/SettingsView';
import { DependencySetupModal } from './components/DependencySetupModal';
import { Footer } from './components/Footer';
import { UpdateModal } from './components/UpdateModal';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

const defaultSettings: AppSettings = {
  project_paths: ['~/Spark'],
  default_ide: 'antigravity',
  launch_at_login: true,
  always_show_dock_icon: true,
  auto_update: true,
  auto_check_updates: true,
  update_check_frequency: 'daily',
  last_update_check: null,
  php_auto_patch: true,
  active_php_version: '8.4',
  active_node_version: 'v22',
  root_ca_installed: false,
  dns_resolver_configured: false,
  passwordless_sudo: false,
  initial_setup_completed: false,
};

const defaultMysqlStatus: MysqlStatus = {
  running: false,
  port: 3306,
  version: 'MySQL 8.4',
  data_dir: '~/Library/Application Support/Spark/mysql',
  uptime: 'Stopped',
  database_count: 0,
};

const defaultServiceHealth: ServiceHealth = {
  nginx: 'running',
  php: 'running',
  mysql: 'stopped',
  dns: 'stopped',
};

export function App() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [sites, setSites] = useState<Site[]>([]);
  const [phpVersions, setPhpVersions] = useState<PhpVersionInfo[]>([]);
  const [nodeVersions, setNodeVersions] = useState<NodeVersionInfo[]>([]);
  const [mysqlStatus, setMysqlStatus] = useState<MysqlStatus>(defaultMysqlStatus);
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [packageManagers, setPackageManagers] = useState<PackageManagersState>({
    npm: true,
    pnpm: false,
    yarn: false,
  });
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth>(defaultServiceHealth);
  const [appVersion, setAppVersion] = useState<string>('0.1.5');

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);

  // Dependencies state
  const [dependencies, setDependencies] = useState<DependencyItem[]>([]);
  const [isFirstRunModalOpen, setIsFirstRunModalOpen] = useState(false);
  const [dependencyLogs, setDependencyLogs] = useState<ScaffoldLogEvent[]>([]);
  const [isInstallingDependency, setIsInstallingDependency] = useState(false);
  const [activeInstallingId, setActiveInstallingId] = useState<string | null>(null);

  // Auto-Updater state
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatusText, setUpdateStatusText] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<AppSettings>(defaultSettings);

  // Scaffolding modal state
  const [scaffoldModal, setScaffoldModal] = useState<{
    isOpen: boolean;
    logs: ScaffoldLogEvent[];
    isDone: boolean;
    error: string | null;
    createdSite: Site | null;
  }>({
    isOpen: false,
    logs: [],
    isDone: false,
    error: null,
    createdSite: null,
  });

  // Initial load
  useEffect(() => {
    loadAppState();
    loadDatabases();
    loadDependencies().then(() => {
      invoke<boolean>('is_first_run_needed')
        .then((needed) => {
          if (needed) setIsFirstRunModalOpen(true);
        })
        .catch(() => {});
    });

    // Fetch dynamic app version from Tauri backend or app metadata
    invoke<string>('get_app_version')
      .then((ver) => setAppVersion(ver))
      .catch(() => {
        import('@tauri-apps/api/app')
          .then((m) => m.getVersion())
          .then((ver) => setAppVersion(ver))
          .catch(() => {});
      });

    // Listen for dependency installation progress events
    const unlistenDepProgress = listen<ScaffoldLogEvent>('dependency-progress', (event) => {
      setDependencyLogs((prev) => [...prev, event.payload]);
    });

    // Listen for real-time scaffolding logs from Rust backend
    const unlistenScaffold = listen<ScaffoldLogEvent>('scaffold-progress', (event) => {
      setScaffoldModal((prev) => {
        const newLogs = [...prev.logs, event.payload];
        return {
          ...prev,
          logs: newLogs,
          isDone: event.payload.is_done,
          error: event.payload.is_error ? event.payload.message : prev.error,
        };
      });
    });

    // Listen for tray actions
    const unlistenTray = listen<string>('tray-action', (event) => {
      if (event.payload === 'start_all') handleStartAll();
      if (event.payload === 'stop_all') handleStopAll();
      if (event.payload === 'restart_all') handleRestartAll();
    });

    // Global keyboard shortcuts (Cmd+K, Cmd+,)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        searchInput?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Check for updates on launch
    const updateTimer = setTimeout(() => {
      handleCheckForUpdates(false);
    }, 2500);

    // Periodic check for updates every 30 minutes
    const periodicTimer = setInterval(() => {
      handleCheckForUpdates(false);
    }, 30 * 60 * 1000);

    return () => {
      clearTimeout(updateTimer);
      clearInterval(periodicTimer);
      unlistenScaffold.then((fn) => fn());
      unlistenDepProgress.then((fn) => fn());
      unlistenTray.then((fn) => fn());
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const compareVersions = (v1: string, v2: string): number => {
    const clean1 = v1.replace(/^v/, '').split('-')[0];
    const clean2 = v2.replace(/^v/, '').split('-')[0];
    const p1 = clean1.split('.').map((x) => parseInt(x, 10) || 0);
    const p2 = clean2.split('.').map((x) => parseInt(x, 10) || 0);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const n1 = p1[i] ?? 0;
      const n2 = p2[i] ?? 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  };

  const shouldCheckForUpdates = (currentSettings: AppSettings): boolean => {
    if (currentSettings.auto_check_updates === false || currentSettings.update_check_frequency === 'never') {
      return false;
    }

    const lastCheckStr = currentSettings.last_update_check;
    if (!lastCheckStr) {
      return true;
    }

    const lastCheck = new Date(lastCheckStr).getTime();
    if (isNaN(lastCheck)) {
      return true;
    }

    const diffMs = Date.now() - lastCheck;
    const frequency = currentSettings.update_check_frequency || 'daily';
    const oneDay = 24 * 60 * 60 * 1000;

    switch (frequency) {
      case 'daily':
        return diffMs >= oneDay;
      case 'weekly':
        return diffMs >= 7 * oneDay;
      case 'monthly':
        return diffMs >= 30 * oneDay;
      default:
        return diffMs >= oneDay;
    }
  };

  const handleCheckForUpdates = async (manual: boolean = false) => {
    const currentSettings = settingsRef.current;
    if (!manual && !shouldCheckForUpdates(currentSettings)) {
      return;
    }

    try {
      setIsCheckingUpdate(true);
      setUpdateStatusText('Checking for updates...');
      const update = await check();

      const nowIso = new Date().toISOString();
      setSettings((prev) => {
        const updated = { ...prev, last_update_check: nowIso };
        settingsRef.current = updated;
        invoke('save_settings', { newSettings: updated }).catch((e) =>
          console.warn('[Spark] Failed to save update check time:', e)
        );
        return updated;
      });

      if (update) {
        setAvailableUpdate(update);
        setIsUpdateModalOpen(true);
        setUpdateStatusText(`Update v${update.version} available!`);

        try {
          let permissionGranted = await isPermissionGranted();
          if (!permissionGranted) {
            const permission = await requestPermission();
            permissionGranted = permission === 'granted';
          }
          if (permissionGranted) {
            sendNotification({
              title: 'Spark Update Available',
              body: `Spark v${update.version} is now available to download and install.`,
            });
          }
        } catch (notifErr) {
          console.warn('[Spark] Notification error:', notifErr);
        }
      } else {
        setUpdateStatusText(`Spark is up to date (v${appVersion})`);
      }
    } catch (err: any) {
      console.warn('[Spark] Update check error:', err);

      // Fallback: If Tauri updater threw an error (e.g. 404 if latest.json is missing or format changed),
      // query the GitHub Releases API to verify if we are up to date before declaring the server unreachable.
      let resolvedViaFallback = false;
      try {
        const ghRes = await fetch('https://api.github.com/repos/followruhulamin/Spark/releases/latest', {
          headers: { Accept: 'application/vnd.github.v3+json' },
        });
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          const remoteTag = ghData.tag_name || '';
          if (remoteTag) {
            const cmp = compareVersions(remoteTag, appVersion);
            const nowIso = new Date().toISOString();
            setSettings((prev) => {
              const updated = { ...prev, last_update_check: nowIso };
              settingsRef.current = updated;
              invoke('save_settings', { newSettings: updated }).catch((e) =>
                console.warn('[Spark] Failed to save update check time:', e)
              );
              return updated;
            });

            if (cmp <= 0) {
              setUpdateStatusText(`Spark is up to date (v${appVersion})`);
            } else {
              setUpdateStatusText(`Update ${remoteTag} available on GitHub!`);
            }
            resolvedViaFallback = true;
          }
        }
      } catch (fallbackErr) {
        console.warn('[Spark] GitHub API fallback also failed:', fallbackErr);
      }

      if (!resolvedViaFallback) {
        setUpdateStatusText(manual ? 'Could not reach update server' : null);
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const deps = await invoke<DependencyItem[]>('get_dependencies');
      setDependencies(deps);
      return deps;
    } catch (e) {
      console.error('Failed to load dependencies', e);
      return [];
    }
  };

  const handleInstallDependency = async (id: string) => {
    setIsInstallingDependency(true);
    setActiveInstallingId(id);
    setDependencyLogs([]);
    try {
      const res = await invoke<string>('install_dependency', { id });
      await loadDependencies();
      await loadAppState();
      return res;
    } finally {
      setIsInstallingDependency(false);
      setActiveInstallingId(null);
    }
  };

  const handleInstallAllMissing = async () => {
    setIsInstallingDependency(true);
    setActiveInstallingId(null);
    setDependencyLogs([]);
    try {
      const res = await invoke<string>('install_all_missing_dependencies');
      await loadDependencies();
      await loadAppState();
      return res;
    } finally {
      setIsInstallingDependency(false);
    }
  };

  const handleUninstallDependency = async (id: string) => {
    setIsInstallingDependency(true);
    setActiveInstallingId(id);
    setDependencyLogs([]);
    try {
      const res = await invoke<string>('uninstall_dependency', { id });
      await loadDependencies();
      await loadAppState();
      return res;
    } finally {
      setIsInstallingDependency(false);
      setActiveInstallingId(null);
    }
  };

  const handleInstallPhpVersion = async (version: string) => {
    const res = await invoke<string>('install_php_version', { version });
    await loadAppState();
    await loadDependencies();
    return res;
  };

  const handleUninstallPhpVersion = async (version: string) => {
    const res = await invoke<string>('uninstall_php_version', { version });
    await loadAppState();
    await loadDependencies();
    return res;
  };

  const handleInstallNodeVersion = async (version: string) => {
    const res = await invoke<string>('install_node_version', { version });
    await loadAppState();
    await loadDependencies();
    return res;
  };

  const handleUninstallNodeVersion = async (version: string) => {
    const res = await invoke<string>('uninstall_node_version', { version });
    await loadAppState();
    await loadDependencies();
    return res;
  };

  const loadAppState = async () => {
    try {
      const data = await invoke<FullAppState>('get_app_state');
      setSettings(data.settings);
      settingsRef.current = data.settings;
      setSites(data.sites);
      setPhpVersions(data.php_versions);
      setNodeVersions(data.node_versions);
      setMysqlStatus(data.mysql_status);
      setServiceHealth(data.service_health);
      setPackageManagers(data.package_managers);
    } catch {
      // Fallback sample for initial preview
      setSites([
        {
          id: 'site_portfolio',
          name: 'portfolio',
          domain: 'portfolio.test',
          path: '/Users/ruhulamin/Spark/portfolio',
          php_version: 'default',
          secured: true,
          favorite: true,
          framework: 'laravel',
          created_at: new Date().toISOString(),
        },
        {
          id: 'site_ecommerce',
          name: 'ecommerce',
          domain: 'ecommerce.test',
          path: '/Users/ruhulamin/Spark/ecommerce',
          php_version: '8.4',
          secured: true,
          favorite: false,
          framework: 'react',
          created_at: new Date().toISOString(),
        },
      ]);
    }
  };

  const loadDatabases = async () => {
    try {
      const dbs = await invoke<DatabaseInfo[]>('list_databases');
      setDatabases(dbs);
    } catch {
      setDatabases([
        {
          name: 'spark',
          size_bytes: 1048576,
          size_formatted: '1.0 MB',
          table_count: 14,
          collation: 'utf8mb4_unicode_ci',
        },
        {
          name: 'laravel',
          size_bytes: 524288,
          size_formatted: '512 KB',
          table_count: 8,
          collation: 'utf8mb4_unicode_ci',
        },
      ]);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const scanned = await invoke<Site[]>('scan_project_paths');
      setSites(scanned);
      await loadAppState();
      await loadDatabases();
    } catch {
      await loadAppState();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleCreateApp = async (name: string, starterKit: StarterKit) => {
    setScaffoldModal({
      isOpen: true,
      logs: [],
      isDone: false,
      error: null,
      createdSite: null,
    });

    try {
      const params: CreateAppParams = {
        name,
        starter_kit: starterKit,
      };
      const created = await invoke<Site>('create_site', { params });
      setScaffoldModal((prev) => ({
        ...prev,
        createdSite: created,
        isDone: true,
      }));
      setSites((prev) => [created, ...prev.filter((s) => s.path !== created.path)]);
      await loadDatabases();
      setIsCreateOpen(false);
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    } catch (err: any) {
      setScaffoldModal((prev) => ({
        ...prev,
        error: err?.toString() || 'Creation failed',
      }));
    }
  };

  const handleLinkApp = async (path: string, customDomain?: string) => {
    const linked = await invoke<Site>('link_site', { path, customDomain });
    setSites((prev) => [linked, ...prev.filter((s) => s.path !== linked.path)]);
    setIsCreateOpen(false);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleCloneRepo = async (_repoUrl: string, targetName: string) => {
    const cleanName = targetName
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9.-]/g, '')
      .replace(/-+/g, '-')
      .replace(/\.+/g, '.')
      .replace(/^[-.]+|[-.]+$/g, '');
    const targetDir = `/Users/ruhulamin/Spark/${cleanName}`;
    const domain = cleanName.endsWith('.test') ? cleanName : `${cleanName}.test`;
    const linked = await invoke<Site>('link_site', { path: targetDir, customDomain: domain });
    setSites((prev) => [linked, ...prev.filter((s) => s.path !== linked.path)]);
    setIsCreateOpen(false);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleUnlinkSite = async (id: string) => {
    try {
      await invoke('unlink_site', { id });
      setSites((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setSites((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleDeleteSite = async (id: string) => {
    try {
      await invoke('delete_site', { id });
      setSites((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to delete site:', err);
      try {
        const appState = await invoke<{ sites: Site[] }>('get_app_state');
        setSites(appState.sites);
      } catch {
        setSites((prev) => prev.filter((s) => s.id !== id));
      }
    }
  };

  const handleMoveSite = async (id: string, newDestination: string) => {
    const updated = await invoke<Site>('move_site', { id, newDestination });
    setSites((prev) => prev.map((s) => (s.id === id ? updated : s)));
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      const fav = await invoke<boolean>('toggle_favorite', { id });
      setSites((prev) =>
        prev.map((s) => (s.id === id ? { ...s, favorite: fav } : s))
      );
    } catch {
      setSites((prev) =>
        prev.map((s) => (s.id === id ? { ...s, favorite: !s.favorite } : s))
      );
    }
  };

  const handleToggleHttps = async (id: string) => {
    try {
      const secured = await invoke<boolean>('toggle_https', { id });
      setSites((prev) =>
        prev.map((s) => (s.id === id ? { ...s, secured } : s))
      );
    } catch {
      setSites((prev) =>
        prev.map((s) => (s.id === id ? { ...s, secured: !s.secured } : s))
      );
    }
  };

  const handleSetSitePhpVersion = async (id: string, version: string) => {
    try {
      await invoke('set_site_php_version', { id, version });
      setSites((prev) =>
        prev.map((s) => (s.id === id ? { ...s, php_version: version } : s))
      );
    } catch {
      setSites((prev) =>
        prev.map((s) => (s.id === id ? { ...s, php_version: version } : s))
      );
    }
  };

  const handleOpenBrowser = async (url: string) => {
    try {
      await invoke('open_in_browser', { url });
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleOpenIde = async (path: string) => {
    try {
      await invoke('open_in_ide', { path, ide: settings.default_ide });
    } catch {
      //
    }
  };

  const handleOpenTerminal = async (path: string) => {
    try {
      await invoke('open_in_terminal', { path });
    } catch {
      //
    }
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    settingsRef.current = newSettings;
    try {
      await invoke('save_settings', { newSettings });
    } catch {
      //
    }
  };

  const handleStartAll = async () => {
    try {
      await invoke('start_all_services');
      await loadAppState();
    } catch {
      //
    }
  };

  const handleStopAll = async () => {
    try {
      await invoke('stop_all_services');
      await loadAppState();
    } catch {
      //
    }
  };

  const handleRestartAll = async () => {
    try {
      setIsRefreshing(true);
      await invoke('restart_all_services');
      await handleRefresh();
    } catch {
      //
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#16161a] text-white select-none">
      {/* Top macOS Frameless Window Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isCreateOpen={isCreateOpen}
        onToggleCreate={() => {
          setIsCreateOpen(!isCreateOpen);
          if (isSettingsOpen) setIsSettingsOpen(false);
        }}
        isSettingsOpen={isSettingsOpen}
        onToggleSettings={() => {
          setIsSettingsOpen(!isSettingsOpen);
          if (isCreateOpen) setIsCreateOpen(false);
        }}
        siteCount={sites.length}
        missingRequiredCount={dependencies.filter((d) => d.is_required && !d.is_installed).length}
        onOpenSetup={() => setIsFirstRunModalOpen(true)}
      />

      {/* Main Body */}
      {isSettingsOpen ? (
        /* View B: Settings Window (Sidebar Driven) */
        <SettingsView
          appVersion={appVersion}
          settings={settings}
          phpVersions={phpVersions}
          nodeVersions={nodeVersions}
          mysqlStatus={mysqlStatus}
          databases={databases}
          packageManagers={packageManagers}
          dependencies={dependencies}
          onClose={() => setIsSettingsOpen(false)}
          onUpdateSettings={handleUpdateSettings}
          onSetupRootCa={() => invoke('setup_root_ca')}
          onSetupDns={() => invoke('setup_dns_resolver')}
          onEnablePasswordlessSudo={() => invoke('enable_passwordless_sudo')}
          onDisablePasswordlessSudo={() => invoke('disable_passwordless_sudo')}
          onSetActivePhpVersion={(ver) => invoke('set_active_php_version', { version: ver })}
          onGetPhpIni={(ver) => invoke('get_php_ini', { version: ver })}
          onUpdatePhpIni={(ver, newSettings) => invoke('update_php_ini', { version: ver, settings: newSettings })}
          onCheckPhpPatches={(ver) => invoke('check_php_patch_updates', { version: ver })}
          onSetActiveNodeVersion={(ver) => invoke('set_active_node_version', { version: ver })}
          onTogglePackageManager={(manager, enable) => invoke('toggle_package_manager', { manager, enable })}
          onStartMysql={() => invoke('start_mysql')}
          onStopMysql={() => invoke('stop_mysql')}
          onRestartMysql={() => invoke('restart_mysql')}
          onCreateDatabase={async (name, collation) => {
            const res = await invoke<string>('create_database', { name, collation });
            await loadDatabases();
            return res;
          }}
          onDropDatabase={async (name) => {
            const res = await invoke<string>('drop_database', { name });
            await loadDatabases();
            return res;
          }}
          onOpenDatabaseClient={(dbName) => invoke('open_database_client', { database: dbName })}
          onRefreshDependencies={async () => { await loadDependencies(); }}
          onInstallDependency={handleInstallDependency}
          onUninstallDependency={handleUninstallDependency}
          onInstallAllMissing={handleInstallAllMissing}
          dependencyLogs={dependencyLogs}
          isInstallingDependency={isInstallingDependency}
          activeInstallingId={activeInstallingId}
          onInstallPhpVersion={handleInstallPhpVersion}
          onUninstallPhpVersion={handleUninstallPhpVersion}
          onInstallNodeVersion={handleInstallNodeVersion}
          onUninstallNodeVersion={handleUninstallNodeVersion}
          onRefreshVersions={loadAppState}
          onCheckForUpdates={() => handleCheckForUpdates(true)}
          isCheckingUpdate={isCheckingUpdate}
          updateStatusText={updateStatusText}
          availableUpdate={availableUpdate}
        />
      ) : (
        /* View A: Applications Manager (Main Window) */
        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto pb-10">
          {/* Create New Application Card */}
          <CreateAppCard
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            onCreateApp={handleCreateApp}
            onOpenClone={() => setIsCloneModalOpen(true)}
            onOpenLink={() => setIsLinkModalOpen(true)}
            isCreating={scaffoldModal.isOpen && !scaffoldModal.isDone && !scaffoldModal.error}
          />

          {/* Sites List */}
          <SiteList
            sites={sites}
            searchQuery={searchQuery}
            defaultIde={settings.default_ide}
            onOpenBrowser={handleOpenBrowser}
            onToggleFavorite={handleToggleFavorite}
            onToggleHttps={handleToggleHttps}
            onOpenIde={handleOpenIde}
            onOpenTerminal={handleOpenTerminal}
            onSetPhpVersion={handleSetSitePhpVersion}
            onUnlink={handleUnlinkSite}
            onDelete={handleDeleteSite}
            onMove={handleMoveSite}
            onOpenCreate={() => setIsCreateOpen(true)}
            onOpenLink={() => setIsLinkModalOpen(true)}
          />
        </div>
      )}

      {/* Footer Status Bar */}
      <Footer
        appVersion={appVersion}
        serviceHealth={serviceHealth}
        newVersion={availableUpdate?.version}
        onOpenUpdate={() => setIsUpdateModalOpen(true)}
        onRestartServices={handleRestartAll}
        isRestarting={isRefreshing}
      />

      {/* Link Existing App Modal */}
      <LinkAppModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onLinkApp={handleLinkApp}
        defaultProjectPath={settings.project_paths[0]}
      />

      {/* Clone Repository Modal */}
      <CloneRepoModal
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        onCloneRepo={handleCloneRepo}
      />

      {/* Scaffold Progress Modal */}
      <ScaffoldProgressModal
        isOpen={scaffoldModal.isOpen}
        onClose={() => setScaffoldModal((prev) => ({ ...prev, isOpen: false }))}
        logs={scaffoldModal.logs}
        isDone={scaffoldModal.isDone}
        error={scaffoldModal.error}
        createdSite={scaffoldModal.createdSite}
        defaultIde={settings.default_ide}
        onOpenBrowser={handleOpenBrowser}
        onOpenIde={handleOpenIde}
      />

      {/* First-Run / Dependency Setup Modal */}
      <DependencySetupModal
        isOpen={isFirstRunModalOpen}
        onClose={() => setIsFirstRunModalOpen(false)}
        dependencies={dependencies}
        onInstallDependency={handleInstallDependency}
        onInstallAllMissing={handleInstallAllMissing}
        onRefreshDependencies={async () => { await loadDependencies(); }}
        logs={dependencyLogs}
        isInstalling={isInstallingDependency}
        activeInstallingId={activeInstallingId}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onRunInitialSetup={async (opts) => {
          setIsInstallingDependency(true);
          setDependencyLogs([]);
          try {
            const res = await invoke<string>('run_initial_setup', {
              enablePasswordlessSudo: opts.enableSudo,
              defaultIde: opts.defaultIde,
            });
            await loadDependencies();
            await loadAppState();
            return res;
          } finally {
            setIsInstallingDependency(false);
          }
        }}
        onSetupRootCa={() => invoke<string>('setup_root_ca')}
        onSetupDns={() => invoke<string>('setup_dns_resolver')}
        onEnablePasswordlessSudo={() => invoke<string>('enable_passwordless_sudo')}
      />

      {/* Software Update Modal */}
      {availableUpdate && (
        <UpdateModal
          isOpen={isUpdateModalOpen}
          update={availableUpdate}
          onClose={() => setIsUpdateModalOpen(false)}
          appVersion={appVersion}
        />
      )}
    </div>
  );
}

export default App;
