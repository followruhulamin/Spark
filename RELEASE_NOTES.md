# ⚡ Spark v0.1.5 — First-Time Setup & Local Routing Fixes

This release fixes first-time macOS installation issues where `.test` websites failed to load out of the box, ensuring seamless DNS resolution, Nginx virtual host routing, and PHP-FPM socket configuration on both Apple Silicon and Intel Macs.

---

## 🛠️ What's Fixed & Improved in v0.1.5

### 🌐 Reliable First-Time `.test` Website Loading
- **Complete Onboarding Setup Wiring**: Connected `DependencySetupModal` to `run_initial_setup`, `setup_root_ca`, `setup_dns_resolver`, `enable_passwordless_sudo`, and settings persistence so Quick Auto-Setup configures the entire stack in one click.
- **Dnsmasq `conf-dir` & Privileged Port 53 Startup**: Automatically enables `conf-dir=<prefix>/etc/dnsmasq.d/,*.conf` in `dnsmasq.conf`, writes `dnsmasq.d/spark.conf`, and starts/restarts `dnsmasq` with administrator privileges so `*.test` domains resolve to `127.0.0.1`.
- **Automatic Nginx `servers/spark.conf` Include & Vhost Sync**: Ensures Homebrew's `nginx/servers/spark.conf` includes Spark's virtual host directory on startup, during `sync_vhosts`, and at the end of initial setup, reloading Nginx and starting all PHP-FPM FastCGI pools.
- **Apple Silicon & Intel Homebrew Support**: Detects `/opt/homebrew` vs `/usr/local` dynamically for Nginx, Dnsmasq, and PHP-FPM configurations.

---

## 📦 Downloads & Verification

- **Version**: `v0.1.5`
- **Platform**: macOS 12.0+ (Apple Silicon `arm64` & Intel `x86_64`)
- **Bundle**: `Spark.app`
