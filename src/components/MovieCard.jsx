import React from "react";

const CATEGORY_LABELS = {
  movie: "Movies/TV",
  game: "Games",
  book: "Books",
};

export default function MovieCard({ movie, onClick }) {
  const categoryLabel = CATEGORY_LABELS[movie.category] || "Item";

  return (
    <div className="case" onClick={onClick}>
      <div className="case-poster-wrap">
        {movie.poster_path ? (
          <img src={movie.poster_path} alt={movie.title} loading="lazy" />
        ) : (
          <div className="case-poster-fallback">{movie.title}</div>
        )}
        {movie.completed && <div className="case-watched-mark" title="Completed" />}
      </div>
      <div className="case-ledge" />
      <div className="case-spine">
        <span>{movie.year || "—"}</span>
        <span>·</span>
        <span>{movie.length_value ? `${movie.length_value}` : "—"}</span>
        <span>·</span>
        <span>{categoryLabel}</span>
      </div>
      <div className="case-title">{movie.title}</div>
      <div className="case-category">{movie.platform || "Your pick"}</div>
    </div>
  );
}
