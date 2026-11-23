<p align="center">
  <img src="public/spark.svg" alt="Spark Logo" width="96" height="96" />
</p>

<h1 align="center">Spark</h1>

<p align="center">
  <strong>Native macOS Local PHP & Laravel Development Environment</strong>
</p>

<p align="center">
  <a href="https://apple.com"><img src="https://img.shields.io/badge/Platform-macOS%2012%2B%20%7C%20Apple%20Silicon%20%26%20Intel-000000?style=for-the-badge&logo=apple&logoColor=white" alt="Platform macOS" /></a>
  <a href="https://tauri.app"><img src="https://img.shields.io/badge/Tauri-v2.0-24C8DB?style=for-the-badge&logo=tauri&logoColor=white" alt="Tauri v2" /></a>
  <a href="https://www.rust-lang.org"><img src="https://img.shields.io/badge/Rust-2021%20Edition-DEA584?style=for-the-badge&logo=rust&logoColor=black" alt="Rust" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19.1-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind-v3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
  <img src="https://img.shields.io/badge/Version-v0.1.0-emerald?style=for-the-badge" alt="Version 0.1.0" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License MIT" />
</p>

<p align="center">
  A lightning-fast, native macOS desktop application built with <strong>Rust</strong>, <strong>Tauri v2</strong>, and <strong>React 19</strong>. Spark provides instant zero-config <code>.test</code> local domain routing, multi-version PHP & MySQL management, automated Root CA & local HTTPS certificates, and streamlined Laravel starter kit scaffolding — all without Docker or Electron resource overhead.
</p>

---

## ✨ Features

- ⚡ **Ultra-Fast & Lightweight**: Built with native Rust and Tauri v2 (~7.2 MB app bundle, <30ms startup time, minimal RAM footprint).
- 🎨 **Authentic macOS Design**: Native frameless translucency, customized traffic light integration, dark mode aesthetics, and SF-styled layout.
- 🚀 **1-Click Laravel Scaffolding**:
  - Live `.test` domain preview as you type the application name.
  - Interactive starter kit selector:
    - **Clean** (Standard modern Laravel)
    - **React** (Laravel Breeze / Inertia.js with React & TypeScript)
    - **Vue** (Laravel Breeze / Inertia.js with Vue 3)
    - **Svelte** (Laravel Breeze / Inertia.js with Svelte 5)
    - **Livewire** (Laravel Livewire 3 with Alpine.js)
  - Real-time terminal progress modal monitoring environment creation, dependencies, database provisioning, and SSL generation.
- 🌐 **Zero-Config `.test` Domains**: Automatic macOS local DNS resolution via `/etc/resolver/test` pointing directly to `127.0.0.1`.
- 🔒 **Automated Local HTTPS & Root CA**:
  - Pure Rust Root CA generation (`rcgen`) automatically trusted in the macOS System Keychain.
  - One-click TLS/SSL toggle generating per-site certificates with automatic Nginx vhost reloading.
- 🐘 **Multi-PHP Runtime Switcher**:
  - Seamlessly detect and switch across PHP versions (8.1, 8.2, 8.3, 8.4, 8.5).
  - Built-in `php.ini` editor for quick adjustment of `memory_limit`, `upload_max_filesize`, and execution timeouts.
- 🗄 **MySQL & Database Management**:
  - Integrated MySQL service controls (Start, Stop, Restart) on port `3306`.
  - In-app database management: create databases with collation (`utf8mb4_unicode_ci`), inspect table counts and sizes, or drop unused databases.
  - One-click connection strings and direct launchers for TablePlus and Sequel Ace.
- 📦 **Node.js & Package Managers**:
  - Detect installed Node.js versions (v18, v20 LTS, v22 LTS, v24).
  - Quick toggles for package managers (`npm`, `pnpm`, `yarn`).
- 🖥 **Native macOS Menu Bar Tray**:
  - Status bar tray menu showing service health.
  - Fast toggles to Start All, Stop All, Restart All, and Open Spark.
- 🔑 **Passwordless Sudo Configuration**:
  - Optional helper to configure passwordless sudo for local Nginx and DNS management without repetitive password prompts.

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────────────┐
│               Spark UI (React 19 + Vite)              │
│   • Frameless macOS Window    • Live Site Scaffolding  │
│   • Service Health Badges     • Settings & Runtimes    │
└───────────────────────────┬────────────────────────────┘
                            │  Tauri v2 IPC (invoke / emit)
┌───────────────────────────▼────────────────────────────┐
│              Spark Core (Rust Backend)                 │
│   • commands.rs (Tauri API)   • scaffolding.rs         │
│   • ssl.rs (rcgen Root CA)    • mysql_manager.rs       │
│   • dns.rs (macOS Resolver)   • php_manager.rs         │
│   • services.rs (VHost Sync)  • tray.rs (Native Tray)  │
└───────────────────────────┬────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
┌────────────────────────┐             ┌────────────────────────┐
│  macOS Networking & OS │             │ Local Runtimes Engine  │
│  • /etc/resolver/test  │             │ • PHP-FPM (8.1 - 8.5)  │
│  • macOS Keychain CA   │             │ • Nginx Web Server     │
│  • Ports 80 & 443      │             │ • MySQL (Port 3306)    │
└────────────────────────┘             └────────────────────────┘
```

---

## 💻 System Requirements

- **macOS**: macOS 12.0 (Monterey) or later (macOS Sonoma 14+ / Sequoia 15+ recommended).
- **Architecture**: Apple Silicon (M1/M2/M3/M4) or Intel (x86_64).
- **Node.js**: v20 LTS or v22 LTS ([Node.js](https://nodejs.org/)).
- **Rust Toolchain**: Latest stable Rust ([rustup.rs](https://rustup.rs/)):
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```
- **PHP & Composer**: PHP 8.2+ and Composer installed (via Homebrew or standalone).
- **Xcode Command Line Tools**:
  ```bash
  xcode-select --install
  ```

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/spark.git
cd spark
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Run in Development Mode

Launch the Tauri desktop app with hot-reloading for both React and Rust:

```bash
npm run tauri:dev
```

> **UI-Only Mode**: To preview and build frontend React components in your browser without launching the native desktop wrapper, run `npm run dev` and navigate to `http://localhost:1420`.

---

## 📦 Building Production `.app`

To compile an optimized, native release bundle:

```bash
npm run tauri:build
```

### Output Location:
- **Application Bundle**:
  ```
  src-tauri/target/release/bundle/macos/Spark.app
  ```

### Install to Applications:
```bash
cp -R src-tauri/target/release/bundle/macos/Spark.app /Applications/
```

> **Gatekeeper Note**: If moving `Spark.app` on macOS, remove any quarantine flags with:
> ```bash
> xattr -cr /Applications/Spark.app
> ```

---

## ⌨️ Shortcuts & Navigation

| Shortcut | Action |
| :--- | :--- |
| `⌘ K` | Quick search across all sites |
| `⌘ ,` | Open Preferences & Settings |
| `⌘ N` | Create a new Laravel application |
| `⌘ O` | Open selected site in default browser |
| `⌘ Q` | Quit Spark |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check the [issues page](https://github.com/your-username/spark/issues) to report bugs or request new capabilities.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
