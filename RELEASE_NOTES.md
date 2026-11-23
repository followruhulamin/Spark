# ⚡ Spark v0.1.4 — Move Site Feature & Enhanced In-App Updater

This release introduces the **Move Site** feature to easily migrate any site folder to a new location on disk, alongside improvements to the in-app updater and release pipeline.

---

## 🛠️ What's New & Improved in v0.1.4

### 📁 Move Site via Three-Dot Menu
- **Interactive Move Modal**: Added a "Move Site" option to each site's three-dot (`•••`) menu. Select a new destination directory using the native macOS folder picker (`pick_folder`) with real-time target path preview.
- **Cross-Volume Migration Support**: Uses standard filesystem rename with an automatic fallback to macOS `ditto` + clean removal to safely handle moves across different disk mounts and external drives.
- **Automatic Nginx Virtual Host Sync**: Automatically updates the Nginx vhost config (`<domain>.conf`) with the new root directory and reloads Nginx (`nginx -s reload`) without requiring domain re-creation or downtime.

### ⚡ Updater & Release Pipeline
- **Cryptographic Minisign Signatures**: Automatically signs release archives with Minisign and generates the `latest.json` updater manifest for error-free in-app auto-updates.
- **Clean Bundle Compilation**: Ensures stale binaries or cached UI assets are cleared before packaging production releases.

---

## 📦 Downloads & Verification

- **Version**: `v0.1.4`
- **Platform**: macOS 12.0+ (Apple Silicon `arm64` & Intel `x86_64`)
- **Bundle**: `Spark.app`
