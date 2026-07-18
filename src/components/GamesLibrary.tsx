import { useRef, useEffect, useState } from "react";
import { useLocale } from "../hooks/useLocale";
import type { GameEntry } from "../types";

interface Props {
  games: GameEntry[];
  loading: boolean;
  onLaunch: (path: string) => void;
  focusIndex: number;
  onFocusChange: (index: number) => void;
  showFocus: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  libColsRef?: React.MutableRefObject<number>;
}

export function GamesLibrary({ games, loading, onLaunch, focusIndex, onFocusChange, showFocus, searchInputRef, libColsRef }: Props) {
  const { t, plural } = useLocale();
  const gridRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(4);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const calc = () => {
      const style = getComputedStyle(el);
      const template = style.gridTemplateColumns;
      const count = template.split(" ").filter((s) => s.trim() && s !== "none").length;
      if (count > 0) setCols(count);
    };
    calc();
    const obs = new ResizeObserver(calc);
    obs.observe(el);
    return () => obs.disconnect();
  }, [games]);

  useEffect(() => { if (libColsRef) libColsRef.current = cols; }, [cols, libColsRef]);

  const filtered = query.trim()
    ? games.filter((g) => g.name.toLowerCase().includes(query.toLowerCase()))
    : games;

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>{t("loading")}...</p>
      </div>
    );
  }

  return (
    <div className="games-library">
      <div className="library-header">
        <h2 className="library-title">{t("library")}</h2>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            ref={searchInputRef}
            className="search-input"
            type="text"
            placeholder={t("search_placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => onFocusChange(-1)}
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery("")}>✕</button>
          )}
        </div>
      </div>

      <div className={`library-count ${filtered.length === 0 ? "empty" : ""}`}>
        {filtered.length === 0
          ? t("nothing_found")
          : plural(filtered.length, "game_found")}
      </div>

      <div className="library-grid" ref={gridRef}>
        {filtered.map((game, i) => (
          <button
            key={`${game.source}-${i}`}
            className={`library-card ${showFocus && focusIndex === i ? "focused" : ""}`}
            onClick={() => onLaunch(game.path)}
          >
            <div className="library-card-cover">
              <span className="library-card-placeholder">
                {game.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="library-card-body">
              <span className="library-card-name">{game.name}</span>
              <span className="library-card-source">{game.source}</span>
            </div>
          </button>
        ))}
      </div>

      {games.length === 0 && (
        <div className="empty-state">
          <p>{t("not_found")}</p>
          <p className="empty-hint">{t("not_found_hint")}</p>
        </div>
      )}
    </div>
  );
}
