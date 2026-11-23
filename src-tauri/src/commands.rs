use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use crate::config::ConfigStore;
use crate::dependencies::DependencyManager;
use crate::dns::DnsResolverManager;
use crate::models::*;
use crate::mysql_manager::MysqlManager;
use crate::node_manager::NodeManager;
use crate::php_manager::PhpManager;
use crate::scaffolding::ScaffoldingEngine;
use crate::services::ServiceManager;
use crate::ssl::SslManager;

pub struct AppState {
    pub config: ConfigStore,
    pub ssl: SslManager,
    pub mysql: MysqlManager,
    pub services: ServiceManager,
    pub sites: Mutex<Vec<Site>>,
    pub settings: Mutex<AppSettings>,
}

#[derive(serde::Serialize)]
pub struct FullAppState {
    pub settings: AppSettings,
    pub sites: Vec<Site>,
    pub php_versions: Vec<PhpVersionInfo>,
    pub node_versions: Vec<NodeVersionInfo>,
    pub mysql_status: MysqlStatus,
    pub service_health: ServiceHealth,
    pub package_managers: PackageManagersState,
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub fn get_app_state(state: State<'_, AppState>) -> Result<FullAppState, String> {
    let settings = state.settings.lock().map_err(|e| e.to_string())?.clone();
    let sites = state.sites.lock().map_err(|e| e.to_string())?.clone();
    let php_versions = PhpManager::get_available_versions();
    let node_versions = NodeManager::get_available_versions();
    let mysql_status = state.mysql.get_status();
    let service_health = state.services.get_service_health();
    let package_managers = NodeManager::get_package_managers_state();

    Ok(FullAppState {
        settings,
        sites,
        php_versions,
        node_versions,
        mysql_status,
        service_health,
        package_managers,
    })
}

#[tauri::command]
pub fn save_settings(new_settings: AppSettings, state: State<'_, AppState>) -> Result<AppSettings, String> {
    let mut settings = state.settings.lock().map_err(|e| e.to_string())?;
    *settings = new_settings.clone();
    let sites = state.sites.lock().map_err(|e| e.to_string())?;
    state.config.save(&settings, &sites)?;
    Ok(new_settings)
}

#[tauri::command]
pub fn scan_project_paths(state: State<'_, AppState>) -> Result<Vec<Site>, String> {
    let settings = state.settings.lock().map_err(|e| e.to_string())?;
    let mut sites = state.sites.lock().map_err(|e| e.to_string())?;
    
    let scanned = state.config.scan_project_paths(&settings.project_paths, &sites, &state.ssl);
    *sites = scanned.clone();
    state.config.save(&settings, &sites)?;
    let _ = state.services.sync_vhosts(&sites, Some(&settings.active_php_version));
    Ok(scanned)
}

#[tauri::command]
pub async fn create_site(
    app_handle: AppHandle,
    params: CreateAppParams,
    state: State<'_, AppState>,
) -> Result<Site, String> {
    let default_root = {
        let settings = state.settings.lock().map_err(|e| e.to_string())?;
        let first_path = settings.project_paths.first().cloned().unwrap_or_else(|| "~/Spark".to_string());
        if first_path.starts_with("~/") {
            let p = dirs::home_dir().unwrap_or_default().join(&first_path[2..]);
            let _ = std::fs::create_dir_all(&p);
            p
        } else {
            let p = PathBuf::from(first_path);
            let _ = std::fs::create_dir_all(&p);
            p
        }
    };

    let target_root = match params.target_dir.as_ref() {
        Some(dir) => PathBuf::from(dir),
        None => default_root,
    };

    let new_site = ScaffoldingEngine::create_app(app_handle, params, target_root).await?;

    {
        let settings = state.settings.lock().map_err(|e| e.to_string())?;
        let mut sites = state.sites.lock().map_err(|e| e.to_string())?;
        sites.retain(|s| s.path != new_site.path);
        sites.insert(0, new_site.clone());
        state.config.save(&settings, &sites)?;
        let _ = state.services.generate_vhost_config(&new_site, Some(&settings.active_php_version));
        state.services.reload_nginx();
    }

    Ok(new_site)
}

#[tauri::command]
pub fn link_site(path: String, custom_domain: Option<String>, state: State<'_, AppState>) -> Result<Site, String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err("Directory does not exist".to_string());
    }

