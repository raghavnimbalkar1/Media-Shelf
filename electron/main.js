const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const { pathToFileURL, fileURLToPath } = require("url");
const db = require("./db");

const isDev = process.env.NODE_ENV === "development";

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#14111a",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  db.initDb(app.getPath("userData"));
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ---------- Small HTTPS JSON GET helper (no extra dependency needed) ----------
function httpsGetJson(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "media-shelf-app", ...extraHeaders } }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Request failed with status ${res.statusCode}: ${data.slice(0, 300)}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const TMDB_API_BASE = "https://api.themoviedb.org/3";

// TMDB hands out two credential formats: a short v3 "API Key" that rides in the
// query string, and a long v4 "Read Access Token" (a JWT) that must go in an
// Authorization: Bearer header. Detect which one the user pasted and call TMDB
// the way that credential expects.
function isV4Token(key) {
  return key.startsWith("eyJ") || key.split(".").length === 3;
}

function tmdbGet(pathAndQuery) {
  const apiKey = db.getSetting("tmdb_api_key");
  if (!apiKey) {
    throw new Error("No TMDB API key set yet. Add one in Settings, or just fill this in by hand.");
  }
  if (isV4Token(apiKey)) {
    return httpsGetJson(`${TMDB_API_BASE}${pathAndQuery}`, {
      Authorization: `Bearer ${apiKey}`,
    });
  }
  const sep = pathAndQuery.includes("?") ? "&" : "?";
  return httpsGetJson(`${TMDB_API_BASE}${pathAndQuery}${sep}api_key=${encodeURIComponent(apiKey)}`);
}

// ---------- IPC: settings ----------
ipcMain.handle("settings:get", (_e, key) => db.getSetting(key));
ipcMain.handle("settings:set", (_e, key, value) => db.setSetting(key, value));

// ---------- IPC: TMDB search (optional helper, movies/TV only) ----------
ipcMain.handle("tmdb:search", async (_e, query) => {
  const json = await tmdbGet(
    `/search/multi?query=${encodeURIComponent(query)}&include_adult=false`
  );
  return (json.results || [])
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, 12)
    .map((r) => ({
      tmdb_id: r.id,
      media_kind: r.media_type,
      title: r.title || r.name,
      year: (r.release_date || r.first_air_date || "").slice(0, 4) || null,
      poster_url: r.poster_path ? `${TMDB_IMAGE_BASE}/w342${r.poster_path}` : null,
      overview: r.overview || "",
    }));
});

ipcMain.handle("tmdb:detail", async (_e, { tmdb_id, media_kind }) => {
  const kind = media_kind === "tv" ? "tv" : "movie";
  const json = await tmdbGet(`/${kind}/${tmdb_id}?append_to_response=credits`);

  let director = "";
  if (kind === "movie" && json.credits?.crew) {
    const d = json.credits.crew.find((c) => c.job === "Director");
    director = d ? d.name : "";
  } else if (kind === "tv" && json.created_by?.length) {
    director = json.created_by.map((c) => c.name).join(", ");
  }

  return {
    tmdb_id: json.id,
    title: json.title || json.name,
    year: Number((json.release_date || json.first_air_date || "").slice(0, 4)) || null,
    poster_url: json.poster_path ? `${TMDB_IMAGE_BASE}/w500${json.poster_path}` : null,
    backdrop_url: json.backdrop_path ? `${TMDB_IMAGE_BASE}/w1280${json.backdrop_path}` : null,
    overview: json.overview || "",
    genres: (json.genres || []).map((g) => g.name),
    runtime: json.runtime || (json.episode_run_time && json.episode_run_time[0]) || null,
    director,
  };
});

// ---------- IPC: local image picking ----------
ipcMain.handle("files:pickImage", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose a cover image",
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
  });
  if (result.canceled || !result.filePaths.length) return null;

  const sourcePath = result.filePaths[0];
  const ext = path.extname(sourcePath) || ".jpg";
  const destName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
  const destPath = path.join(coversDir(), destName);
  fs.copyFileSync(sourcePath, destPath);

  return pathToFileURL(destPath).toString();
});

