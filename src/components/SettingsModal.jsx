import React, { useState } from "react";

const fallbackApi = {
  settings: {
    set: async () => null,
  },
  data: {
    export: async () => ({ canceled: true }),
    import: async () => ({ canceled: true }),
  },
};

const api = window.api || fallbackApi;

export default function SettingsModal({ currentKey, onClose, onSaved, onDataChanged }) {
  const [value, setValue] = useState(currentKey || "");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dataMsg, setDataMsg] = useState("");
  const [dataErr, setDataErr] = useState("");

  async function save() {
    const normalized = value.trim();
    setSaving(true);
    await Promise.all([
      api.settings.set("metadata_api_key", normalized),
      api.settings.set("tmdb_api_key", normalized),
    ]);
    setSaving(false);
    onSaved(normalized);
  }

  async function handleExport() {
    setDataErr("");
    setDataMsg("");
    setBusy(true);
    try {
      const res = await api.data.export();
      if (!res?.canceled) {
        setDataMsg(`Exported ${res.count} item${res.count === 1 ? "" : "s"}.`);
      }
    } catch (err) {
      setDataErr(err.message || "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    setDataErr("");
    setDataMsg("");
    setBusy(true);
    try {
      const res = await api.data.import();
      if (!res?.canceled) {
        const skipped = res.skipped ? `, skipped ${res.skipped} duplicate${res.skipped === 1 ? "" : "s"}` : "";
        setDataMsg(`Imported ${res.added} item${res.added === 1 ? "" : "s"}${skipped}.`);
        onDataChanged?.();
      }
    } catch (err) {
      setDataErr(err.message || "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal-center" onMouseDown={(e) => e.stopPropagation()} style={{ height: "auto" }}>
        <div className="modal-header">
          <h3>Settings</h3>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <span className="field-label">TMDB API key</span>
          <input
            className="search-input"
            style={{ width: "100%", marginBottom: 10 }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste your TMDB API key or read access token"
            autoFocus
          />
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
            Free to get at{" "}
            <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" style={{ color: "var(--teal)" }}>
              themoviedb.org/settings/api
            </a>
            . Either the short v3 <em>API Key</em> or the long v4 <em>Read Access Token</em> works — the
            app detects which you pasted. Only used to look up movie/TV covers and details, and stored
            locally on this machine.
          </p>
          <button className="btn-amber" onClick={save} disabled={saving} style={{ marginTop: 10 }}>
            {saving ? "Saving…" : "Save"}
          </button>

          <hr style={{ border: "none", borderTop: "1px solid var(--hairline)", margin: "22px 0 16px" }} />

          <span className="field-label">Transfer your catalog</span>
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5, marginTop: 4 }}>
            Export writes your whole shelf — ratings, notes, completed status, and any cover images
            you picked from your device — to a single <code>.json</code> file. Copy it to another
            machine and Import it there to recreate the shelf. Importing skips items you already have.
          </p>
          <div className="image-actions" style={{ marginTop: 10 }}>
            <button className="btn-ghost" type="button" onClick={handleExport} disabled={busy}>
              {busy ? "Working…" : "Export catalog…"}
            </button>
            <button className="btn-ghost" type="button" onClick={handleImport} disabled={busy}>
              {busy ? "Working…" : "Import catalog…"}
            </button>
          </div>
          {dataMsg && <p style={{ fontSize: 12.5, color: "var(--teal)", marginTop: 10 }}>{dataMsg}</p>}
          {dataErr && <p style={{ fontSize: 12.5, color: "var(--danger)", marginTop: 10 }}>{dataErr}</p>}
        </div>
      </div>
    </div>
  );
}
