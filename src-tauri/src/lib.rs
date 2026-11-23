pub mod commands;
pub mod config;
pub mod dependencies;
pub mod dns;
pub mod models;
pub mod mysql_manager;
pub mod node_manager;
pub mod php_manager;
pub mod privilege;
pub mod scaffolding;
pub mod services;
pub mod ssl;
pub mod tray;

use std::sync::Mutex;
use commands::*;
use config::ConfigStore;
use mysql_manager::MysqlManager;
use services::ServiceManager;
use ssl::SslManager;

#[cfg(target_os = "macos")]
#[allow(deprecated)]
fn set_dock_icon() {
    use cocoa::appkit::NSApplication;
    use cocoa::base::nil;
    use cocoa::foundation::NSData;

    unsafe {
        let app = cocoa::appkit::NSApp();
        let icon_bytes = include_bytes!("../icons/icon.png");
        let data = NSData::dataWithBytes_length_(
            nil,
            icon_bytes.as_ptr() as *const std::ffi::c_void,
            icon_bytes.len() as u64,
        );
        let image: cocoa::base::id = cocoa::appkit::NSImage::initWithData_(cocoa::appkit::NSImage::alloc(nil), data);
        if image != nil {
            app.setApplicationIconImage_(image);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let config_store = ConfigStore::new();
    let ssl_manager = SslManager::new();
    let mysql_manager = MysqlManager::new();
    let service_manager = ServiceManager::new();

    let (mut initial_settings, initial_sites) = config_store.load();
    let _ = ssl_manager.ensure_root_ca();

    let scanned_sites = config_store.scan_project_paths(
        &initial_settings.project_paths,
        &initial_sites,
        &ssl_manager,
    );

    initial_settings.root_ca_installed = ssl_manager.is_ca_trusted_in_system();
    initial_settings.dns_resolver_configured = dns::DnsResolverManager::is_resolver_configured();
    initial_settings.passwordless_sudo = privilege::PrivilegeManager::is_passwordless_sudo_configured();

    let _ = service_manager.sync_vhosts(&scanned_sites, Some(&initial_settings.active_php_version));

    let app_state = AppState {
        config: config_store,
        ssl: ssl_manager,
        mysql: mysql_manager,
        services: service_manager,
        sites: Mutex::new(scanned_sites),
        settings: Mutex::new(initial_settings),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(app_state)
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                set_dock_icon();
            }
            let handle = app.handle();
            if let Err(err) = tray::create_tray(handle) {
                eprintln!("[Spark] Failed to create system tray: {err}");
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            get_app_state,
            save_settings,
            scan_project_paths,
            pick_folder,
            create_site,
            link_site,
            unlink_site,
            delete_site,
            toggle_favorite,
            toggle_https,
            set_site_php_version,
            open_in_browser,
            open_in_ide,
            open_in_terminal,
            get_php_versions,
            set_active_php_version,
            install_php_version,
            uninstall_php_version,
            get_php_ini,
            update_php_ini,
            check_php_patch_updates,
            get_node_versions,
            set_active_node_version,
            install_node_version,
            uninstall_node_version,
            get_package_managers,
            toggle_package_manager,
            get_mysql_status,
            start_mysql,
            stop_mysql,
            restart_mysql,
            list_databases,
            create_database,
            drop_database,
            open_database_client,
            setup_root_ca,
            setup_dns_resolver,
            get_service_health,
            start_all_services,
            stop_all_services,
            restart_all_services,
            get_dependencies,
            install_dependency,
            uninstall_dependency,
            install_all_missing_dependencies,
            is_first_run_needed,
            check_passwordless_sudo,
            enable_passwordless_sudo,
            disable_passwordless_sudo,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Spark application")
        .run(|app_handle, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = event {
                tray::show_main_window(app_handle);
            }
        });
}