    let folder_name = p.file_name().unwrap_or_default().to_string_lossy().to_string();
    let raw_domain = custom_domain
        .filter(|d| !d.trim().is_empty())
        .unwrap_or_else(|| {
            let clean = folder_name.trim().to_lowercase().replace(' ', "-");
            if clean.ends_with(".test") {
                clean
            } else {
                format!("{}.test", clean)
            }
        });

    let domain = if !raw_domain.ends_with(".test") {
        format!("{}.test", raw_domain.trim())
    } else {
        raw_domain.trim().to_string()
    };

    let is_secured = state.ssl.is_site_secured(&domain);
    let framework = ConfigStore::detect_framework(&p);

    let new_site = Site {
        id: format!("site_{}", folder_name.to_lowercase().replace(' ', "-")),
        name: folder_name,
        domain,
        path: path.clone(),
        php_version: "default".to_string(),
        secured: is_secured,
        favorite: false,
        framework,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    {
        let settings = state.settings.lock().map_err(|e| e.to_string())?;
        let mut sites = state.sites.lock().map_err(|e| e.to_string())?;
        sites.retain(|s| s.path != path);
        sites.insert(0, new_site.clone());
        state.config.save(&settings, &sites)?;
        let _ = state.services.generate_vhost_config(&new_site, Some(&settings.active_php_version));
        state.services.reload_nginx();
    }

    Ok(new_site)
}

#[tauri::command]
pub fn unlink_site(id: String, state: State<'_, AppState>) -> Result<String, String> {
    let settings = state.settings.lock().map_err(|e| e.to_string())?;
    let mut sites = state.sites.lock().map_err(|e| e.to_string())?;
    
    if let Some(site) = sites.iter().find(|s| s.id == id).cloned() {
        state.ssl.remove_site_certificate(&site.domain);
        state.services.remove_vhost_config(&site.domain);
        sites.retain(|s| s.id != id);
        state.config.save(&settings, &sites)?;
        state.services.reload_nginx();
        Ok(format!("Unlinked site '{}'", site.name))
    } else {
        Err("Site not found".to_string())
    }
}

#[tauri::command]
pub fn delete_site(id: String, state: State<'_, AppState>) -> Result<String, String> {
    let settings = state.settings.lock().map_err(|e| e.to_string())?;
    let mut sites = state.sites.lock().map_err(|e| e.to_string())?;

    if let Some(site) = sites.iter().find(|s| s.id == id).cloned() {
        let p = PathBuf::from(&site.path);

        // Strict safety checks before deleting any folder from disk
        let canonical_target = p.canonicalize().unwrap_or_else(|_| p.clone());
        if let Some(home) = dirs::home_dir() {
            let canonical_home = home.canonicalize().unwrap_or(home);
            if canonical_target == canonical_home {
                return Err(format!("Cannot delete user home directory: {}", site.path));
            }
        }

        if canonical_target.parent().is_none() || canonical_target == PathBuf::from("/") {
            return Err(format!("Cannot delete root filesystem directory: {}", site.path));
        }

        // Clean up certificates and virtual host configuration
        state.ssl.remove_site_certificate(&site.domain);
        state.services.remove_vhost_config(&site.domain);

        // Remove from tracked sites and persist configuration
        sites.retain(|s| s.id != id);
        state.config.save(&settings, &sites)?;
        state.services.reload_nginx();

        // Completely delete the folder from disk
        if p.exists() {
            if let Err(e) = std::fs::remove_dir_all(&p) {
                // If remove_dir_all fails (e.g. read-only packfiles in .git), fall back to rm -rf
                let rm_res = Command::new("rm").args(["-rf", &site.path]).output();
                match rm_res {
                    Ok(out) if out.status.success() => {},
                    _ => return Err(format!("Site unlinked from Spark, but failed to delete folder '{}': {}", site.path, e)),
                }
            }
        }

        Ok(format!("Deleted site '{}' and removed folder '{}'", site.name, site.path))
    } else {
        Err("Site not found".to_string())
    }
}

#[tauri::command]
pub fn move_site(id: String, new_destination: String, state: State<'_, AppState>) -> Result<Site, String> {
    let settings = state.settings.lock().map_err(|e| e.to_string())?;
    let mut sites = state.sites.lock().map_err(|e| e.to_string())?;

    let site = sites.iter().find(|s| s.id == id).cloned()
        .ok_or_else(|| "Site not found".to_string())?;

    let old_path = PathBuf::from(&site.path);
    if !old_path.exists() {
        return Err(format!("Current site directory does not exist: {}", site.path));
    }

    let folder_name = old_path.file_name()
        .ok_or_else(|| "Invalid source folder name".to_string())?;

    let target_input = PathBuf::from(&new_destination);

    // Determine target directory:
    // If target exists and is a directory:
    //   - If target folder name matches source folder name, assume full target path was chosen
    //   - Otherwise, append folder_name to the chosen parent folder
    let target_path = if target_input.exists() && target_input.is_dir() {
        if target_input.file_name() == Some(folder_name) {
            target_input
        } else {
            target_input.join(folder_name)
        }
    } else {
        target_input
    };

    if target_path == old_path {
        return Err("Destination is identical to the current site path".to_string());
    }

    if target_path.exists() {
        return Err(format!("Destination folder already exists: {}", target_path.display()));
    }

    if target_path.starts_with(&old_path) {
        return Err("Cannot move a folder into a subdirectory of itself".to_string());
    }

    if let Some(home) = dirs::home_dir() {
        if old_path.canonicalize().unwrap_or_else(|_| old_path.clone()) == home.canonicalize().unwrap_or(home) {
            return Err("Cannot move the user home directory".to_string());
        }
    }

    // Ensure parent directory of target exists
    if let Some(parent) = target_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent destination directory: {}", e))?;
        }
    }

    // Perform move: try std::fs::rename first; fallback to ditto for cross-volume moves
    if let Err(rename_err) = std::fs::rename(&old_path, &target_path) {
        let ditto_res = Command::new("ditto")
            .args([old_path.as_os_str(), target_path.as_os_str()])
            .output();

        match ditto_res {
            Ok(out) if out.status.success() => {
                let _ = std::fs::remove_dir_all(&old_path)
                    .or_else(|_| Command::new("rm").args(["-rf", &old_path.to_string_lossy()]).output().map(|_| ()));
            }
            Ok(out) => {
                let err_msg = String::from_utf8_lossy(&out.stderr);
                return Err(format!("Failed to move site directory: {}", if err_msg.is_empty() { rename_err.to_string() } else { err_msg.to_string() }));
            }
            Err(e) => {
                return Err(format!("Failed to copy site to new destination: {}", e));
            }
        }
    }

    let mut site_updated = site.clone();
    site_updated.path = target_path.to_string_lossy().to_string();

    // Re-generate virtual host configuration pointing to the new root directory and reload Nginx
    let _ = state.services.generate_vhost_config(&site_updated, Some(&settings.active_php_version));
    state.services.reload_nginx();

    // Update sites state and persist configuration
    if let Some(s) = sites.iter_mut().find(|s| s.id == id) {
        *s = site_updated.clone();
    }
    state.config.save(&settings, &sites)?;

    Ok(site_updated)
}

