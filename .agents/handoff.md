# Spark Engineering Handoff Document

> **Application**: Spark — Native macOS Local PHP & Laravel Development Environment  
> **Status**: **ALPHA / ACTIVE DEVELOPMENT (v0.1.1)**  
> **Platform**: macOS 12+ (Apple Silicon & Intel)  
> **Target Audience**: Incoming AI Coding Agents & Engineering Collaborators  

---

## 1. Current Feature Status

- **Architecture**: Native desktop application built on **Tauri v2 (v2.12.7)**, **Rust 2021**, and **React 19** with Tailwind CSS v3.4.
- **Tauri IPC Bridge**: 41 commands registered in [lib.rs](file:///Volumes/Backup/Website/Spark/src-tauri/src/lib.rs) and implemented in [commands.rs](file:///Volumes/Backup/Website/Spark/src-tauri/src/commands.rs):
  - Application state: `get_app_version`, `get_app_state`, `save_settings`, `scan_project_paths`, `pick_folder`.
  - Site management: `create_site`, `link_site`, `unlink_site`, `delete_site`, `toggle_favorite`, `toggle_https`, `set_site_php_version`, `open_in_browser`, `open_in_ide`, `open_in_terminal`.
  - PHP runtimes: `get_php_versions`, `set_active_php_version`, `install_php_version`, `uninstall_php_version`, `get_php_ini`, `update_php_ini`, `check_php_patch_updates`.
  - Node.js & tools: `get_node_versions`, `set_active_node_version`, `install_node_version`, `uninstall_node_version`, `get_package_managers`, `toggle_package_manager`.
  - MySQL database: `get_mysql_status`, `start_mysql`, `stop_mysql`, `restart_mysql`, `list_databases`, `create_database`, `drop_database`, `open_database_client`.
  - SSL & DNS: `setup_root_ca`, `setup_dns_resolver`.
  - Services & Health: `get_service_health`, `start_all_services`, `stop_all_services`, `restart_all_services`.
  - Dependencies & Onboarding: `get_dependencies`, `install_dependency`, `uninstall_dependency`, `install_all_missing_dependencies`, `is_first_run_needed`.
  - Privileges: `check_passwordless_sudo`, `enable_passwordless_sudo`, `disable_passwordless_sudo`.
- **System Integration**:
  - macOS local DNS resolution via `/etc/resolver/test` pointing to `127.0.0.1:53` (Dnsmasq).
  - Internal Root CA (`rcgen`) automatically trusted in `/Library/Keychains/System.keychain`.
  - Dynamic Nginx virtual host generator with per-site PHP-FPM socket routing in `~/.config/spark/nginx/`.
  - Persistent menu bar status item (`tray_icon.png`) with background service controls.
  - Window close prevention (`api.prevent_close(); window.hide();`) and Dock re-opening (`RunEvent::Reopen`).

---

## 2. Recent Completed Milestones

### 1. Menu Bar Tray & Window Lifecycle Stabilization
- Generated complete multi-resolution icon bundle (`icon.icns`, `tray_icon.png`, `icon.png`, `32x32.png` etc.) using `generate_icon.py` and `export_all_icons.py`.
- Fixed macOS menu bar interaction: resolved conflict between `.show_menu_on_left_click(true)` and single-click window stealing. Left-click now presents the native macOS status dropdown cleanly, while double-click or the "Open Spark" menu item brings the window forward.
- Resolved service action race conditions: tray menu items (`start`, `stop`, `restart`) now delegate cleanly via `tray-action` events to the unified frontend handler, preventing concurrent duplicate service execution.
- Added macOS `RunEvent::Reopen` handler and Cocoa `activateIgnoringOtherApps_` window focus helper so clicking Spark in the Dock smoothly brings hidden windows to the foreground.

### 2. Multi-PHP Runtime & Configuration Management
- Automatic detection of Homebrew PHP installations (`php@8.1` through `php@8.5`).
- Fast socket mapping (`php-fpm-{version}.sock`) for instantaneous per-site PHP version assignment.
- Built-in `php.ini` editor parsing and modifying memory limits, upload sizes, and execution timeouts.

### 3. Integrated MySQL & Database Manager
- Live port `3306` monitoring and daemon lifecycle controls (Start/Stop/Restart).
- Database inspector showing table counts, size in MB/GB, and collation.
- One-click launcher for TablePlus and Sequel Ace GUI tools.

### 4. 1-Click Laravel Starter Kit Scaffolder
- Live preview of `.test` domain as user types the project name.
- Preset selector for Clean, React (Breeze/Inertia), Vue, Svelte, and Livewire.
- Streaming terminal logs via `scaffold-progress` events directly into a responsive UI progress modal.

---

## 3. High-Priority Next Steps / Backlog

1. **Standalone Portable Binaries**:
   - Provide pre-compiled, bundled PHP-FPM and Nginx binaries inside the Spark distribution to eliminate the mandatory Homebrew dependency for non-technical users.
2. **Mailpit Local Email Catcher Integration**:
   - Add built-in Mailpit daemon management on port `1025` (SMTP) and `8025` (Web UI) for zero-configuration local email testing.
3. **Redis & Cache Server Management**:
   - Add controls for local Redis (`6379`) and Meilisearch daemon instances.
4. **Git Clone Project Modal Completion**:
   - Connect the existing `CloneRepoModal.tsx` frontend component to a dedicated backend git clone routine with automatic site linking.
5. **Xdebug One-Click Toggle**:
   - Add inline toggle on SiteRow to enable/disable Xdebug for individual development sessions.

---

## 4. Operational Instructions for Agents

1. **Strictly Non-Herd**:
   - Never execute `herd` CLI commands. Spark is designed to completely replace and operate independently of Laravel Herd.
2. **Command Verification**:
   - Verify Rust compilation: `cargo check --manifest-path src-tauri/Cargo.toml`.
   - Verify desktop app launch: `npm run tauri:dev`.
   - Build production release: `npm run tauri:build`.
3. **Configuration Storage**:
   - All runtime configs belong in `~/.config/spark/`. Do not pollute project root or system directories.
