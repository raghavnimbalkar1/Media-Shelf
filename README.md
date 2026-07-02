# Media Shelf

A cozy local shelf for your movie, game, and book collection. Search a title, it pulls
the cover art and details from TMDB, you pick the format (DVD / Blu-ray / 4K, or a game
platform, or a book edition), and it lands on your shelf. Everything is stored locally in
SQLite — no account, no server, works offline once added (except poster images, which load
from TMDB's CDN).

Version 1.0.

## Features

- **A visual shelf** of everything you own — movies/TV, games, and books, each as a cover.
- **TMDB lookup** for movies and TV: type a title and pull cover art, year, runtime, genres,
  director/creator, and a synopsis automatically. Games and books are added by hand.
- **Your own metadata** on every item: personal 1–5 rating, a "completed" toggle, and freeform
  notes (edition, condition, why you picked it up).
- **Cover images from your device** — pick any image file and it's copied into the app's own
  storage, or paste an image URL.
- **Search, filter, and sort** — filter by category or completed status, sort by recently added,
  title, year, or rating.
- **Stats view** — totals, completed vs. still-to-go, and breakdowns by category, format/platform,
  top genres, and decade.
- **Export / Import** — move your entire shelf between computers with one file (see below).
- Keyboard: **Esc** closes any open panel.

## First-time setup

1. Install [Node.js](https://nodejs.org) 20–26 (the app uses a native SQLite binding, so this
   range is the safest for local development).
2. In this folder, run:
   ```
   npm install
   ```
   This also rebuilds `better-sqlite3`'s native binary for Electron automatically (via the
   `postinstall` script). If you're on Windows and it fails, install the "Desktop development
   with C++" workload from Visual Studio Build Tools first — `better-sqlite3` needs a C++
   compiler to build its native module. On Mac, installing Xcode Command Line Tools
   (`xcode-select --install`) is usually enough.
3. Get a free TMDB API key or read access token at
   https://www.themoviedb.org/settings/api. Either format works — the short v3 **API Key** or
   the long v4 **Read Access Token**; the app detects which one you paste. Add it in the
   Settings panel (⚙) the first time you run it — it's stored locally, not hardcoded.

TMDB is only needed for the movie/TV lookup shortcut. You can add anything by hand without a key.

## Running it

```
npm run dev
```

This starts the Vite dev server and opens the Electron window pointed at it, with hot reload
for the UI.

## Building a distributable

- On a Mac, to build the Mac app (`.dmg`):
  ```
  npm run dist:mac
  ```
- On Windows, to build the Windows installer (`.exe`):
  ```
  npm run dist:win
  ```

Output lands in `release/`. Note: `electron-builder` builds for the platform you run it on —
build the Mac version on a Mac and the Windows version on Windows (cross-building needs extra
setup this project skips for simplicity).

### Updating an already-installed copy

Your collection lives **outside** the app bundle (see "Where your data lives"), so upgrading is
safe: rebuild, then drag the new **Media Shelf** into Applications and replace the old one. Your
shelf stays intact.

## Where your data lives

The SQLite database is stored in Electron's per-OS user data folder:
- Mac: `~/Library/Application Support/media-shelf/media-shelf.sqlite`
- Windows: `%APPDATA%\media-shelf\media-shelf.sqlite`

Cover images you pick from your device are copied into a `covers/` folder next to that database.

## Moving your shelf to another computer

Open **Settings** (the ⚙ button) → **Transfer your catalog**:

- **Export catalog…** writes your entire shelf — every item plus its rating, notes, completed
  status, and any cover images you chose from your device — into a single `.mediashelf.json`
  file. Local cover images are embedded inside the file, so nothing is left behind.
- **Import catalog…** on the other machine reads that file back and recreates the shelf. Items
  you already have (same title, year, and category) are skipped, so re-importing is safe and
  won't create duplicates.

Copy the exported `.json` to the other PC however you like (USB stick, AirDrop, email, a shared
drive) and import it there. This is a one-time transfer, not a live sync.

If you'd rather keep two machines continuously in step, point the SQLite database at a synced
folder (Dropbox, iCloud Drive, Syncthing, etc.) — just don't run the app on both machines at
the same time, since it's a single local file, not a live sync.

## Getting it onto Windows, iPhone, and iPad

- **Windows** — fully supported. On a Windows PC, run `npm install` then `npm run dist:win`; the
  installer `.exe` lands in `release/`. Move your data across with the Export/Import feature above.
- **iPhone / iPad** — Electron is a desktop-only runtime; it cannot run on iOS/iPadOS, so there's
  no way to package *this* app as-is for iPhone or iPad. The UI, though, is a plain React web app.
  Two realistic paths to mobile: (1) host the `src/` renderer as a small web app / PWA and swap
  the SQLite-over-IPC data layer for browser storage (IndexedDB), then "Add to Home Screen"; or
  (2) wrap that same web build with [Capacitor](https://capacitorjs.com) to produce a real native
  iOS app (requires a Mac with Xcode and, for the App Store, an Apple Developer account). Either
  way the metadata layer has to move from the Electron main process into the browser. The
  Export/Import file is the bridge for carrying your existing shelf over once a mobile build exists.

## Project layout

```
electron/
  main.js      — window creation, IPC handlers, TMDB HTTPS calls, export/import
  preload.js   — safe API surface exposed to the renderer
  db.js        — SQLite schema + queries (better-sqlite3)
src/
  App.jsx           — top-level state and layout
  useEscape.js      — small hook: close a panel on Esc
  components/
    MovieCard.jsx      — a single cover on the shelf
    AddMovieModal.jsx  — search TMDB, pick a category, add
    MovieDetail.jsx    — rating, completed toggle, notes, edit, delete
    StatsPanel.jsx     — collection breakdown
    SettingsModal.jsx  — TMDB API key + export/import
  index.css    — design tokens and all styling
```

## Ideas for later

- Cache poster images locally so covers show up fully offline
- Barcode scanning via webcam (UPC lookup → TMDB title match) for faster adds
- A vinyl records mode, reusing the same shelf/case UI with Discogs as the data source
