# ⚡ Spark v0.1.2 — Bug Fixes & Service Resilience

This release fixes the `502 Bad Gateway` error on PHP sites, adds self-healing FastCGI pool management, and ensures background PHP-FPM daemons automatically start and configure upon app launch.

---

## 🛠️ What's Fixed & Improved in v0.1.2

### 🔌 PHP-FPM FastCGI Socket Auto-Configuration (Fixes 502 Bad Gateway)
- **Automatic Pool Alignment**: Spark now automatically inspects installed PHP versions and configures their FastCGI pools (`www.conf`) to listen on `/tmp/spark-php{version}.sock`.
- **Dynamic User Permissions**: Socket ownership and permissions (`listen.owner`, `listen.group`, `listen.mode`) are now dynamically assigned using the active macOS user instead of hardcoded paths.
- **Legacy Socket Bridging**: Bi-directional symlinks are automatically established between `/tmp/localdev-php*.sock` and `/tmp/spark-php*.sock` to ensure zero downtime or broken upstream references.

### ⚙️ Self-Healing Service & Daemon Lifecycle
- **Automated Daemon Startup**: Spark now validates and activates background PHP-FPM daemons alongside Nginx and MySQL immediately when the desktop app launches.
- **Service Restart Hook**: Clicking "Restart" in the footer now reloads PHP-FPM (`killall -USR2 php-fpm`), Nginx, and MySQL in a single unified operation.

### 🧹 Clean-First Release Packaging
- **Zero-Cache Bundling**: The automated release builder cleans previous bundle directories and validates `CFBundleShortVersionString` in `Info.plist` before generating the distribution zip.

---

## 📦 Downloads & Verification

- **Version**: `v0.1.2`
- **Platform**: macOS 12.0+ (Apple Silicon `arm64` & Intel `x86_64`)
- **Bundle**: `Spark.app`
