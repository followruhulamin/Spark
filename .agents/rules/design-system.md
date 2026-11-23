# Spark Desktop Design System

> **Spark Living Design System Specification**  
> **Source of Truth for Current & Future AI Agents**  
> *Derived directly from the production macOS desktop codebase of Spark (`src/`, `src-tauri/`).*

---

## 1. Design Philosophy

The visual design and user experience of Spark are guided by five core principles:

1. **Authentic macOS Desktop Aesthetics**:
   Spark is designed to feel like an official, first-party macOS system utility. It incorporates frameless window translucency, custom traffic light placement, refined dark-mode surfaces, subtle border gradients, and native menu bar integration.
2. **High Information Density with Visual Hierarchy**:
   Developers need to quickly scan through tens of active local sites, inspect runtime versions, verify SSL status, and check database ports at a glance. Visual noise is minimized in favor of clean pills, badges, and icon buttons.
3. **Monospace Tabular Precision**:
   All ports (e.g. `3306`, `80`, `443`), version numbers (`8.3.12`, `v20.15.0`), local domains (`*.test`), file sizes, and memory limits must use tabular monospace typography (`font-mono tabular-nums`). This prevents layout jitter during search filtering or state updates.
4. **Immediate Interactive Feedback**:
   Every state toggle (securing a site with SSL, switching a site's PHP version, starting MySQL) provides instant optimistic UI updates and smooth transitions, accompanied by live status badges.
5. **Keyboard-First Navigation**:
   Every primary action can be triggered without leaving the keyboard:
   - `⌘ K`: Instant site search and filter focus.
   - `⌘ ,`: Open / close Preferences & Settings.
   - `⌘ N`: Open 1-Click Laravel Scaffolder.
   - `Escape`: Close active modal or clear search.

---

## 2. Color Palette & Design Tokens

Spark utilizes a tailored dark palette crafted for high readability and reduced eye strain:

### 2.1 Surfaces & Canvas
- **Window Canvas**: `#16161a` (`bg-[#16161a]`) — The deep obsidian base canvas of the application.
- **Card / Surface**: `#202026` (`bg-[#202026]`) — Raised panels, site list rows, modal containers, and settings tabs.
- **Surface Hover**: `#26262e` (`hover:bg-[#26262e]`) — Row hover states and clickable item backgrounds.
- **Subtle Borders**: `rgba(255, 255, 255, 0.08)` to `rgba(255, 255, 255, 0.12)` (`border-white/10`) — Crisp, hairline division lines.
- **Translucent Overlays**: `rgba(0, 0, 0, 0.6)` with `backdrop-blur-md` — Modal backdrop dimming.

### 2.2 Semantic & State Colors
- **Emerald (Success / Running / Secured)**:
  - Running services, active PHP runtime, HTTPS locked indicator.
  - Text: `text-emerald-400`
  - Badges: `bg-emerald-500/10 text-emerald-400 border-emerald-500/20`
- **Rose / Crimson (Error / Stopped / Danger)**:
  - Stopped services, SSL unsecure state, delete/drop database actions, error logs.
  - Text: `text-rose-400`
  - Badges: `bg-rose-500/10 text-rose-400 border-rose-500/20`
- **Amber (Warning / Partial / Notice)**:
  - Outdated runtimes, pending setup steps, missing dependencies.
  - Text: `text-amber-400`
  - Badges: `bg-amber-500/10 text-amber-400 border-amber-500/20`
- **Sky / Blue (Info / In-Progress)**:
  - Scaffolding step active, downloading package, IDE launcher hints.
  - Text: `text-sky-400`
  - Badges: `bg-sky-500/10 text-sky-400 border-sky-500/20`
- **Violet / Purple (Framework Badges)**:
  - Framework indicator tags (`Laravel`, `React`, `Vue`, `Livewire`).
  - Badges: `bg-violet-500/10 text-violet-400 border-violet-500/20`
- **Slate (Muted & Inactive)**:
  - Inactive service dots, disabled controls, secondary helper text.
  - Text: `text-gray-400` / `text-gray-500`

---

## 3. Window Layout & Header Topology

### 3.1 macOS Frameless Window Integration
- **Traffic Light Offset**: The standard macOS Close, Minimize, and Zoom window controls are positioned at `{ x: 18, y: 18 }`.
- **Header Padding**: The top header leaves an explicit left inset (`pl-24` or `w-20`) so traffic lights never overlap search inputs or navigation elements.
- **Window Dragging**: The non-interactive surface of the top header utilizes `-webkit-app-region: drag` (`data-tauri-drag-region`) to enable natural macOS window dragging. Interactive buttons and search inputs explicitly disable dragging (`-webkit-app-region: no-drag`).

### 3.2 Layout Structure
```text
┌────────────────────────────────────────────────────────────────────────┐
│ [Traffic Lights]   [Search Bar (⌘K)]       [Services Status]  [+ New]  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   Site Rows List (Scrollable Area)                                     │
│   • Domain name (.test)   • Framework badge   • SSL toggle             │
│   • PHP version pill      • IDE / Terminal    • Browser link           │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ [PHP 8.3 Active]   [MySQL: Port 3306]                 [Preferences ⌘,] │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Standards

### 4.1 SiteRow (`src/components/SiteRow.tsx`)
- **Domain Title**: Bold white text (`text-white font-medium`) linking directly to the local site URL (`http://` or `https://`).
- **SSL Lock Pill**:
  - Secured: Green lock icon (`LucideLock`) with emerald glow. Clicking toggles HTTPS and initiates certificate generation.
  - Unsecured: Gray unlocked icon (`LucideUnlock`).
- **PHP Version Switcher**:
  - Interactive dropdown button (`rounded-full px-2.5 py-0.5 text-xs font-mono`).
  - Clicking displays installed PHP versions (8.1, 8.2, 8.3, 8.4, 8.5) and instantly updates the vhost FastCGI socket.
- **Action Group (Right-Aligned)**:
  - `Browser`: Launches site in default system browser (`open_in_browser`).
  - `IDE`: Launches project in configured editor (VS Code, Cursor, Zed, Antigravity, PhpStorm).
  - `Terminal`: Opens project folder in macOS Terminal.
  - `Folder`: Reveals project folder in macOS Finder.
  - `Favorite`: Toggles pinned status to keep important sites at the top of the list.

### 4.2 Modal Dialogs
- **Backdrop**: Fixed full-screen container with `bg-black/60 backdrop-blur-md` and smooth fade transition.
- **Card Container**: Centered container with `bg-[#202026] border border-white/10 rounded-2xl shadow-2xl p-6`.
- **Keyboard Dismissal**: Pressing `Escape` or clicking outside the modal automatically invokes `onClose()`.
- **Action Buttons**:
  - Affirmative / Primary: Solid emerald or white button (`bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg`).
  - Dismissive / Secondary: Ghost or border button (`border border-white/10 hover:bg-white/5 text-gray-300 px-4 py-2 rounded-lg`).

### 4.3 Scaffolding Terminal Progress Modal (`src/components/ScaffoldProgressModal.tsx`)
- **Step List**: Displays active, pending, and completed milestones with checkmark animations.
- **Console Output**: Embedded dark terminal (`bg-[#121215] font-mono text-xs text-gray-300 p-4 rounded-xl overflow-y-auto max-h-60`) auto-scrolling to the latest emitted line.

---

## 5. Typography & Monospace Rules

- **Primary UI Sans**: System default Apple font stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif`).
- **Monospace Strings**: `font-mono tabular-nums` strictly applied to:
  - Local domains (`mysite.test`)
  - PHP versions (`PHP 8.3.12`)
  - Node.js versions (`v22.11.0`)
  - TCP ports (`:3306`, `:80`, `:443`)
  - Database row counts, sizes (`14.2 MB`), and collations
  - CLI command lines in progress modals
- **Keyboard Badges**: Rendered with `text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-white/10 text-gray-400 border border-white/10`.
