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
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind-v3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://github.com/followruhulamin/Spark/releases"><img src="https://img.shields.io/badge/Version-v0.2.1-10B981?style=for-the-badge" alt="Version 0.2.1" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-3B82F6?style=for-the-badge" alt="License MIT" /></a>
</p>

<p align="center">
  A lightning-fast, native macOS desktop application engineered with <strong>Rust</strong>, <strong>Tauri v2</strong>, and <strong>React 19</strong>. Spark delivers zero-configuration <code>.test</code> local domain routing, multi-version PHP & MySQL management, automated Root CA & local HTTPS certificates, and streamlined Laravel starter kit scaffolding — with zero Docker or Electron overhead.
</p>

---

## ✨ Features

- ⚡ **Native Performance**: Built with native Rust and Tauri v2 for instant startup, sub-millisecond IPC response, and minimal RAM footprint.
- 🎨 **Authentic macOS Design**: Native frameless translucency, customized traffic light integration, dark mode aesthetics, and SF Pro typography.
- 🚀 **1-Click Laravel Scaffolding**:
  - Live `.test` domain preview as you type your project name.
  - Interactive starter kit selector:
    - **Clean** (Standard modern Laravel)
    - **React** (Laravel Breeze / Inertia.js with React & TypeScript)
    - **Vue** (Laravel Breeze / Inertia.js with Vue 3)
    - **Svelte** (Laravel Breeze / Inertia.js with Svelte 5)
    - **Livewire** (Laravel Livewire 3 with Alpine.js)
  - Real-time streaming terminal modal tracking directory creation, Composer dependencies, database provisioning, and SSL generation.
- 🌐 **Zero-Config `.test` Domains**: Automatic macOS local DNS resolution via `/etc/resolver/test` pointing directly to `127.0.0.1`.
- 🔒 **Automated Local HTTPS & Root CA**:
  - Pure Rust Root CA generation (`rcgen`) automatically trusted in the macOS System Keychain.
  - One-click TLS/SSL toggle generating per-site certificates with automatic Nginx vhost reloading.
- 🐘 **Multi-PHP Runtime Switcher**:
  - Seamlessly detect and switch across PHP versions (8.1, 8.2, 8.3, 8.4, 8.5).
  - Built-in `php.ini` editor for quick adjustment of `memory_limit`, `upload_max_filesize`, and timeouts.
- 🗄️ **MySQL & Database Management**:
  - Integrated MySQL service controls (Start, Stop, Restart) on port `3306`.
  - In-app database management: create databases with collation (`utf8mb4_unicode_ci`), inspect table counts and sizes, or drop unused databases.
  - One-click connection strings and direct launchers for TablePlus and Sequel Ace.
- 📦 **Node.js & Package Managers**:
  - Detect installed Node.js versions (v18, v20 LTS, v22 LTS, v24).
  - Quick toggles for package managers (`npm`, `pnpm`, `yarn`).
- 🖥️ **Native macOS Menu Bar Tray**:
  - Status bar tray menu showing live service health.
  - Fast toggles to Start All, Stop All, Restart All, and Open Spark.
- 🔄 **In-App Auto-Updates**:
  - Built-in update checker powered by Tauri updater for seamless one-click updates directly from GitHub Releases.
- 🔑 **Automated Sudo Helper**:
  - Streamlined initial configuration for local Nginx and DNS management without repetitive password prompts.

---

## 💻 System Requirements

- **Operating System**: macOS 12.0 (Monterey) or later (macOS Sonoma 14+ / Sequoia 15+ recommended).
- **Architecture**: Apple Silicon (`aarch64`) or Intel (`x86_64`).
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
git clone https://github.com/followruhulamin/Spark.git
cd Spark
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run in Development Mode

Launch the Tauri desktop app with hot-reloading for both React and Rust:

```bash
npm run tauri:dev
```

> 💡 **UI-Only Mode**: To preview and style frontend React components in your browser without launching the native desktop wrapper, run `npm run dev` and open `http://localhost:1420`.

---

## 📦 Building Production App

Compile a fully optimized, native release bundle:

```bash
npm run tauri:build
```

### Output Location
```text
src-tauri/target/release/bundle/macos/Spark.app
```

### Install to Applications
```bash
cp -R src-tauri/target/release/bundle/macos/Spark.app /Applications/
```

> **macOS Gatekeeper Note**: If copying `Spark.app` manually on macOS, clear any quarantine attributes:
> ```bash
> xattr -cr /Applications/Spark.app
> ```

---

## ⌨️ Shortcuts & Navigation

| Shortcut | Action |
| :--- | :--- |
| <kbd>⌘</kbd> <kbd>K</kbd> | Quick search across all sites |
| <kbd>⌘</kbd> <kbd>,</kbd> | Open Preferences & Settings |
| <kbd>⌘</kbd> <kbd>N</kbd> | Create a new Laravel application |
| <kbd>⌘</kbd> <kbd>O</kbd> | Open selected site in default browser |
| <kbd>⌘</kbd> <kbd>Q</kbd> | Quit Spark |

---

## ⚙️ Configuration & Storage

Spark stores all user preferences, virtual host configurations, and SSL certificates cleanly in your macOS home directory:

```text
~/.config/spark/
├── settings.json       # App preferences, PHP/Node defaults
├── sites.json          # Registered site paths & configurations
├── nginx/              # Generated per-site Nginx vhost configs
└── ssl/                # Local Root CA & per-site TLS certificates
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Feel free to check the [Issues](https://github.com/followruhulamin/Spark/issues) page to report bugs or suggest enhancements.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
