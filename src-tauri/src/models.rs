use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FrameworkType {
    Laravel,
    React,
    Vue,
    Svelte,
    Livewire,
    Php,
    Static,
}

impl Default for FrameworkType {
    fn default() -> Self {
        FrameworkType::Laravel
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Site {
    pub id: String,
    pub name: String,
    pub domain: String,
    pub path: String,
    pub php_version: String,
    pub secured: bool,
    pub favorite: bool,
    pub framework: FrameworkType,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SupportedIde {
    Antigravity,
    Cursor,
    Vscode,
    Zed,
}

impl Default for SupportedIde {
    fn default() -> Self {
        SupportedIde::Antigravity
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub project_paths: Vec<String>,
    pub default_ide: SupportedIde,
    pub launch_at_login: bool,
    pub always_show_dock_icon: bool,
    pub auto_update: bool,
    pub php_auto_patch: bool,
    pub active_php_version: String,
    pub active_node_version: String,
    pub root_ca_installed: bool,
    pub dns_resolver_configured: bool,
    #[serde(default)]
    pub passwordless_sudo: bool,
    #[serde(default)]
    pub initial_setup_completed: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        let home = dirs::home_dir().map(|p| p.to_string_lossy().to_string()).unwrap_or_else(|| "/Users/ruhulamin".to_string());
        let spark_path = format!("{}/Spark", home);
        let _ = std::fs::create_dir_all(&spark_path);
        
        Self {
            project_paths: vec![spark_path],
            default_ide: SupportedIde::Cursor,
            launch_at_login: true,
            always_show_dock_icon: true,
            auto_update: true,
            php_auto_patch: true,
            active_php_version: "8.4".to_string(),
            active_node_version: "v22".to_string(),
            root_ca_installed: false,
            dns_resolver_configured: false,
            passwordless_sudo: false,
            initial_setup_completed: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhpVersionInfo {
    pub version: String,
    pub full_version: String,
    pub binary_path: String,
    pub fpm_socket: String,
    pub is_installed: bool,
    pub is_active: bool,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhpIniSettings {
    pub memory_limit: String,
    pub upload_max_filesize: String,
    pub max_execution_time: String,
    pub post_max_size: String,
    pub ini_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeVersionInfo {
    pub version: String,
    pub full_version: String,
    pub binary_path: String,
    pub is_installed: bool,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageManagersState {
    pub npm: bool,
    pub pnpm: bool,
    pub yarn: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MysqlStatus {
    pub running: bool,
    pub port: u16,
    pub version: String,
    pub data_dir: String,
    pub uptime: String,
    pub database_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseInfo {
    pub name: String,
    pub size_bytes: u64,
    pub size_formatted: String,
    pub table_count: usize,
    pub collation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceHealth {
    pub nginx: String,
    pub php: String,
    pub mysql: String,
    pub dns: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAppParams {
    pub name: String,
    pub starter_kit: String,
    pub target_dir: Option<String>,
    pub php_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScaffoldLogEvent {
    pub step: String,
    pub message: String,
    pub is_error: bool,
    pub is_done: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencyItem {
    pub id: String,
    pub name: String,
    pub category: String,
    pub description: String,
    pub is_installed: bool,
    pub version: String,
    pub binary_path: String,
    pub is_required: bool,
    pub status: String,
}
