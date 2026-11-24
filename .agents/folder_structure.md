# Spark Project Folder Structure

This document details the folder structure and architectural layout of the **Spark** desktop application.

```text
/Volumes/Backup/Website/Spark/
├── .agents/                          # AI Agent knowledge base & architectural specifications
│   ├── AGENTS.md                     # Core rules, constraints, and instructions for AI agents
│   ├── architecture.md               # Primary system architecture, subsystems, and technology stack
│   ├── decisions.md                  # Architectural Decision Records (ADRs)
│   ├── folder_structure.md           # Repository file tree and directory map (this file)
│   ├── handoff.md                    # Engineering status, milestones, and implementation roadmap
│   └── rules/
│       └── design-system.md          # macOS desktop UI design tokens, layout, and component rules
│
├── .github/                          # GitHub workflows and CI configurations (if applicable)
│
├── public/                           # Static assets served by Vite
│   ├── logo.svg                      # Spark application vector emblem & logo
│   └── icon.svg                      # Spark menu bar vector icon
│
├── src/                              # React 19 Frontend Application
│   ├── assets/                       # Local icons, SVG artwork, and graphics
│   ├── components/                   # React UI components & view controllers
│   │   ├── Settings/                 # Preferences / Settings modal sub-tabs
│   │   │   ├── DependenciesTab.tsx   # System binaries & Homebrew formula manager
│   │   │   ├── GeneralTab.tsx        # Parked paths, TLD, Root CA, DNS, sudo config
│   │   │   ├── MysqlTab.tsx          # MySQL service controls & database inspector
│   │   │   ├── NodeTab.tsx           # Node.js versions & package manager toggles
│   │   │   └── PhpTab.tsx            # PHP versions, active switcher, inline php.ini editor
│   │   ├── CloneRepoModal.tsx        # Git clone dialog for adding remote repositories
│   │   ├── CreateAppCard.tsx         # Laravel starter kit scaffolding modal
│   │   ├── DependencySetupModal.tsx  # First-run onboarding wizard for missing tools
│   │   ├── Footer.tsx                # Status bar (active PHP, MySQL status, settings trigger)
│   │   ├── Header.tsx                # Frameless window header with traffic lights & search
│   │   ├── LinkAppModal.tsx          # Manually link custom folders to .test domains
│   │   ├── ScaffoldProgressModal.tsx # Terminal progress streaming during project generation
│   │   ├── SettingsView.tsx          # Settings tab container and navigation sidebar
│   │   ├── SiteList.tsx              # Grid / list of parked and linked web sites
│   │   ├── SiteRow.tsx               # Individual site row (PHP switch, SSL toggle, IDE launcher)
│   │   └── SparkLogo.tsx             # Animated / styled Spark vector badge
│   ├── App.css                       # Application-level styling and scrollbar customizations
│   ├── App.tsx                       # Main application state container & keyboard shortcuts
│   ├── index.css                     # Tailwind CSS v3 directives and base design tokens
│   ├── main.tsx                      # React root entry point
│   ├── types.ts                      # TypeScript data structures & Tauri IPC contracts
│   └── vite-env.d.ts                 # Vite client type definitions
│
├── src-tauri/                        # Rust Backend & Tauri v2 Desktop Core
│   ├── capabilities/                 # Tauri v2 security & IPC capability manifests
│   │   └── default.json              # Permission grants (dialog, opener, shell, process)
│   ├── icons/                        # Compiled multi-resolution icon assets
│   │   ├── 32x32.png                 # Standard low-res desktop icon
│   │   ├── 64x64.png                 # Mid-res icon
│   │   ├── 128x128.png               # High-res standard icon
│   │   ├── 128x128@2x.png            # Retina display icon (256x256)
│   │   ├── icon.icns                 # macOS application bundle icon
│   │   ├── icon.ico                  # Windows portable icon
│   │   ├── icon.png                  # Master 1024x1024 application image
│   │   └── tray_icon.png             # macOS menu bar status item template/colored icon (44x44)
│   ├── src/                          # Rust source modules
│   │   ├── commands.rs               # All 41 Tauri IPC command handlers
│   │   ├── config.rs                 # ConfigStore: settings.json & sites.json manager
│   │   ├── dependencies.rs           # DependencyManager: Homebrew binary health & installs
│   │   ├── dns.rs                    # DnsResolverManager: /etc/resolver/test integration
│   │   ├── lib.rs                    # Tauri builder, plugins, setup, window & dock lifecycle
│   │   ├── main.rs                   # Executable entry point calling spark_lib::run()
│   │   ├── models.rs                 # Core Rust structs (Site, AppSettings, ServiceHealth)
│   │   ├── mysql_manager.rs          # MysqlManager: daemon lifecycle, DB inspection, TablePlus
│   │   ├── node_manager.rs           # NodeManager: Node versions & npm/pnpm/yarn detection
│   │   ├── php_manager.rs            # PhpManager: PHP version switcher & php.ini editor
│   │   ├── privilege.rs              # PrivilegeManager: passwordless sudo verification/setup
│   │   ├── scaffolding.rs            # ScaffoldingManager: Laravel starter kits & stream logs
│   │   ├── services.rs               # ServiceManager: Nginx vhost sync & Dnsmasq lifecycle
│   │   ├── ssl.rs                    # SslManager: pure-Rust rcgen Root CA & TLS cert generator
│   │   └── tray.rs                   # Native macOS NSStatusItem menu bar tray & window activator
│   ├── build.rs                      # Tauri v2 compilation build script
│   ├── Cargo.lock                    # Locked Rust dependency tree
│   ├── Cargo.toml                    # Rust crate manifest, dependencies, and release profile
│   └── tauri.conf.json               # Tauri v2 configuration (bundle, window size, permissions)
│
├── export_all_icons.py               # Generates complete macOS iconset, icon.icns, and PNG assets
├── generate_icon.py                  # Procedural generator for Spark master icon & tray icon
├── master_icon.png                   # 1024x1024 master icon source
├── package.json                      # Node.js dependencies, build scripts, and metadata
├── postcss.config.js                 # PostCSS configuration for Tailwind CSS
├── tailwind.config.js                # Tailwind CSS design configuration and theme extensions
├── tsconfig.json                     # TypeScript compiler configuration
├── tsconfig.node.json                # TypeScript node configuration
└── vite.config.ts                    # Vite build configuration (Tauri server port 1420)
```

---

## Runtime Files (macOS User Home Directory)

When Spark runs on a user's Mac, runtime configurations are persisted in:

```text
~/.config/spark/
├── settings.json                     # User preferences (project paths, active runtimes, IDE)
├── sites.json                        # Discovered, parked, and linked site metadata
├── nginx/                            # Generated Nginx virtual host configurations
│   ├── default.conf                  # Fallback server block
│   └── *.conf                        # Per-site virtual host configurations (domain.test.conf)
└── ssl/                              # Local TLS certificates and Root CA
    ├── ca.crt                        # Spark Root CA Certificate (trusted in macOS Keychain)
    ├── ca.key                        # Spark Root CA Private Key
    └── certs/                        # Per-site certificates (domain.crt and domain.key)
```

## System-Level Configuration Files

```text
/etc/resolver/test                    # Directs all *.test DNS queries to 127.0.0.1:53
/etc/sudoers.d/spark                  # (Optional) Passwordless sudo rules for Nginx & DNS
/Library/Keychains/System.keychain    # Hosts trusted "Spark Development Root CA"
```