#[tauri::command]
pub fn toggle_favorite(id: String, state: State<'_, AppState>) -> Result<bool, String> {
    let settings = state.settings.lock().map_err(|e| e.to_string())?;
    let mut sites = state.sites.lock().map_err(|e| e.to_string())?;

    if let Some(site) = sites.iter_mut().find(|s| s.id == id) {
        site.favorite = !site.favorite;
        let new_val = site.favorite;
        state.config.save(&settings, &sites)?;
        Ok(new_val)
    } else {
        Err("Site not found".to_string())
    }
}

#[tauri::command]
pub fn toggle_https(id: String, state: State<'_, AppState>) -> Result<bool, String> {
    let settings = state.settings.lock().map_err(|e| e.to_string())?;
    let mut sites = state.sites.lock().map_err(|e| e.to_string())?;

    if let Some(site) = sites.iter_mut().find(|s| s.id == id) {
        if !site.secured {
            state.ssl.generate_site_certificate(&site.domain)?;
            site.secured = true;
        } else {
            state.ssl.remove_site_certificate(&site.domain);
            site.secured = false;
        }

        let is_secured = site.secured;
        let site_clone = site.clone();
        state.config.save(&settings, &sites)?;
        let _ = state.services.generate_vhost_config(&site_clone, Some(&settings.active_php_version));
        state.services.reload_nginx();
        Ok(is_secured)
    } else {
        Err("Site not found".to_string())
    }
}

