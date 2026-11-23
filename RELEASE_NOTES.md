# ⚡ Spark v0.2.1 — Bug Fixes & Improvements

This release brings visual polish to macOS window controls, streamlined automated setup for fresh installs, compact responsive dependency management, and built-in auto-update support.

---

## 🛠️ What's Fixed & Improved in v0.2.1

### 🪟 macOS Window Controls (Traffic Lights) Vertical Padding
- **Balanced Titlebar Inset**: Fine-tuned native macOS window control positioning (`trafficLightPosition: { x: 18, y: 28 }`) to add vertical breathing room above the close, minimize, and zoom buttons.
- **Header Alignment**: Window control buttons are now vertically centered alongside the Spark logo and search bar in the 50px header instead of crowding the top edge of the window.

### 🚀 Automated Initial Setup on First Install
- **Zero-Touch Background Setup**: Spark now automatically detects passwordless sudo and configures Local Root CA trust in the macOS System Keychain and `/etc/resolver/test` routing immediately upon first launch.
- **1-Click "Run Initial Setup"**: Added a guided setup modal and an "Auto-Configure Both" shortcut in Settings > General, so you never have to manually run multiple terminal commands to configure DNS routing and SSL.

### 🎨 Compact & Responsive Dependency Management UI
- **Icon-Only Uninstall Buttons**: Replaced wide "Uninstall" text buttons across Dependencies, PHP, and Node tabs with compact red-bordered icon buttons (`Trash2`), saving substantial horizontal space.
- **Clean Green Status Checkmarks**: Replaced bulky "Installed" labels with minimalist green checkmark badges (`Check`).
- **Responsive List Layouts**: Improved layout responsiveness across all dependency rows to prevent awkward wrapping on narrower window sizes.

### 🔄 In-App Software Updater
- **Automated Update Detection**: Integrated `@tauri-apps/plugin-updater` with dedicated `UpdateModal` to check for and install new Spark releases seamlessly.
- **Status Bar Indicator**: Added a notification indicator in the footer when a newer version is available on GitHub Releases.

---

## 📦 Downloads & Verification

- **Version**: `v0.2.1`
- **Platform**: macOS 12.0+ (Apple Silicon `arm64` & Intel `x86_64`)
- **Bundle**: `Spark.app`
