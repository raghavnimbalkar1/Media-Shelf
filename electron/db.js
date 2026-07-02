const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

let db;

function initDb(userDataPath) {
  if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true });
  const dbPath = path.join(userDataPath, "media-shelf.sqlite");

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL DEFAULT 'movie',
      title TEXT NOT NULL,
      creator TEXT,
      year INTEGER,
      platform TEXT,
      poster_path TEXT,
      backdrop_path TEXT,
      description TEXT,
      genres TEXT,
      length_value INTEGER,
      tmdb_id INTEGER,
      rating_personal INTEGER,
      completed INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      date_added TEXT NOT NULL,
      date_completed TEXT
    );
  `);

  return db;
}

function getSetting(key) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
  return { key, value };
}

function addItem(payload) {
  const stmt = db.prepare(`
    INSERT INTO items (
      category, title, creator, year, platform, poster_path, backdrop_path,
      description, genres, length_value, tmdb_id, completed, notes, date_added
    ) VALUES (
      @category, @title, @creator, @year, @platform, @poster_path, @backdrop_path,
      @description, @genres, @length_value, @tmdb_id, 0, '', @date_added
    )
  `);
  const info = stmt.run({
    category: payload.category || "movie",
    title: payload.title,
    creator: payload.creator || "",
    year: payload.year ?? null,
    platform: payload.platform || "",
    poster_path: payload.poster_path || null,
    backdrop_path: payload.backdrop_path || null,
    description: payload.description || "",
    genres: JSON.stringify(payload.genres ?? []),
    length_value: payload.length_value ?? null,
    tmdb_id: payload.tmdb_id ?? null,
    date_added: new Date().toISOString(),
  });
  return getItemById(info.lastInsertRowid);
}

function getItemById(id) {
  const row = db.prepare("SELECT * FROM items WHERE id = ?").get(id);
  return row ? hydrate(row) : null;
}

function getItems({ query, category, completed, sort } = {}) {
  let sql = "SELECT * FROM items WHERE 1=1";
  const params = [];

  if (query) {
    sql += " AND (title LIKE ? OR platform LIKE ? OR creator LIKE ?)";
    params.push(`%${query}%`, `%${query}%`, `%${query}%`);
  }
  if (category && category !== "all") {
    sql += " AND category = ?";
    params.push(category);
  }
  if (completed === "done") {
    sql += " AND completed = 1";
  } else if (completed === "pending") {
    sql += " AND completed = 0";
  }

  switch (sort) {
    case "title":
      sql += " ORDER BY title COLLATE NOCASE ASC";
      break;
    case "year":
      sql += " ORDER BY year DESC";
      break;
    case "rating":
      sql += " ORDER BY rating_personal DESC, title ASC";
      break;
    default:
      sql += " ORDER BY date_added DESC";
  }

  const rows = db.prepare(sql).all(...params);
  return rows.map(hydrate);
}

function updateItem(id, patch) {
  const fields = [];
  const params = {};
  const allowed = [
    "category",
    "title",
    "creator",
    "year",
    "platform",
    "poster_path",
    "backdrop_path",
    "description",
    "length_value",
    "rating_personal",
    "completed",
    "notes",
    "date_completed",
  ];
  for (const key of allowed) {
    if (key in patch) {
      fields.push(`${key} = @${key}`);
      // SQLite bindings can't take JS booleans — store completed as 0/1.
      params[key] = key === "completed" ? (patch[key] ? 1 : 0) : patch[key];
    }
  }
  if ("genres" in patch) {
    fields.push("genres = @genres");
    params.genres = JSON.stringify(patch.genres || []);
  }
  if (fields.length === 0) return getItemById(id);

  params.id = id;
  db.prepare(`UPDATE items SET ${fields.join(", ")} WHERE id = @id`).run(params);
  return getItemById(id);
}

function deleteItem(id) {
  const item = getItemById(id);
  db.prepare("DELETE FROM items WHERE id = ?").run(id);
  return item;
}

// ---------- Export / import ----------

// Every item column except the auto-increment id, in a stable order so the
// export format stays predictable across versions.
const EXPORTABLE_COLUMNS = [
  "category",
  "title",
  "creator",
  "year",
  "platform",
  "poster_path",
  "backdrop_path",
  "description",
  "genres",
  "length_value",
  "tmdb_id",
  "rating_personal",
  "completed",
  "notes",
  "date_added",
  "date_completed",
];

// Raw rows (genres left as the stored JSON string, completed as 0/1) so the
// export is a faithful snapshot the importer can round-trip.
function getAllItemsRaw() {
  return db.prepare("SELECT * FROM items ORDER BY date_added ASC").all();
}

function findDuplicate({ title, year, category }) {
  return db
    .prepare(
      "SELECT id FROM items WHERE title = ? AND category = ? AND IFNULL(year, -1) = IFNULL(?, -1)"
    )
    .get(title, category || "movie", year ?? null);
}

// Insert a single item coming from an export file, preserving its status,
// rating, notes and dates. `genres` may arrive as an array or a JSON string.
function importItem(item) {
  const genres = Array.isArray(item.genres)
    ? item.genres
    : (() => {
        try {
          return JSON.parse(item.genres || "[]");
        } catch {
          return [];
        }
      })();

  const stmt = db.prepare(`
    INSERT INTO items (
      category, title, creator, year, platform, poster_path, backdrop_path,
      description, genres, length_value, tmdb_id, rating_personal, completed,
      notes, date_added, date_completed
    ) VALUES (
      @category, @title, @creator, @year, @platform, @poster_path, @backdrop_path,
      @description, @genres, @length_value, @tmdb_id, @rating_personal, @completed,
      @notes, @date_added, @date_completed
    )
  `);
  const info = stmt.run({
    category: item.category || "movie",
    title: item.title,
    creator: item.creator || "",
    year: item.year ?? null,
    platform: item.platform || "",
    poster_path: item.poster_path || null,
    backdrop_path: item.backdrop_path || null,
    description: item.description || "",
    genres: JSON.stringify(genres),
    length_value: item.length_value ?? null,
    tmdb_id: item.tmdb_id ?? null,
    rating_personal: item.rating_personal ?? null,
    completed: item.completed ? 1 : 0,
    notes: item.notes || "",
    date_added: item.date_added || new Date().toISOString(),
    date_completed: item.date_completed || null,
  });
  return getItemById(info.lastInsertRowid);
}

function getStats() {
  const total = db.prepare("SELECT COUNT(*) as c FROM items").get().c;
  const completed = db.prepare("SELECT COUNT(*) as c FROM items WHERE completed = 1").get().c;
  const byCategory = db.prepare("SELECT category, COUNT(*) as c FROM items GROUP BY category").all();
  const byPlatform = db
    .prepare("SELECT platform, COUNT(*) as c FROM items WHERE platform != '' GROUP BY platform ORDER BY c DESC LIMIT 8")
    .all();

  const rows = db.prepare("SELECT genres FROM items").all();
  const genreCounts = {};
  for (const row of rows) {
    let genres = [];
    try {
      genres = JSON.parse(row.genres || "[]");
    } catch {
      genres = [];
    }
    for (const g of genres) genreCounts[g] = (genreCounts[g] || 0) + 1;
  }
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([genre, count]) => ({ genre, count }));

  const byDecadeRows = db.prepare("SELECT year FROM items WHERE year IS NOT NULL").all();
  const decadeCounts = {};
  for (const { year } of byDecadeRows) {
    const decade = Math.floor(year / 10) * 10;
    decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
  }
  const byDecade = Object.entries(decadeCounts)
    .sort((a, b) => a[0] - b[0])
    .map(([decade, count]) => ({ decade: Number(decade), count }));

  return {
    total,
    completed,
    watched: completed,
    unwatched: total - completed,
    pending: total - completed,
    byCategory,
    byPlatform,
    topGenres,
    byDecade,
  };
}

function hydrate(row) {
  let genres = [];
  try {
    genres = JSON.parse(row.genres || "[]");
  } catch {
    genres = [];
  }
  return { ...row, genres, completed: !!row.completed };
}

module.exports = {
  initDb,
  getSetting,
  setSetting,
  addItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
  getStats,
  getAllItemsRaw,
  findDuplicate,
  importItem,
  EXPORTABLE_COLUMNS,
};