#[tauri::command]
pub fn set_site_php_version(id: String, version: String, state: State<'_, AppState>) -> Result<String, String> {
    let settings = state.settings.lock().map_err(|e| e.to_string())?;
    let mut sites = state.sites.lock().map_err(|e| e.to_string())?;

    if let Some(site) = sites.iter_mut().find(|s| s.id == id) {
        site.php_version = version.clone();
        let site_clone = site.clone();
        state.config.save(&settings, &sites)?;
        let _ = state.services.generate_vhost_config(&site_clone, Some(&settings.active_php_version));
        state.services.reload_nginx();
        Ok(version)
    } else {
        Err("Site not found".to_string())
    }
}

#[tauri::command]
pub fn open_in_browser(url: String) -> Result<(), String> {
    Command::new("open")
        .arg(&url)
        .spawn()
        .map_err(|e| format!("Failed to open URL in browser: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn open_in_ide(path: String, ide: Option<String>, state: State<'_, AppState>) -> Result<String, String> {
    let target_ide = match ide {
        Some(i) => i.to_lowercase(),
        None => {
            let settings = state.settings.lock().map_err(|e| e.to_string())?;
            match settings.default_ide {
                SupportedIde::Antigravity => "antigravity".to_string(),
                SupportedIde::Vscode => "code".to_string(),
                SupportedIde::Cursor => "cursor".to_string(),
                SupportedIde::Zed => "zed".to_string(),
            }
        }
    };

    if target_ide == "antigravity" || target_ide == "agy" {
        if let Ok(s) = Command::new("open").args(["-a", "Antigravity IDE", &path]).status() {
            if s.success() {
                return Ok("Opened in Antigravity IDE".to_string());
            }
        }
        if let Ok(s) = Command::new("open").args(["-a", "Antigravity", &path]).status() {
            if s.success() {
                return Ok("Opened in Antigravity".to_string());
            }
        }
    }

    let app_name = match target_ide.as_str() {
        "antigravity" | "agy" => "Antigravity IDE",
        "vscode" | "code" => "Visual Studio Code",
        "cursor" => "Cursor",
        "zed" => "Zed",
        _ => "Antigravity IDE",
    };

    let status = Command::new("open")
        .args(["-a", app_name, &path])
        .status();

    match status {
        Ok(s) if s.success() => Ok(format!("Opened in {}", app_name)),
        _ => {
            // Fallback to opening folder in Finder
            let _ = Command::new("open").arg(&path).status();
            Ok("Opened folder".to_string())
        }
    }
}

#[tauri::command]
pub fn open_in_terminal(path: String) -> Result<(), String> {
    // Try Ghostty, iTerm, or default Terminal
    let apps = ["Ghostty", "iTerm", "Terminal"];
    for app in apps {
        if let Ok(st) = Command::new("open").args(["-a", app, &path]).status() {
            if st.success() {
                return Ok(());
            }
        }
    }
    let _ = Command::new("open").args(["-a", "Terminal", &path]).status();
    Ok(())
}

#[tauri::command]
pub fn get_php_versions() -> Vec<PhpVersionInfo> {
    PhpManager::get_available_versions()
}

#[tauri::command]
pub fn set_active_php_version(version: String, state: State<'_, AppState>) -> Result<String, String> {
    let result = PhpManager::set_active_version(&version)?;
    let mut settings = state.settings.lock().map_err(|e| e.to_string())?;
    settings.active_php_version = version.clone();
    let sites = state.sites.lock().map_err(|e| e.to_string())?;
    state.config.save(&settings, &sites)?;
    let _ = state.services.sync_vhosts(&sites, Some(&version));
    Ok(result)
}

#[tauri::command]
pub fn get_php_ini(version: String) -> PhpIniSettings {
    PhpManager::get_ini_settings(&version)
}

#[tauri::command]
pub fn update_php_ini(version: String, settings: PhpIniSettings) -> Result<String, String> {
    PhpManager::update_ini_settings(&version, &settings)
}

#[tauri::command]
pub async fn check_php_patch_updates(version: String) -> Result<String, String> {
    PhpManager::check_patch_updates(&version).await
}

#[tauri::command]
pub async fn install_php_version(version: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        PhpManager::install_version(&version)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn uninstall_php_version(version: String, state: State<'_, AppState>) -> Result<String, String> {
    let ver = version.clone();
    let res = tokio::task::spawn_blocking(move || {
        PhpManager::uninstall_version(&ver)
    })
    .await
    .map_err(|e| e.to_string())??;

    if let Ok(mut settings) = state.settings.lock() {
        if settings.active_php_version.starts_with(&version) {
            let available = PhpManager::get_available_versions();
            if let Some(other) = available.iter().find(|v| v.is_installed && !v.version.starts_with(&version)) {
                settings.active_php_version = other.version.clone();
                let _ = PhpManager::set_active_version(&other.version);
            }
        }
    }
    Ok(res)
}

#[tauri::command]
pub fn get_node_versions() -> Vec<NodeVersionInfo> {
    NodeManager::get_available_versions()
}

#[tauri::command]
pub fn set_active_node_version(version: String, state: State<'_, AppState>) -> Result<String, String> {
    let mut settings = state.settings.lock().map_err(|e| e.to_string())?;
    settings.active_node_version = version.clone();
    let sites = state.sites.lock().map_err(|e| e.to_string())?;
    state.config.save(&settings, &sites)?;
    let _ = NodeManager::set_active_version(&version);
    Ok(format!("Active Node.js set to {}", version))
}

#[tauri::command]
pub async fn install_node_version(version: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        NodeManager::install_version(&version)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn uninstall_node_version(version: String, state: State<'_, AppState>) -> Result<String, String> {
    let ver = version.clone();
    let res = tokio::task::spawn_blocking(move || {
        NodeManager::uninstall_version(&ver)
    })
    .await
    .map_err(|e| e.to_string())??;

    if let Ok(mut settings) = state.settings.lock() {
        if settings.active_node_version.contains(&version) {
            let available = NodeManager::get_available_versions();
            if let Some(other) = available.iter().find(|v| v.is_installed && !v.version.contains(&version)) {
                settings.active_node_version = other.version.clone();
                let _ = NodeManager::set_active_version(&other.version);
            }
        }
    }
    Ok(res)
}

#[tauri::command]
pub fn get_package_managers() -> PackageManagersState {
    NodeManager::get_package_managers_state()
}

#[tauri::command]
pub fn toggle_package_manager(manager: String, enable: bool) -> Result<String, String> {
    NodeManager::toggle_package_manager(&manager, enable)
}

#[tauri::command]
pub fn get_mysql_status(state: State<'_, AppState>) -> MysqlStatus {
    state.mysql.get_status()
}

#[tauri::command]
pub fn start_mysql(state: State<'_, AppState>) -> Result<String, String> {
    state.mysql.start()
}

#[tauri::command]
pub fn stop_mysql(state: State<'_, AppState>) -> Result<String, String> {
    state.mysql.stop()
}

#[tauri::command]
pub fn restart_mysql(state: State<'_, AppState>) -> Result<String, String> {
    state.mysql.restart()
}

#[tauri::command]
pub fn list_databases(state: State<'_, AppState>) -> Vec<DatabaseInfo> {
    state.mysql.list_databases()
}

#[tauri::command]
pub fn create_database(name: String, collation: String, state: State<'_, AppState>) -> Result<String, String> {
    state.mysql.create_database(&name, &collation)
}

#[tauri::command]
pub fn drop_database(name: String, state: State<'_, AppState>) -> Result<String, String> {
    state.mysql.drop_database(&name)
}

#[tauri::command]
pub fn open_database_client(database: Option<String>, state: State<'_, AppState>) -> Result<String, String> {
    state.mysql.open_client(database.as_deref())
}

#[tauri::command]
pub fn setup_root_ca(state: State<'_, AppState>) -> Result<String, String> {
    let res = state.ssl.trust_root_ca_in_keychain()?;
    let mut settings = state.settings.lock().map_err(|e| e.to_string())?;
    settings.root_ca_installed = true;
    let sites = state.sites.lock().map_err(|e| e.to_string())?;
    state.config.save(&settings, &sites)?;
    Ok(res)
}

#[tauri::command]
pub fn setup_dns_resolver(state: State<'_, AppState>) -> Result<String, String> {
    let res = DnsResolverManager::configure_resolver()?;
    let mut settings = state.settings.lock().map_err(|e| e.to_string())?;
    settings.dns_resolver_configured = true;
    let sites = state.sites.lock().map_err(|e| e.to_string())?;
    state.config.save(&settings, &sites)?;
    Ok(res)
}

#[tauri::command]
pub fn get_service_health(state: State<'_, AppState>) -> ServiceHealth {
    state.services.get_service_health()
}

#[tauri::command]
pub fn start_all_services(state: State<'_, AppState>) -> Result<String, String> {
    state.services.start_all()
}

#[tauri::command]
pub fn stop_all_services(state: State<'_, AppState>) -> Result<String, String> {
    state.services.stop_all()
}

#[tauri::command]
pub async fn pick_folder() -> Result<Option<String>, String> {
    let result = tokio::task::spawn_blocking(|| {
        rfd::FileDialog::new()
            .set_title("Select PHP / Laravel Project Directory")
            .pick_folder()
            .map(|p| p.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
pub fn restart_all_services(state: State<'_, AppState>) -> Result<String, String> {
    state.services.restart_all()
}

#[tauri::command]
pub fn get_dependencies() -> Vec<DependencyItem> {
    DependencyManager::check_dependencies()
}

#[tauri::command]
pub async fn install_dependency(id: String, app: AppHandle) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        DependencyManager::install_dependency(&id, Some(&app))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn uninstall_dependency(id: String, app: AppHandle) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        DependencyManager::uninstall_dependency(&id, Some(&app))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn install_all_missing_dependencies(app: AppHandle) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        DependencyManager::install_all_missing(Some(&app))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn is_first_run_needed(state: State<'_, AppState>) -> bool {
    let settings = state.settings.lock().map(|s| s.clone()).unwrap_or_default();
    if !settings.initial_setup_completed {
        return true;
    }
    if !state.ssl.is_ca_trusted_in_system() {
        return true;
    }
    if !DnsResolverManager::is_resolver_configured() {
        return true;
    }
    DependencyManager::is_first_run_needed()
}

#[tauri::command]
pub async fn run_initial_setup(
    enable_passwordless_sudo: bool,
    default_ide: Option<String>,
    app: AppHandle,
) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let state = app.state::<AppState>();
        // Step 1: Ensure project directory ~/Spark exists
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/ruhulamin"));
        let spark_dir = home.join("Spark");
        let _ = std::fs::create_dir_all(&spark_dir);
        DependencyManager::emit_log(Some(&app), "dir", format!("Verified projects directory at {}", spark_dir.display()), false, true);

        // Step 2: Ensure Root CA and trust it
        DependencyManager::emit_log(Some(&app), "root_ca", "Generating and trusting Spark SSL Root CA in Keychain...".to_string(), false, false);
        state.ssl.ensure_root_ca()?;
        let ca_res = state.ssl.trust_root_ca_in_keychain()?;
        DependencyManager::emit_log(Some(&app), "root_ca", ca_res, false, true);

        // Step 3: Configure DNS Resolver
        DependencyManager::emit_log(Some(&app), "dns", "Configuring macOS /etc/resolver/test route...".to_string(), false, false);
        let dns_res = DnsResolverManager::configure_resolver()?;
        DependencyManager::emit_log(Some(&app), "dns", dns_res, false, true);

        // Step 4: Passwordless sudo (if requested)
        if enable_passwordless_sudo {
            DependencyManager::emit_log(Some(&app), "sudo", "Configuring passwordless administrator access...".to_string(), false, false);
            match crate::privilege::PrivilegeManager::enable_passwordless_sudo() {
                Ok(msg) => DependencyManager::emit_log(Some(&app), "sudo", msg, false, true),
                Err(err) => DependencyManager::emit_log(Some(&app), "sudo", format!("Optional authorization note: {}", err), false, false),
            }
        }

        // Step 5: Check and install any missing essential dependencies (nginx, dnsmasq, etc.)
        let deps = DependencyManager::check_dependencies();
        let missing: Vec<_> = deps.into_iter().filter(|d| d.is_required && !d.is_installed).collect();
        for dep in missing {
            if dep.id != "root_ca" && dep.id != "dns_resolver" {
                let _ = DependencyManager::install_dependency(&dep.id, Some(&app));
            }
        }

        // Step 6: Configure and restart services
        DependencyManager::emit_log(Some(&app), "services", "Configuring Spark Nginx virtual hosts, PHP-FPM & Dnsmasq...".to_string(), false, false);
        state.services.ensure_nginx_spark_include();

        if let Err(err) = DnsResolverManager::ensure_dnsmasq_configured_and_running() {
            DependencyManager::emit_log(Some(&app), "services", format!("Dnsmasq note: {}", err), false, false);
        }

        crate::php_manager::PhpManager::ensure_all_fpm_configured_and_running();
        let _ = Command::new("brew").args(["services", "restart", "nginx"]).output();
        state.services.ensure_nginx_running();

        let current_sites = state.sites.lock().map(|s| s.clone()).unwrap_or_default();
        let active_php = state.settings.lock().map(|s| s.active_php_version.clone()).unwrap_or_else(|_| "8.4".to_string());
        let _ = state.services.sync_vhosts(&current_sites, Some(&active_php));

        DependencyManager::emit_log(Some(&app), "services", "Background daemons active and ready".to_string(), false, true);

        // Step 7: Update and save settings
        if let Ok(mut settings) = state.settings.lock() {
            settings.initial_setup_completed = true;
            settings.root_ca_installed = state.ssl.is_ca_trusted_in_system();
            settings.dns_resolver_configured = DnsResolverManager::is_resolver_configured();
            settings.passwordless_sudo = crate::privilege::PrivilegeManager::is_passwordless_sudo_configured();
            if let Some(ide_str) = default_ide {
                match ide_str.to_lowercase().as_str() {
                    "antigravity" => settings.default_ide = SupportedIde::Antigravity,
                    "cursor" => settings.default_ide = SupportedIde::Cursor,
                    "vscode" => settings.default_ide = SupportedIde::Vscode,
                    "zed" => settings.default_ide = SupportedIde::Zed,
                    _ => {}
                }
            }
            if let Ok(sites) = state.sites.lock() {
                let _ = state.config.save(&settings, &sites);
            }
        }

        DependencyManager::emit_log(Some(&app), "complete", "Spark initial setup completed successfully!".to_string(), false, true);
        Ok("Initial setup completed successfully".to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn auto_configure_routing(state: State<'_, AppState>) -> Result<String, String> {
    let mut messages = Vec::new();

    // 1. Root CA
    match state.ssl.trust_root_ca_in_keychain() {
        Ok(m) => messages.push(format!("Root CA: {}", m)),
        Err(e) => return Err(format!("Root CA setup failed: {}", e)),
    }

    // 2. DNS Resolver
    match DnsResolverManager::configure_resolver() {
        Ok(m) => messages.push(format!("DNS Resolver: {}", m)),
        Err(e) => return Err(format!("DNS setup failed: {}", e)),
    }

    // Update settings
    if let Ok(mut settings) = state.settings.lock() {
        settings.root_ca_installed = state.ssl.is_ca_trusted_in_system();
        settings.dns_resolver_configured = DnsResolverManager::is_resolver_configured();
        if let Ok(sites) = state.sites.lock() {
            let _ = state.config.save(&settings, &sites);
        }
    }

    Ok(messages.join(" | "))
}

#[tauri::command]
pub fn check_passwordless_sudo() -> bool {
    crate::privilege::PrivilegeManager::is_passwordless_sudo_configured()
}

#[tauri::command]
pub fn enable_passwordless_sudo(state: State<'_, AppState>) -> Result<String, String> {
    let res = crate::privilege::PrivilegeManager::enable_passwordless_sudo()?;
    let mut settings = state.settings.lock().map_err(|e| e.to_string())?;
    settings.passwordless_sudo = true;
    let sites = state.sites.lock().map_err(|e| e.to_string())?;
    let _ = state.config.save(&settings, &sites);
    Ok(res)
}

#[tauri::command]
pub fn disable_passwordless_sudo(state: State<'_, AppState>) -> Result<String, String> {
    let res = crate::privilege::PrivilegeManager::disable_passwordless_sudo()?;
    let mut settings = state.settings.lock().map_err(|e| e.to_string())?;
    settings.passwordless_sudo = false;
    let sites = state.sites.lock().map_err(|e| e.to_string())?;
    let _ = state.config.save(&settings, &sites);
    Ok(res)
}
