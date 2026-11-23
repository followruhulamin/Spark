# Spark Project Rules & Guidelines

## What is Spark?
- **Spark** is the proper name of this desktop application project.
- It is a fast, native macOS desktop application built with **Rust (2021 edition)**, **Tauri v2**, **React 19**, and **Tailwind CSS**.
- It is designed as a native macOS local development environment manager (an alternative/competitor to Laravel Herd).
- Spark provides instant zero-configuration `.test` local domain routing, multi-version PHP & MySQL management, automated Root CA & local HTTPS certificates, and streamlined Laravel starter kit scaffolding — with zero Docker or Electron resource overhead.

## Critical Instructions for AI Agents
- **DO NOT run Laravel Herd (`herd start`, `herd park`, `herd secure`, etc.)** when asked to run or work on Spark. Spark is a native competitor to Herd.
- **DO NOT treat this directory as a PHP/Laravel web project to be served via Nginx or PHP-FPM**. Spark is a desktop application binary built with Rust and React.
- When the user asks to "run Spark", "run the app", or "start spark":
  - **Desktop App (Tauri + Rust + UI)**: `npm run tauri:dev`
  - **Frontend Only (Vite Web UI preview)**: `npm run dev`
  - **Build Production Desktop App**: `npm run tauri:build`
  - **Compile / Check Rust Backend**: `cargo check --manifest-path src-tauri/Cargo.toml`

## System & Platform Constraints
- **Platform**: macOS 12+ (Apple Silicon `aarch64` and Intel `x86_64`).
- **macOS System Files**: Spark interacts with macOS networking (`/etc/resolver/test`), macOS System Keychain (`security add-trusted-cert`), and launch agents. Sensitive operations use passwordless sudo via `/etc/sudoers.d/spark` when configured, or standard privileged prompts.
- **Config Storage**: User configuration and generated artifacts are stored in `~/.config/spark/` (`settings.json`, `sites.json`, `nginx/`, `ssl/`). Never write project runtime configuration to root or temporary locations.
- **Window & Tray Lifecycle**: The main window prevents close on `CloseRequested` and hides to the macOS menu bar tray. Clicking the Dock icon reopens the window via `RunEvent::Reopen`. Tray menu actions delegate to the frontend via `tray-action` events to avoid duplicate concurrent executions.
