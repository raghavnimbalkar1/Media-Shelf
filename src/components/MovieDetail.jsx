import React, { useEffect, useMemo, useState } from "react";
import useEscape from "../useEscape.js";

const fallbackApi = {
  files: {
    pickImage: async () => null,
  },
  items: {
    update: async () => null,
  },
};

const api = window.api || fallbackApi;

const CATEGORY_LABELS = {
  movie: "Movies / TV",
  game: "Games",
  book: "Books",
};

export default function MovieDetail({ movie, onClose, onChange, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    category: movie.category || "movie",
    title: movie.title || "",
    creator: movie.creator || "",
    year: movie.year ?? "",
    platform: movie.platform || "",
    poster_path: movie.poster_path || "",
    backdrop_path: movie.backdrop_path || "",
    description: movie.description || "",
    genres: movie.genres || [],
    length_value: movie.length_value ?? "",
    notes: movie.notes || "",
  });

  useEscape(onClose);

  useEffect(() => {
    setForm({
      category: movie.category || "movie",
      title: movie.title || "",
      creator: movie.creator || "",
      year: movie.year ?? "",
      platform: movie.platform || "",
      poster_path: movie.poster_path || "",
      backdrop_path: movie.backdrop_path || "",
      description: movie.description || "",
      genres: movie.genres || [],
      length_value: movie.length_value ?? "",
      notes: movie.notes || "",
    });
    setIsEditing(false);
  }, [movie.id]);

  const creatorLabel = useMemo(() => {
    if (form.category === "game") return "Developer";
    if (form.category === "book") return "Author";
    return "Director / Creator";
  }, [form.category]);

  const platformLabel = useMemo(() => {
    if (form.category === "game") return "Platform";
    if (form.category === "book") return "Format";
    return "Format / Medium";
  }, [form.category]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    onChange(movie.id, { [field]: value });
  }

  async function handlePickImage() {
    const fileUrl = await api.files.pickImage();
    if (fileUrl) {
      updateField("poster_path", fileUrl);
    }
  }

  function setRating(value) {
    const next = movie.rating_personal === value ? null : value;
    onChange(movie.id, { rating_personal: next });
  }

  function toggleCompleted() {
    onChange(movie.id, { completed: !movie.completed });
  }

  function confirmDelete() {
    if (window.confirm(`Remove "${movie.title}" from your catalog?`)) {
      onDelete(movie.id);
    }
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div
          className="detail-backdrop"
          style={{
            backgroundImage: movie.backdrop_path ? `url(${movie.backdrop_path})` : "none",
            background: movie.backdrop_path ? undefined : "var(--shelf-wood)",
          }}
        >
          <button
            className="icon-btn"
            style={{ position: "absolute", top: 10, right: 10, background: "rgba(20,17,26,0.6)" }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="detail-body">
          {movie.poster_path && <img className="detail-poster" src={movie.poster_path} alt={movie.title} />}
          <div className="detail-header-row">
            <div>
              <h2 className="detail-title">{movie.title}</h2>
              <div className="detail-meta">
                {movie.year || "—"} · {movie.length_value ? `${movie.length_value}` : "—"} · {CATEGORY_LABELS[form.category] || "Item"}
                {form.creator ? ` · ${form.creator}` : ""}
              </div>
            </div>
            <button className="btn-ghost small" onClick={() => setIsEditing((prev) => !prev)}>
              {isEditing ? "Done" : "Edit"}
            </button>
          </div>

          {movie.genres?.length > 0 && (
            <div className="genre-row">
              {movie.genres.map((genre) => (
                <span key={genre} className="genre-chip">
                  {genre}
                </span>
              ))}
            </div>
          )}

          {!isEditing ? (
            <>
              {movie.description && <p className="detail-overview">{movie.description}</p>}

              <div className="field-block">
                <span className="field-label">Your rating</span>
                <div className="rating-dots">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      className={`rating-dot ${movie.rating_personal >= n ? "filled" : ""}`}
                      onClick={() => setRating(n)}
                      aria-label={`Rate ${n}`}
                    />
                  ))}
                </div>
              </div>

              <div className="field-block">
                <span className="field-label">Completed</span>
                <button className={`lamp-toggle ${movie.completed ? "on" : ""}`} onClick={toggleCompleted}>
                  <span className="track">
                    <span className="knob" />
                  </span>
                  <span className="label">{movie.completed ? "Completed" : "Still on the list"}</span>
                </button>
              </div>

              <div className="field-block">
                <span className="field-label">Notes</span>
                <textarea
                  className="notes-textarea"
                  placeholder="Edition details, condition, why you picked it up…"
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="form-grid detail-form">
              <div className="field-block full">
                <span className="field-label">Category</span>
                <select className="field-select" value={form.category} onChange={(e) => updateField("category", e.target.value)}>
                  <option value="movie">Movies / TV</option>
                  <option value="game">Games</option>
                  <option value="book">Books</option>
                </select>
              </div>

              <div className="field-block full">
                <span className="field-label">Title</span>
                <input className="field-input" value={form.title} onChange={(e) => updateField("title", e.target.value)} />
              </div>

              <div className="field-block">
                <span className="field-label">{creatorLabel}</span>
                <input className="field-input" value={form.creator} onChange={(e) => updateField("creator", e.target.value)} />
              </div>

              <div className="field-block">
                <span className="field-label">Year</span>
                <input className="field-input" value={form.year} onChange={(e) => updateField("year", e.target.value)} />
              </div>

              <div className="field-block full">
                <span className="field-label">{platformLabel}</span>
                <input className="field-input" value={form.platform} onChange={(e) => updateField("platform", e.target.value)} />
              </div>

              <div className="field-block full">
                <span className="field-label">Description</span>
                <textarea className="field-textarea" value={form.description} onChange={(e) => updateField("description", e.target.value)} />
              </div>

              <div className="field-block">
                <span className="field-label">Length / Runtime</span>
                <input className="field-input" value={form.length_value} onChange={(e) => updateField("length_value", e.target.value)} />
              </div>

              <div className="field-block">
                <span className="field-label">Cover image</span>
                <div className="image-actions">
                  <button className="btn-ghost small" type="button" onClick={handlePickImage}>
                    Choose from device
                  </button>
                  <input className="field-input" value={form.poster_path} onChange={(e) => updateField("poster_path", e.target.value)} placeholder="Paste an image URL" />
                </div>
              </div>

              <div className="field-block full">
                <span className="field-label">Notes</span>
                <textarea className="field-textarea" value={form.notes} onChange={(e) => updateField("notes", e.target.value)} />
              </div>
            </div>
          )}

          <button className="delete-link" onClick={confirmDelete}>
            Remove from catalog
          </button>
        </div>
      </div>
    </div>
  );
}
