# ⚡ Spark v0.1.1 — Release (macOS)

> **Spark** is a lightning-fast, native macOS desktop local development environment manager for PHP and Laravel — engineered as a modern, lightweight alternative to Laravel Herd with zero Docker or Electron overhead.

---

## 🌟 Highlights & What's New

### ⚡ Blazing Fast Native Architecture
- **Pure Rust & Tauri v2**: Built with Rust 2021 and React 19 for instantaneous launch times (<30ms) and minimal memory footprint (<40 MB idle RAM).
- **Ultra-Compact Bundle**: The complete macOS `.app` bundle is only **7.32 MiB**.
- **Authentic macOS Design**: Frameless dark obsidian canvas (`#16161a`), custom traffic light integration, translucent modal sheets, and keyboard-first navigation (`⌘K`, `⌘,`, `⌘N`).

---

### 🌐 Instant Zero-Config `.test` Routing
- **macOS Native Resolver**: Automatically configures `/etc/resolver/test` pointing directly to local Dnsmasq on `127.0.0.1:53`.
- **Zero `/etc/hosts` Pollution**: Every parked and linked project instantly resolves on `.test` without modifying your system hosts file or requiring constant sudo prompts.
- **Project Folder Parking**: Register parent directories (e.g. `~/Sites`, `~/Projects`) for instant automatic site discovery and framework detection (Laravel, React, Vue, Svelte, Livewire, PHP, Static).

---

### 🔒 Automated Local HTTPS & Pure-Rust Root CA
- **Built-in Certificate Authority**: Pure-Rust X.509 CA generation powered by `rcgen` (`ca.crt` & `ca.key`).
- **macOS System Keychain Trust**: Automatically integrates into `/Library/Keychains/System.keychain` for trusted green padlocks in Safari, Chrome, Edge, and Firefox.
- **One-Click TLS Toggles**: Mint per-site SAN SSL certificates on demand with zero-downtime Nginx vhost reloading.

---

### 🐘 Multi-Version PHP Runtime Switcher
- **Multi-PHP Support**: Seamlessly detect, run, and switch across PHP versions: **8.1**, **8.2**, **8.3**, **8.4**, and **8.5**.
- **Per-Site Assignment**: Assign different PHP versions to individual `.test` sites via FastCGI UNIX domain sockets.
- **Integrated `php.ini` Editor**: Effortlessly inspect and modify runtime directives (`memory_limit`, `upload_max_filesize`, `post_max_size`, `max_execution_time`) directly from the UI.

---

### 🗄️ Integrated MySQL & Database Management
- **MySQL Daemon Controls**: Start, stop, and restart local MySQL on port `3306` with live uptime indicators.
- **Database Inspector**: View database lists, table counts, sizes (MB/GB), and collations (`utf8mb4_unicode_ci`).
- **GUI Tool Launchers**: One-click connection strings and direct protocol launchers for **TablePlus** and **Sequel Ace**.

---

### 🚀 1-Click Laravel Starter Kit Scaffolder
- **Live `.test` Domain Preview**: Domain previews dynamically as you type your application name.
- **Starter Kit Selector**:
  - **Clean** (Standard modern Laravel)
  - **React** (Laravel Breeze / Inertia.js with React & TypeScript)
  - **Vue** (Laravel Breeze / Inertia.js with Vue 3)
  - **Svelte** (Laravel Breeze / Inertia.js with Svelte 5)
  - **Livewire** (Laravel Livewire 3 with Alpine.js)
- **Live Terminal Progress**: Watch real-time streaming output in an embedded dark terminal modal as composer dependencies, database provisioning, and SSL generation complete.

---

### 🖥️ Native macOS Menu Bar Status Item (Tray)
- **Dynamic Monochrome Template Icon**: Automatically adapts between Dark Mode (white), Light Mode (black), and active blue selection states according to Apple Human Interface Guidelines.
- **Service Controls**: One-click shortcuts to Restart Server & Services, Stop Services, Start Services, and Open Spark.
- **Seamless Window Lifecycle**: Closing the window hides Spark to the menu bar without interrupting your web sites or background daemons. Clicking the Spark Dock icon or menu bar item brings the window forward smoothly.

---

## 💻 System Requirements

- **Operating System**: macOS 12.0 (Monterey) or later (macOS Sonoma 14+ / macOS Sequoia 15+ recommended)
- **Architecture**: Apple Silicon (`arm64`) and Intel (`x86_64`)
- **Prerequisites**: Homebrew installed with PHP and Nginx (guided onboarding wizard included on first launch)

---

## 📥 Installation

### Option 1: Direct Download
1. Download the **`Spark.app.zip`** asset from the release downloads below.
2. Unzip and drag **`Spark.app`** into your `/Applications` folder.
3. Open Terminal and remove the quarantine flag (standard for open-source macOS software):
   ```bash
   xattr -cr /Applications/Spark.app
   ```
4. Double-click **`Spark.app`** to launch!

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Description |
| :--- | :--- |
| `⌘ K` | Quick search and filter across all parked sites |
| `⌘ ,` | Open Preferences & Settings |
| `⌘ N` | Open 1-Click Laravel Scaffolder |
| `Escape` | Close active modal or dismiss search |
| `⌘ Q` | Quit Spark |

---

## 📄 License & Verification

- **License**: MIT
- **Release Tag**: `v0.1.1`
- **Application Bundle**: `Spark.app` (Mach-O 64-bit arm64, 7.32 MiB)
