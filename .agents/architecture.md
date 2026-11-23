# Spark System Architecture

## 1. Project Overview

### What the Application Does
**Spark** is a high-performance, native macOS desktop application designed as a modern local development environment manager for PHP and Laravel developers. Operating as a fast, native alternative to Laravel Herd, Spark provides:
1. **Instant Zero-Config `.test` Routing**: Automatic local DNS resolution via macOS `/etc/resolver/test` pointing directly to `127.0.0.1`.
2. **Multi-Version PHP Runtime Management**: Seamless detection, switching, Homebrew installation, and `php.ini` configuration across PHP versions 8.1, 8.2, 8.3, 8.4, and 8.5.
3. **Automated Local HTTPS & Pure-Rust Root CA**: Built-in Root CA generation (`rcgen`) automatically trusted in the macOS System Keychain with one-click TLS certificate provisioning.
4. **Integrated MySQL & Database Management**: Control MySQL server daemon (port 3306), inspect databases, create/drop databases with collation (`utf8mb4_unicode_ci`), and launch GUI clients (TablePlus, Sequel Ace).
5. **1-Click Laravel Starter Kit Scaffolding**: Interactive project creation with real-time terminal progress streaming for Clean, React (Breeze/Inertia), Vue, Svelte, and Livewire starter kits.
6. **Native macOS System Integration**: Native frameless window translucency, custom traffic light positioning, menu bar status item (tray), and background service monitoring.

### Target Users
- PHP and Laravel software engineers on macOS requiring instantaneous project serving without Docker overhead or Electron bloat.
- Full-stack web developers needing per-site PHP version switching, instant local HTTPS certificates, and seamless database management.

---

## 2. Technology Stack

### Desktop Core & Backend (Rust & Tauri v2)
- **Rust Edition**: 2021 (`rustc` 1.80+)
- **Application Framework**: Tauri v2 (`tauri: 2.12.7`, `tauri-build: 2`)
- **Tauri Plugins**:
  - `tauri-plugin-opener: 2` (Launch URLs and system file paths in default browser/finder)
  - `tauri-plugin-dialog: 2` (Native folder and file selection dialogs)
  - `tauri-plugin-shell: 2` (Spawning system sub-processes with piped I/O)
  - `tauri-plugin-process: 2` (Process control and lifecycle management)
- **Cryptography & SSL**: `rcgen: 0.13` (Zero-dependency pure-Rust X.509 certificate and private key generation)
- **Asynchronous Runtime**: `tokio: 1` with `features = ["full"]`
- **Serialization**: `serde: 1` with `derive`, `serde_json: 1`
- **Date & Time**: `chrono: 0.4`, `time: 0.3`
- **Native macOS Bindings**: `cocoa: 0.26`, `objc: 0.2`, `objc2: 0.6` (Dock icon setup and window key-activation)
- **File System & Paths**: `dirs: 5.0`, `rfd: 0.18`

### User Interface & Frontend
- **Framework**: React 19 (`react: ^19.1.0`, `react-dom: ^19.1.0`)
- **Language**: TypeScript (`typescript: ~6.0.3`)
- **Bundler & Dev Server**: Vite 8 (`vite: ^8.0.16`, `@vitejs/plugin-react: ^6.0.2`)
- **Styling**: Tailwind CSS v3.4 (`tailwindcss: ^3.4.17`, `autoprefixer: ^10.4.27`, `postcss: ^8.5.8`)
- **Vector Icons**: Lucide React (`lucide-react: ^1.16.0`)
- **Utility Classes**: `clsx: ^2.1.1`, `tailwind-merge: ^3.5.0`

### Local Runtimes & System Services Managed
- **Web Server**: Nginx (reverse proxy, static file server, and FastCGI gateway on ports 80 and 443)
- **PHP Engines**: PHP-FPM daemons (PHP 8.1, 8.2, 8.3, 8.4, 8.5 via UNIX domain sockets `/opt/homebrew/var/run/php*.sock` or `/tmp/php*.sock`)
- **Database Server**: MySQL Server 8.0+ / 9.0 (port 3306)
- **DNS Server**: Dnsmasq daemon on `127.0.0.1:53` coupled with `/etc/resolver/test`
- **JavaScript Runtimes**: Node.js (v18, v20 LTS, v22 LTS, v24) with `npm`, `pnpm`, and `yarn` package managers

---

## 3. High-Level Architecture Diagram

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   Spark Frontend (React 19 + TypeScript)              │
│  ┌───────────────────────┐  ┌────────────────┐  ┌───────────────────┐  │
│  │   Header & Search     │  │ SiteList / Rows│  │  Preferences View │  │
│  │   (Traffic Lights)    │  │ (Domains, SSL) │  │  (PHP, DB, Node)  │  │
│  └───────────────────────┘  └────────────────┘  └───────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │   Modals: Scaffolder, Dependency Onboarding, Link Folder, Clone  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Tauri v2 IPC
                                    │ (41 Commands + Events)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Spark Core Engine (Rust Backend)                    │
