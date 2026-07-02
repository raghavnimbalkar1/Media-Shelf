import React, { useEffect, useState, useCallback } from "react";
import MovieCard from "./components/MovieCard.jsx";
import AddMovieModal from "./components/AddMovieModal.jsx";
import MovieDetail from "./components/MovieDetail.jsx";
import StatsPanel from "./components/StatsPanel.jsx";
import SettingsModal from "./components/SettingsModal.jsx";

const fallbackApi = {
  settings: {
    get: async () => null,
    set: async () => null,
  },
  items: {
    add: async () => null,
    list: async () => [],
    update: async () => null,
    delete: async () => null,
    stats: async () => null,
  },
};

const api = window.api || fallbackApi;

export default function App() {
  const [view, setView] = useState("shelf");
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [completedFilter, setCompletedFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [selectedId, setSelectedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [stats, setStats] = useState(null);

  const loadItems = useCallback(async () => {
    const filters = { query, completed: completedFilter, category: categoryFilter, sort };
    const list = await api.items.list(filters);
    setItems(list);
  }, [query, completedFilter, categoryFilter, sort]);

  useEffect(() => {
    Promise.all([
      api.settings.get("metadata_api_key"),
      api.settings.get("tmdb_api_key"),
    ]).then(([metadataKey, legacyKey]) => setApiKey(metadataKey || legacyKey));
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (view === "stats") {
      api.items.stats().then(setStats);
    }
  }, [view, items]);

  async function handleAdded() {
    setShowAdd(false);
    await loadItems();
  }

  async function handleChange(id, patch) {
    await api.items.update(id, patch);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, ...patch, completed: patch.completed !== undefined ? !!patch.completed : item.completed }
          : item
      )
    );
  }

  async function handleDelete(id) {
    await api.items.delete(id);
    setSelectedId(null);
    await loadItems();
  }

  const selectedItem = items.find((item) => item.id === selectedId) || null;

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="wordmark">
          SHELF<span className="dot">.</span>
        </div>
        <div className="topbar-nav">
          <button className={`nav-btn ${view === "shelf" ? "active" : ""}`} onClick={() => setView("shelf")}>
            SHELF
          </button>
          <button className={`nav-btn ${view === "stats" ? "active" : ""}`} onClick={() => setView("stats")}>
            STATS
          </button>
        </div>
        <div className="topbar-spacer" />
        {view === "shelf" && (
          <div className="topbar-controls">
            <input
              className="search-input"
              placeholder="Search your catalog…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select className="select-chip" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All categories</option>
              <option value="movie">Movies / TV</option>
              <option value="game">Games</option>
              <option value="book">Books</option>
            </select>
            <select className="select-chip" value={completedFilter} onChange={(e) => setCompletedFilter(e.target.value)}>
              <option value="all">Any status</option>
              <option value="done">Completed</option>
              <option value="pending">Still on the list</option>
            </select>
            <select className="select-chip" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recent">Recently added</option>
              <option value="title">Title</option>
              <option value="year">Year</option>
              <option value="rating">Rating</option>
            </select>
          </div>
        )}
        <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">
          ⚙
        </button>
        <button className="btn-amber" onClick={() => setShowAdd(true)}>
          + Add
        </button>
      </div>

      {view === "shelf" ? (
        items.length === 0 ? (
          <div className="empty-state">
            <h2>Your catalog is ready.</h2>
            <p>
              Start with a movie, game, or book you own. Add it by hand, or use TMDB as a shortcut for movies and TV.
            </p>
            <button className="btn-amber" style={{ marginTop: 10 }} onClick={() => setShowAdd(true)}>
              + Add your first entry
            </button>
          </div>
        ) : (
          <div className="shelf-scroll">
            <div className="shelf-grid">
              {items.map((item) => (
                <MovieCard key={item.id} movie={item} onClick={() => setSelectedId(item.id)} />
              ))}
            </div>
          </div>
        )
      ) : (
        <StatsPanel stats={stats} />
      )}

      {showAdd && (
        <AddMovieModal
          hasApiKey={!!apiKey}
          onClose={() => setShowAdd(false)}
          onAdded={handleAdded}
          onOpenSettings={() => {
            setShowAdd(false);
            setShowSettings(true);
          }}
        />
      )}

      {selectedItem && (
        <MovieDetail
          movie={selectedItem}
          onClose={() => setSelectedId(null)}
          onChange={handleChange}
          onDelete={handleDelete}
        />
      )}

      {showSettings && (
        <SettingsModal
          currentKey={apiKey}
          onClose={() => setShowSettings(false)}
          onSaved={(key) => {
            setApiKey(key);
            setShowSettings(false);
          }}
          onDataChanged={loadItems}
        />
      )}
    </div>
  );
}
