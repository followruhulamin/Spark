# ⚡ Spark v0.1.3 — Production App 502 Fix & Manual Download

This release resolves the production `502 Bad Gateway` error in standalone macOS app bundles, prevents PHP version pool config collisions, and introduces a direct "Download Manually (.zip)" option in the update dialog.

---

## 🛠️ What's Fixed & Improved in v0.1.3

### 🖥️ Standalone macOS App CLI Environment (Fixes Production 502)
- **Automatic GUI PATH Initialization**: macOS GUI apps launched from Finder/Dock run in a restricted environment without shell PATH. Spark now automatically injects `/opt/homebrew/bin`, `/opt/homebrew/sbin`, `/usr/local/bin`, and runtime bin directories on startup so `brew`, `nginx`, and `php-fpm` work seamlessly in production.
- **Strict PHP Version Isolation**: Fixed a bug where shared config symlinks in Homebrew caused PHP 8.4's socket to be overwritten by subsequent versions during startup scans. Each version is now strictly isolated to its own `/tmp/spark-php{ver}.sock`.

### 📦 Manual Download Option for Updates
- **1-Click Manual Zip Download**: Added a "Download Manually (.zip)" button in the Software Update modal and Settings tab, allowing instant direct zip downloads in your browser whenever preferred.

### 🔐 Cryptographic Minisign Verification
- **Automated Signature Injection**: Releases are automatically signed with your Minisign key and paired with verified signatures in `latest.json` for error-free in-app auto-updating.

---

## 📦 Downloads & Verification

- **Version**: `v0.1.3`
- **Platform**: macOS 12.0+ (Apple Silicon `arm64` & Intel `x86_64`)
- **Bundle**: `Spark.app`