│                                                                        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────────────────┐  │
│  │   ConfigStore   │ │   SslManager    │ │   DnsResolverManager     │  │
│  │ (~/.config/spark│ │ (rcgen Root CA) │ │ (/etc/resolver/test)     │  │
│  └─────────────────┘ └─────────────────┘ └──────────────────────────┘  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────────────────┐  │
│  │ ServiceManager  │ │   PhpManager    │ │      MysqlManager        │  │
│  │ (Nginx / Dns)   │ │ (FPM Switcher)  │ │ (DB lifecycle & queries) │  │
│  └─────────────────┘ └─────────────────┘ └──────────────────────────┘  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────────────────┐  │
│  │   Scaffolding   │ │  NodeManager    │ │      Tray & Lifecycle    │  │
│  │ (Laravel Gen)   │ │ (Runtimes/PMs)  │ │ (Menu Bar & Dock Reopen) │  │
│  └─────────────────┘ └─────────────────┘ └──────────────────────────┘  │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
        ┌───────────▼──────────┐        ┌───────────▼────────────┐
        │  macOS System Layer  │        │   Managed Runtimes     │
        │ • /etc/resolver/test │        │ • Nginx (Ports 80/443) │
        │ • macOS Keychain     │        │ • PHP-FPM (Unix Socks) │
        │ • sudoers.d/spark    │        │ • MySQL (Port 3306)    │
        │ • NSStatusItem Tray  │        │ • Composer & Artisan   │
        └──────────────────────┘        └────────────────────────┘
```

---

## 4. Core Subsystems & Managers

### 4.1 ConfigStore (`src-tauri/src/config.rs`)
- **Primary Storage**: `~/.config/spark/settings.json` (user preferences) and `~/.config/spark/sites.json` (parked and manually linked sites).
- **Project Path Scanner**: Scans registered parent folders (e.g. `~/Sites`, `~/Projects`), discovers child directories, auto-detects framework (`laravel`, `react`, `vue`, `svelte`, `livewire`, `php`, `static`), checks `public/` web roots, and provisions `.test` domain names.

### 4.2 SslManager (`src-tauri/src/ssl.rs`)
- **Root CA Generation**: Generates an internal X.509 Certificate Authority certificate (`ca.crt` and `ca.key`) inside `~/.config/spark/ssl/` using pure Rust (`rcgen`).
- **Keychain Trust**: Installs the Root CA into the macOS System Keychain using `/usr/bin/security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain`.
- **Per-Site Certificates**: Dynamically issues TLS SAN certificates (`domain.crt`, `domain.key`) valid for `domain.test` and `*.domain.test`.
- **Fast Reload**: Triggers zero-downtime Nginx reload to apply newly secured vhosts.

### 4.3 DnsResolverManager (`src-tauri/src/dns.rs`)
- **macOS Native Resolver**: Writes `/etc/resolver/test` with:
  ```text
  nameserver 127.0.0.1
  port 53
  ```
- **Zero `/etc/hosts` Pollution**: Avoids modifying `/etc/hosts`. All `.test` queries are natively routed by macOS mDNSResponder to local Dnsmasq on port 53.

### 4.4 ServiceManager (`src-tauri/src/services.rs`)
- **Nginx VHost Engine**: Dynamically writes Nginx virtual host configurations into `~/.config/spark/nginx/` for all scanned and linked sites.
- **FastCGI Socket Resolution**: Points each site to its configured PHP-FPM version socket (`/opt/homebrew/var/run/php-fpm-{version}.sock`).
- **Health Probing**: Real-time health monitoring of Nginx, PHP, MySQL, and DNS daemons.

### 4.5 PhpManager (`src-tauri/src/php_manager.rs`)
- **Version Detection**: Detects installed Homebrew PHP formulas (`php@8.1`, `php@8.2`, `php@8.3`, `php@8.4`, `php@8.5`).
- **FPM Socket Management**: Starts, stops, and links active PHP-FPM service daemons.
- **`php.ini` Editor**: Parses and updates core runtime directives (`memory_limit`, `upload_max_filesize`, `post_max_size`, `max_execution_time`).

### 4.6 MysqlManager (`src-tauri/src/mysql_manager.rs`)
- **Daemon Lifecycle**: Controls local MySQL service (Start, Stop, Restart) on port 3306.
- **Database Inspector**: Queries databases, table counts, sizes in bytes, and collation.
- **Client Launchers**: One-click deep-link launchers for TablePlus (`mysql://root@127.0.0.1:3306/{database}`) and Sequel Ace.

### 4.7 ScaffoldingManager (`src-tauri/src/scaffolding.rs`)
- **Laravel Project Creator**: Runs `composer create-project laravel/laravel` or `laravel new`.
- **Starter Kit Options**: Supports `clean`, `react`, `vue`, `svelte`, and `livewire`.
- **Terminal Progress Streaming**: Emits IPC events (`scaffold-progress`) with real-time CLI output lines, step completion, and error states.

### 4.8 Tray & Window Lifecycle (`src-tauri/src/tray.rs` & `src-tauri/src/lib.rs`)
- **Menu Bar Status Item**: Native NSStatusItem with custom icon (`tray_icon.png`).
- **Window Close Interception**: Intercepts `WindowEvent::CloseRequested` to prevent window destruction and hide the window instead (`api.prevent_close(); window.hide();`).
- **Dock Reopening**: Listens to macOS `RunEvent::Reopen` to unminimize and focus the window when clicked in the Dock.
- **Unified Action Delegation**: Menu items emit `tray-action` to the frontend to perform unified service actions without race conditions.

---

## 5. Security & Privilege Architecture

- **Passwordless Sudo**: Optional configuration of `/etc/sudoers.d/spark` allowing Spark to restart Nginx, bind port 80/443, and manage `/etc/resolver/test` without interactive password prompts.
- **System Boundaries**: Spark strictly scopes its filesystem operations to:
  1. `~/.config/spark/`
  2. The user's explicitly parked project directories (`initial_settings.project_paths`)
  3. Standard macOS Homebrew paths (`/opt/homebrew` or `/usr/local`)
  4. System resolver `/etc/resolver/test`