// ---------- Cover-file helpers (used by export/import) ----------
function coversDir() {
  const dir = path.join(app.getPath("userData"), "covers");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// If the given path is a local file:// cover, read it back as base64 so it can
// travel inside the export file. Anything else (https/data URLs) needs nothing.
function embedLocalImage(imagePath) {
  if (!imagePath || !imagePath.startsWith("file://")) return null;
  try {
    const filePath = fileURLToPath(imagePath);
    const buf = fs.readFileSync(filePath);
    return { ext: path.extname(filePath) || ".jpg", data: buf.toString("base64") };
  } catch {
    return null; // missing file — export the row without its embedded image
  }
}

// Write an embedded image back out to this machine's covers folder and return
// the fresh file:// URL to store on the imported row.
function writeEmbeddedImage(embedded) {
  const ext = embedded.ext || ".jpg";
  const destName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
  const destPath = path.join(coversDir(), destName);
  fs.writeFileSync(destPath, Buffer.from(embedded.data, "base64"));
  return pathToFileURL(destPath).toString();
}

// ---------- IPC: export / import ----------
ipcMain.handle("data:export", async () => {
  const stamp = new Date().toISOString().slice(0, 10);
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Export your catalog",
    defaultPath: `media-shelf-${stamp}.mediashelf.json`,
    filters: [{ name: "Media Shelf export", extensions: ["json"] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };

  const items = db.getAllItemsRaw().map((row) => {
    const item = {};
    for (const col of db.EXPORTABLE_COLUMNS) item[col] = row[col];
    const poster = embedLocalImage(row.poster_path);
    if (poster) item.poster_embedded = poster;
    const backdrop = embedLocalImage(row.backdrop_path);
    if (backdrop) item.backdrop_embedded = backdrop;
    return item;
  });

  const payload = {
    format: "media-shelf-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    count: items.length,
    items,
  };
  fs.writeFileSync(result.filePath, JSON.stringify(payload, null, 2), "utf8");
  return { canceled: false, filePath: result.filePath, count: items.length };
});

ipcMain.handle("data:import", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Import a catalog export",
    properties: ["openFile"],
    filters: [{ name: "Media Shelf export", extensions: ["json"] }],
  });
  if (result.canceled || !result.filePaths.length) return { canceled: true };

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(result.filePaths[0], "utf8"));
  } catch {
    throw new Error("That file isn't valid JSON — pick a Media Shelf export file.");
  }
  const items = Array.isArray(parsed) ? parsed : parsed.items;
  if (!Array.isArray(items)) {
    throw new Error("That doesn't look like a Media Shelf export.");
  }

  let added = 0;
  let skipped = 0;
  for (const raw of items) {
    if (!raw || !raw.title) {
      skipped++;
      continue;
    }
    if (db.findDuplicate({ title: raw.title, year: raw.year, category: raw.category })) {
      skipped++;
      continue;
    }
    const item = { ...raw };
    if (item.poster_embedded) {
      try {
        item.poster_path = writeEmbeddedImage(item.poster_embedded);
      } catch {
        /* keep whatever poster_path came in */
      }
      delete item.poster_embedded;
    }
    if (item.backdrop_embedded) {
      try {
        item.backdrop_path = writeEmbeddedImage(item.backdrop_embedded);
      } catch {
        /* keep whatever backdrop_path came in */
      }
      delete item.backdrop_embedded;
    }
    db.importItem(item);
    added++;
  }
  return { canceled: false, added, skipped, total: items.length };
});

// ---------- IPC: items CRUD ----------
ipcMain.handle("items:add", (_e, payload) => db.addItem(payload));
ipcMain.handle("items:list", (_e, filters) => db.getItems(filters));
ipcMain.handle("items:update", (_e, id, patch) => db.updateItem(id, patch));
ipcMain.handle("items:stats", () => db.getStats());
ipcMain.handle("items:delete", (_e, id) => {
  const removed = db.deleteItem(id);
  if (removed?.poster_path?.startsWith("file://")) {
    try {
      const filePath = fileURLToPath(removed.poster_path);
      if (filePath.startsWith(coversDir())) fs.unlinkSync(filePath);
    } catch {
      // best-effort cleanup only, fine if it fails
    }
  }
  return { id };
});
