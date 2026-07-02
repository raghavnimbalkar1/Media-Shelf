import React, { useEffect, useRef, useState } from "react";
import useEscape from "../useEscape.js";

const fallbackApi = {
  tmdb: {
    search: async () => [],
    detail: async () => null,
  },
  items: {
    add: async () => null,
  },
  files: {
    pickImage: async () => null,
  },
};

const api = window.api || fallbackApi;

const CATEGORY_OPTIONS = [
  { key: "movie", label: "Movies / TV" },
  { key: "game", label: "Games" },
  { key: "book", label: "Books" },
];

const createInitialForm = () => ({
  category: "movie",
  title: "",
  creator: "",
  year: "",
  platform: "",
  poster_path: "",
  backdrop_path: "",
  description: "",
  genres: [],
  length_value: "",
  notes: "",
  tmdb_id: null,
});

export default function AddMovieModal({ onClose, onAdded, hasApiKey, onOpenSettings }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(createInitialForm);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef(null);

  useEscape(onClose);

  useEffect(() => {
    if (!hasApiKey || form.category !== "movie") {
      setResults([]);
      return;
    }
    if (!query.trim()) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const r = await api.tmdb.search(query.trim());
        setResults(r);
      } catch (err) {
        setError(err.message || "Search failed.");
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, hasApiKey, form.category]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function pickResult(result) {
    setLoading(true);
    setError("");
    try {
      const detail = await api.tmdb.detail({
        tmdb_id: result.tmdb_id,
        media_kind: result.media_kind,
      });
      setForm((prev) => ({
        ...prev,
        title: detail.title || prev.title,
        creator: detail.director || prev.creator,
        year: detail.year || prev.year,
        description: detail.overview || prev.description,
        poster_path: detail.poster_url || prev.poster_path,
        backdrop_path: detail.backdrop_url || prev.backdrop_path,
        genres: detail.genres || prev.genres,
        length_value: detail.runtime || prev.length_value,
        tmdb_id: detail.tmdb_id || prev.tmdb_id,
      }));
      setQuery("");
      setResults([]);
    } catch (err) {
      setError(err.message || "Could not load details.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePickImage() {
    const fileUrl = await api.files.pickImage();
    if (fileUrl) {
      updateField("poster_path", fileUrl);
    }
  }

  async function confirmAdd() {
    if (!form.title.trim()) {
      setError("Please add a title first.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        creator: form.creator.trim(),
        description: form.description.trim(),
        platform: form.platform.trim(),
        year: form.year ? Number(form.year) : null,
        length_value: form.length_value ? Number(form.length_value) : null,
        genres: form.genres || [],
      };
      const saved = await api.items.add(payload);
      onAdded(saved);
    } catch (err) {
      setError(err.message || "Could not save.");
      setSaving(false);
    }
  }

  const creatorLabel = {
    movie: "Director / Creator",
    game: "Developer",
    book: "Author",
  }[form.category] || "Creator";

  const platformLabel = {
    movie: "Format / Medium",
    game: "Platform",
    book: "Format",
  }[form.category] || "Platform";

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal-center" onMouseDown={(e) => e.stopPropagation()} style={{ height: 620 }}>
        <div className="modal-header">
          <h3>Add to your catalog</h3>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="form-grid">
            <div className="field-block full">
              <span className="field-label">Category</span>
              <select className="field-select" value={form.category} onChange={(e) => updateField("category", e.target.value)}>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-block full">
              <span className="field-label">Title</span>
              <input className="field-input" value={form.title} onChange={(e) => updateField("title", e.target.value)} placeholder="Enter a title" />
            </div>

            <div className="field-block">
              <span className="field-label">{creatorLabel}</span>
              <input className="field-input" value={form.creator} onChange={(e) => updateField("creator", e.target.value)} placeholder={creatorLabel} />
            </div>

            <div className="field-block">
              <span className="field-label">Year</span>
              <input className="field-input" value={form.year} onChange={(e) => updateField("year", e.target.value)} placeholder="1994" />
            </div>

            <div className="field-block full">
              <span className="field-label">{platformLabel}</span>
              <input className="field-input" value={form.platform} onChange={(e) => updateField("platform", e.target.value)} placeholder={form.category === "movie" ? "DVD / Blu-ray / 4K UHD" : form.category === "game" ? "Switch / PS5 / PC" : "Hardcover / Paperback"} />
            </div>

            <div className="field-block full">
              <span className="field-label">Description</span>
              <textarea className="field-textarea" value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Notes about why it matters to you" />
            </div>

            <div className="field-block">
              <span className="field-label">Length / Runtime</span>
              <input className="field-input" value={form.length_value} onChange={(e) => updateField("length_value", e.target.value)} placeholder={form.category === "movie" ? "120" : form.category === "game" ? "40" : "320"} />
            </div>

            <div className="field-block">
              <span className="field-label">Cover image</span>
              <div className="image-actions">
                <button className="btn-ghost" type="button" onClick={handlePickImage}>
                  Choose from device
                </button>
                <input
                  className="field-input"
                  value={form.poster_path}
                  onChange={(e) => updateField("poster_path", e.target.value)}
                  placeholder="Or paste an image URL"
                />
              </div>
            </div>

            {form.category === "movie" && (
              <div className="field-block full">
                <span className="field-label">Optional TMDB shortcut</span>
                <input
                  className="field-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={hasApiKey ? "Search a movie or show title" : "Add your API key in Settings for TMDB search"}
                />
                {loading && <div className="modal-hint">Searching…</div>}
                {!loading && error && <div className="modal-hint" style={{ color: "#c9705f" }}>{error}</div>}
                {!loading && !error && query && results.length === 0 && <div className="modal-hint">Nothing found for “{query}”.</div>}
                <div className="search-results compact">
                  {results.map((result) => (
                    <div key={`${result.media_kind}-${result.tmdb_id}`} className="search-result-row" onClick={() => pickResult(result)}>
                      {result.poster_url ? <img src={result.poster_url} alt={result.title} /> : <div className="search-result-fallback" />}
                      <div>
                        <div className="search-result-title">{result.title}</div>
                        <div className="search-result-year">{result.year || "—"} · {result.media_kind === "tv" ? "TV" : "Movie"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button className="btn-amber" onClick={confirmAdd} disabled={saving}>
              {saving ? "Saving…" : "Save to catalog"}
            </button>
            {hasApiKey ? null : (
              <button className="btn-ghost" type="button" onClick={onOpenSettings}>
                Add API key
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
