# AMAYA × NSpector — Unified Device Intelligence

A single offline desktop suite that merges two existing apps:

- **NSpector 1.0.0** — SQLite-backed dispatch, returns, dealer-custody and
  duplicate-serial reasoning engine.
- **AMAYA IMEI Control Center** — the workbook snapshot PWA (68,346 assets,
  103,648 movement events) served unchanged.

Both datasets live side by side, so the same IMEI can be inspected as one
device with two evidence trails.

## What is in the app

| Workspace | What it does |
| --- | --- |
| **Overview** | Combined KPIs, exact IMEI reconciliation (54,915 matches), AMAYA lifecycle mix, NSpector exposure, priority findings. |
| **Unified lookup** | One serial → NSpector custody trail, returns, findings and reasoning **plus** every AMAYA workbook occurrence, state and source citation. |
| **Device ledger** | The full NSpector UI (Work Queue, Inspector, Exposure, Flows, Dealers, Ownership) with finding tracking. |
| **IMEI Control Center** | A native metrics workspace plus a first-class Control Center window / browser tab — never an iframe. |
| **Data sources** | Local file inventory, snapshot versions and the four source workbooks. |

The IMEI Control Center theme picker is curated to three polished finishes —
**AMAYA Standard**, **Graphite** and **Paper**. Legacy theme choices migrate
automatically to the nearest supported finish.

## Run

```powershell
npm run pack                 # build dist\AMAYA-NSpector
.\dist\AMAYA-NSpector\AMAYA-NSpector.exe
```

The window opens `http://localhost:4173`. Override the port with the `PORT`
environment variable. The same server can be opened from another machine on
the LAN at `http://<this-pc>:4173`.

## Android

A signed native Android build is generated with Capacitor. It bundles the full
shell and the AMAYA IMEI Control Center locally, adds native splash/status-bar/
back handling, and connects to the hosted API for live NSpector ledgers.

```powershell
npm run android:build     # APK + AAB into dist\Android
```

Outputs:

- `dist\Android\AMAYA-NSpector-v1.0.0-release.apk` — signed APK for direct install.
- `dist\Android\AMAYA-NSpector-v1.0.0-release.aab` — signed Android App Bundle for Google Play.
- `dist\Android\SHA256SUMS.txt` — release checksums.

Install the APK with `adb install -r dist\Android\AMAYA-NSpector-v1.0.0-release.apk`.
The app needs an internet connection for live data; the desktop build remains
the fully offline option. The signing keystore is generated locally at
`android\app\release.jks` and is intentionally gitignored — keep it safe to
preserve the app's update signing identity.

## Data

- NSpector source CSV/TXT exports ship in `resources\data` inside the build and
  are copied to `%APPDATA%\AMAYA NSpector\data` on first run. Drop updated
  exports there and press **Sync**.
- The SQLite database is `%APPDATA%\AMAYA NSpector\nspector.db`.
- The AMAYA snapshot is bundled in `resources\amaya` and served read-only at
  `/amaya-imei-control-center/`.

Nothing is fetched at runtime; fonts, data and code are local.

## Keyboard

| Key | Action |
| --- | --- |
| `Ctrl` / `⌘` + `K` | Focus the global serial search |
| `/` | Open unified lookup |
| `1`–`5` | Switch workspace |
| `↑` / `↓` | Move through search suggestions |
| `Enter` | Open the highlighted dossier |
| `?` | Show the shortcut sheet |
| `Esc` | Close a panel, dialog or suggestions |

## Project layout

```
electron/main.js        desktop shell, first-run data seeding, menus, IPC
electron/preload.js     audited contextBridge to desktop-only capabilities
server/server.js        unified Express API + WebSocket live sync
server/amaya.js         AMAYA snapshot index, lookup, search, overlap
server/db.js            SQLite schema/open
server/core.js          CSV parsing / normalization
server/sync.js          ingest pipeline
server/reason.js        duplicate, TAC and price reasoning
web/                    merged shell (index.html, shell.css, shell.js)
web/nspector.js         NSpector client, scoped for the merged shell
vendor/amaya/           AMAYA PWA snapshot
scripts/build.js        assembles dist\AMAYA-NSpector
scripts/stage-android.js stages the Capacitor web bundle
scripts/collect-android.js publishes signed APK/AAB artifacts
scripts/check.js        static sanity checks
android/                native Capacitor Android project
```

## Build notes

`scripts/build.js` reuses the Electron runtime that sits one directory above
this project (the installed NSpector) and packs `electron/`, `server/`, `web/`
and `node_modules/` into `resources\app.asar` with
`node_modules/better-sqlite3` unpacked for the Electron ABI.
