import React from "react";

const CATEGORY_LABELS = {
  movie: "Movies / TV",
  game: "Games",
  book: "Books",
};

export default function StatsPanel({ stats }) {
  if (!stats) return null;

  const byCategory = stats.byCategory || [];
  const byPlatform = stats.byPlatform || [];
  const topGenres = stats.topGenres || [];
  const byDecade = stats.byDecade || [];

  const maxCategory = Math.max(1, ...byCategory.map((c) => c.c));
  const maxPlatform = Math.max(1, ...byPlatform.map((p) => p.c));
  const maxGenre = Math.max(1, ...topGenres.map((g) => g.count));
  const maxDecade = Math.max(1, ...byDecade.map((d) => d.count));

  return (
    <div className="stats-scroll">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Titles in your catalog</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.unwatched}</div>
          <div className="stat-label">Still to go</div>
        </div>
      </div>

      {byCategory.length > 0 && (
        <>
          <h3 className="stats-section-title">By category</h3>
          {byCategory.map((c) => (
            <div className="bar-row" key={c.category}>
              <div className="bar-label">{CATEGORY_LABELS[c.category] || c.category}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(c.c / maxCategory) * 100}%` }} />
              </div>
              <div className="bar-count">{c.c}</div>
            </div>
          ))}
        </>
      )}

      {byPlatform.length > 0 && (
        <>
          <h3 className="stats-section-title" style={{ marginTop: 32 }}>
            By format / platform
          </h3>
          {byPlatform.map((p) => (
            <div className="bar-row" key={p.platform}>
              <div className="bar-label">{p.platform}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(p.c / maxPlatform) * 100}%` }} />
              </div>
              <div className="bar-count">{p.c}</div>
            </div>
          ))}
        </>
      )}

      {topGenres.length > 0 && (
        <>
          <h3 className="stats-section-title" style={{ marginTop: 32 }}>
            Top genres
          </h3>
          {topGenres.map((g) => (
            <div className="bar-row" key={g.genre}>
              <div className="bar-label">{g.genre}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(g.count / maxGenre) * 100}%` }} />
              </div>
              <div className="bar-count">{g.count}</div>
            </div>
          ))}
        </>
      )}

      {byDecade.length > 0 && (
        <>
          <h3 className="stats-section-title" style={{ marginTop: 32 }}>
            By decade
          </h3>
          {byDecade.map((d) => (
            <div className="bar-row" key={d.decade}>
              <div className="bar-label">{d.decade}s</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(d.count / maxDecade) * 100}%` }} />
              </div>
              <div className="bar-count">{d.count}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
