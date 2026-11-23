export type StarterKit = 'none' | 'react' | 'vue' | 'svelte' | 'livewire';

export type SupportedIde = 'antigravity' | 'cursor' | 'vscode' | 'zed';

export type UpdateFrequency = 'daily' | 'weekly' | 'monthly' | 'never';

export type FrameworkType = 'laravel' | 'react' | 'vue' | 'svelte' | 'livewire' | 'php' | 'static';

export interface Site {
  id: string;
  name: string;
  domain: string;
  path: string;
  php_version: string;
  secured: boolean;
  favorite: boolean;
  framework: FrameworkType;
  created_at: string;
}

export interface AppSettings {
  project_paths: string[];
  default_ide: SupportedIde;
  launch_at_login: boolean;
  always_show_dock_icon: boolean;
  auto_update: boolean;
  auto_check_updates?: boolean;
  update_check_frequency?: UpdateFrequency;
  last_update_check?: string | null;
  php_auto_patch: boolean;
  active_php_version: string;
  active_node_version: string;
  root_ca_installed: boolean;
  dns_resolver_configured: boolean;
  passwordless_sudo: boolean;
  initial_setup_completed?: boolean;
}

export interface PhpVersionInfo {
  version: string;
  full_version: string;
  binary_path: string;
  fpm_socket: string;
  is_installed: boolean;
  is_active: boolean;
  status: string;
}

export interface PhpIniSettings {
  memory_limit: string;
  upload_max_filesize: string;
  max_execution_time: string;
  post_max_size: string;
  ini_path: string;
}

export interface NodeVersionInfo {
  version: string;
  full_version: string;
  binary_path: string;
  is_installed: boolean;
  is_active: boolean;
}

export interface PackageManagersState {
  npm: boolean;
  pnpm: boolean;
  yarn: boolean;
}

export interface MysqlStatus {
  running: boolean;
  port: number;
  version: string;
  data_dir: string;
  uptime: string;
  database_count: number;
}

export interface DatabaseInfo {
  name: string;
  size_bytes: number;
  size_formatted: string;
  table_count: number;
  collation: string;
}

export interface ServiceHealth {
  nginx: 'running' | 'stopped' | 'error';
  php: 'running' | 'stopped' | 'error';
  mysql: 'running' | 'stopped' | 'error';
  dns: 'running' | 'stopped' | 'error';
}

export interface FullAppState {
  settings: AppSettings;
  sites: Site[];
  php_versions: PhpVersionInfo[];
  node_versions: NodeVersionInfo[];
  mysql_status: MysqlStatus;
  service_health: ServiceHealth;
  package_managers: PackageManagersState;
}

export interface CreateAppParams {
  name: string;
  starter_kit: StarterKit;
  target_dir?: string;
  php_version?: string;
}

export interface ScaffoldLogEvent {
  step: string;
  message: string;
  is_error: boolean;
  is_done: boolean;
}

export interface DependencyItem {
  id: string;
  name: string;
  category: 'package_manager' | 'web_server' | 'dns' | 'php' | 'javascript' | 'database' | 'security' | string;
  description: string;
  is_installed: boolean;
  version: string;
  binary_path: string;
  is_required: boolean;
  status: string;
}
