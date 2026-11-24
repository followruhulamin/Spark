# ⚡ Spark v0.1.6 — Brand Identity & Native Menu Bar Icon Refresh

This release introduces Spark's refreshed brand identity and a redesigned native macOS menu bar status icon, alongside full cleanup of legacy assets and an updated multi-resolution bundle icon pipeline.

---

## 🛠️ What's Changed in v0.1.6

### 🎨 Refreshed Visual Identity & App Icon
- **New Logo Emblem (`logo.svg`)**: Vibrant gradient squircle with crisp white Spark monogram used across the app UI (Header, Update modals, Onboarding) and compiled into high-resolution multi-size app bundles (`icon.icns`, `icon.ico`, `icon.png`, `1024x1024`).
- **Native macOS Menu Bar Template Icon (`icon.svg`)**: Pixel-perfect 44×44 (22pt @2x) monochrome template status item with anti-aliased alpha mask that seamlessly adapts to macOS light/dark modes and wallpaper translucency.
- **Legacy Asset Cleanup**: Purged deprecated and starter SVGs (`spark.svg`, `spark-mono.svg`, `vite.svg`, `tauri.svg`, `react.svg`).
- **Automated Multi-Resolution Generator**: Updated `generate_icon.py` and `export_all_icons.py` to compile native icons directly from the new SVG assets using macOS `swift` and `iconutil`.

---

## 📦 Downloads & Verification

- **Version**: `v0.1.6`
- **Platform**: macOS 12.0+ (Apple Silicon `arm64` & Intel `x86_64`)
- **Bundle**: `Spark.app`
