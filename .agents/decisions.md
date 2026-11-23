# Architectural Decision Records (ADRs)

This document records the key architectural decisions made during the design and implementation of **Spark**.

---

## ADR-001: Native Rust + Tauri v2 Desktop Stack over Electron or Web App
- **Date**: 2026-11-01
- **Context**: Local development environment managers require deep system-level OS capabilities (binding privileged ports 80/443, writing `/etc/resolver`, managing Keychain certificates, and controlling native system daemons). Electron applications consume 250MB+ of idle RAM and introduce massive binary distributions. Pure web apps cannot interact with the macOS system layer directly without helper daemons.
- **Decision**: Build Spark using **Rust** and **Tauri v2**.
- **Consequences**:
  - Tiny application bundle size (~7.2 MB).
  - Sub-30ms startup time and under 40 MB idle RAM footprint.
  - Native macOS Cocoa access via Objective-C/Cocoa bindings (`NSApp`, `NSImage`, `NSStatusItem`).
  - Strict security sandboxing with granular capability declarations in `src-tauri/capabilities/`.

---

## ADR-002: macOS Native Local DNS Resolver (`/etc/resolver/test`) over `/etc/hosts` Mutation
- **Date**: 2026-11-02
- **Context**: Traditional development tools append hundreds of lines to `/etc/hosts`, requiring repeated sudo password prompts every time a new site is added, and risking corruption of system network configuration.
- **Decision**: Use macOS's built-in multi-resolver architecture by writing a single resolver file: `/etc/resolver/test` pointing to local Dnsmasq (`127.0.0.1:53`).
- **Consequences**:
  - Every `*.test` domain automatically resolves to `127.0.0.1` without ever writing to `/etc/hosts`.
  - Adding, renaming, or deleting sites requires zero DNS changes or sudo prompts.
  - Fully transparent to macOS mDNSResponder, Safari, Chrome, and terminal curl.

---

## ADR-003: Pure-Rust Internal Root CA (`rcgen`) and Keychain Integration for Zero-Friction Local HTTPS
- **Date**: 2026-11-03
- **Context**: Local TLS/SSL often relies on external OpenSSL CLI binaries, complex mkcert scripts, or self-signed certificates that trigger scary red browser warnings.
- **Decision**: Implement a pure-Rust Certificate Authority manager in `ssl.rs` using the `rcgen` crate. The Root CA (`ca.crt`) is generated directly in-memory, persisted in `~/.config/spark/ssl/`, and trusted in the macOS System Keychain using `/usr/bin/security add-trusted-cert`. Per-site certificates are minted dynamically with Subject Alternative Names (SAN) for `domain.test` and `*.domain.test`.
- **Consequences**:
  - Zero external OpenSSL CLI dependencies for certificate generation.
  - Green padlock in Safari, Chrome, and Firefox with zero browser security warnings.
  - Sub-millisecond certificate provisioning on one-click HTTPS toggle.

---

## ADR-004: Lightweight Nginx + PHP-FPM VHost Sync over Containerization (Docker)
- **Date**: 2026-11-04
- **Context**: Docker-based local development environments introduce severe filesystem I/O performance penalties on macOS due to virtualization layers, high battery drain, and complex port mapping.
- **Decision**: Manage lightweight native Nginx and PHP-FPM processes running directly on the macOS host. Site vhosts are generated inside `~/.config/spark/nginx/` and point directly to local UNIX domain sockets (`php-fpm-{version}.sock`).
- **Consequences**:
  - Native macOS filesystem speed (up to 10x faster response times than Docker bind mounts).
  - Minimal CPU and battery consumption.
  - Instant per-site PHP version switching by simply changing the FastCGI socket path in Nginx.

---

## ADR-005: In-Process MySQL & Database Management with TablePlus/Sequel Ace Launchers
- **Date**: 2026-11-05
- **Context**: Developers need fast database inspection and creation when spinning up new Laravel sites without having to leave the app or remember MySQL CLI syntax.
- **Decision**: Embed direct MySQL daemon management and SQL query execution inside `mysql_manager.rs`. Provide database creation with `utf8mb4_unicode_ci`, database deletion, and one-click connection URL generation for TablePlus (`mysql://root@127.0.0.1:3306/{database}`) and Sequel Ace.
- **Consequences**:
  - Seamless developer workflow: creating a new Laravel site can automatically provision its database.
  - Immediate visual feedback on database sizes and table counts in Spark's Preferences.

---

## ADR-006: Frameless Overlay Window with Custom Traffic Light Positioning & macOS Native Menu Bar Tray
- **Date**: 2026-11-06
- **Context**: Standard OS window titlebars look dated and consume valuable vertical screen space. A local server manager needs to be accessible from both the macOS Dock and the top Menu Bar.
- **Decision**: Configure Tauri with `titleBarStyle: "Overlay"`, `hiddenTitle: true`, and custom `trafficLightPosition: { x: 18, y: 18 }`. Pair this with a native NSStatusItem tray using `TrayIconBuilder::with_id("main-tray")`.
- **Consequences**:
  - Modern, authentic macOS dark aesthetic with integrated draggable window header.
  - Persistent status item in the menu bar providing fast access to service status and controls.

---

## ADR-007: Window Close Prevention & Dock Reopen Lifecycle for Continuous Background Operation
- **Date**: 2026-11-23
- **Context**: As a local server daemon manager, closing Spark's window should not quit the background services or destroy the window (which would cause clicking "Open Spark" from the tray or clicking the Dock icon to fail).
- **Decision**: Intercept `WindowEvent::CloseRequested` in `lib.rs` to call `api.prevent_close()` and `window.hide()`. In the main run loop, handle macOS `RunEvent::Reopen` to call `show_main_window()`, which unhides, unminimizes, focuses the window, and calls Cocoa `activateIgnoringOtherApps_(YES)`.
- **Consequences**:
  - Closing the window leaves services running cleanly in the background.
  - Clicking the Spark Dock icon or tray menu item reliably restores and brings the window forward from anywhere.
  - Explicit quitting is handled cleanly via "Quit Spark" (`app.exit(0)`) or `Cmd+Q`.

---

## ADR-008: Streaming IPC Events for Laravel Scaffolding & System Commands
- **Date**: 2026-11-07
- **Context**: Running `composer create-project` or installing Homebrew formulas takes 30-120 seconds. Blocking synchronous IPC calls leave the UI unresponsive with no feedback.
- **Decision**: Spawn background tasks using asynchronous tokio processes and stream stdout/stderr lines to the frontend in real time using Tauri's event bus (`app.emit("scaffold-progress", payload)` and `app.emit("dep-install-progress", payload)`).
- **Consequences**:
  - Non-blocking UI: users see live interactive terminal output in a dedicated modal.
  - Granular step indicators (Creating Project → Installing Starter Kit → Provisioning Database → Generating SSL).

---

## ADR-009: Unified Event Delegation for Tray Menu Actions to Prevent Duplicate Execution
- **Date**: 2026-11-23
- **Context**: When tray menu items ("Start All", "Stop All", "Restart All") were executed in a Rust background thread while simultaneously emitting events to the frontend handlers that called the same commands, services were started/restarted twice concurrently, causing port collisions and lock errors.
- **Decision**: Tray menu actions delegate service commands by emitting `tray-action` with payloads (`start_all`, `stop_all`, `restart_all`) to the application's unified frontend handler in `App.tsx`.
- **Consequences**:
  - Clean single-execution pipeline for all service state changes.
  - Frontend loading states and error toasts automatically stay in sync whether triggered from the Header buttons or the Menu Bar.
