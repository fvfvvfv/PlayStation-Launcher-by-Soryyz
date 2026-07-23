import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useLocale } from "../hooks/useLocale";
import { VirtualKeyboard } from "./VirtualKeyboard";
import type { GameEntry, SortMode, TagsData } from "../types";
import type { Icons } from "./ControllerIcons";

interface Props {
  games: GameEntry[];
  loading: boolean;
  onLaunch: (path: string) => void;
  onShowDetails: (game: GameEntry) => void;
  focusIndex: number;
  onFocusChange: (index: number) => void;
  showFocus: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  libColsRef?: React.MutableRefObject<number>;
  favorites: Set<string>;
  onToggleFav: (path: string) => void;
  gamepadHandlerRef?: React.MutableRefObject<((action: string) => boolean) | null>;
  icons: Icons;
  gpadActive: boolean;
  showHints: boolean;
  viewMode: "grid" | "list";
  showGameCovers: boolean;
  recentGames: string[];
  onViewModeChange: (v: "grid" | "list") => void;
  tagsData: TagsData;
  onTagsChange: (data: TagsData) => void;
}

const SORT_OPTIONS: { value: SortMode; labelKey: string }[] = [
  { value: "name", labelKey: "sort_name" },
  { value: "source", labelKey: "sort_source" },
  { value: "recent", labelKey: "sort_recent" },
];

const TAG_FILTER_ALL = "__all__";
const TAG_FILTER_UNTAGGED = "__untagged__";

export function GamesLibrary({ games, loading, onLaunch, onShowDetails, focusIndex, onFocusChange, showFocus, searchInputRef, libColsRef, favorites, onToggleFav, gamepadHandlerRef, icons, gpadActive, showHints, viewMode, onViewModeChange, showGameCovers, recentGames, tagsData, onTagsChange }: Props) {
  const { t, plural, lang } = useLocale();
  const gridRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(4);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [showKb, setShowKb] = useState(false);
  const [kbFocus, setKbFocus] = useState(0);
  const [favError, setFavError] = useState<string | null>(null);
  const [customCovers, setCustomCovers] = useState<Record<string, string>>({});
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [hideUntagged, setHideUntagged] = useState(true);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [tagFocusIdx, setTagFocusIdx] = useState(0);
  const sortBtnRef = useRef<HTMLButtonElement>(null);
  const tagBtnRef = useRef<HTMLButtonElement>(null);

  const loadCustomCovers = useCallback(async () => {
    const map: Record<string, string> = {};
    for (const g of games) {
      if (g.source === "Steam") continue;
      try {
        const cover = await invoke<string | null>("get_cover_image", { gamePath: g.path });
        if (cover) map[g.path] = cover;
      } catch {}
    }
    setCustomCovers(map);
  }, [games]);

  useEffect(() => { loadCustomCovers(); }, [loadCustomCovers]);

  const pickCover = useCallback(async (gamePath: string) => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "bmp"] }],
      });
      if (selected) {
        await invoke("set_game_cover", { gamePath, coverPath: selected });
        const b64 = await invoke<string | null>("get_cover_image", { gamePath });
        if (b64) setCustomCovers((prev) => ({ ...prev, [gamePath]: b64 }));
      }
    } catch {}
  }, []);

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

  const kbKeysListRef = useRef<HTMLElement[]>([]);
  const kbLayoutRef = useRef<{ perRow: number[]; totalKeys: number; funcCount: number }>({ perRow: [10, 10, 10, 10, 4, 5], totalKeys: 49, funcCount: 0 });
  const filteredRef = useRef<GameEntry[]>([]);

  const handleToggleFav = useCallback((path: string) => {
    if (!favorites.has(path) && favorites.size >= 6) {
      setFavError(t("fav_limit"));
      setTimeout(() => setFavError(null), 3000);
      return;
    }
    onToggleFav(path);
  }, [favorites, onToggleFav, t]);

  const cycleSort = useCallback(() => {
    setSortMode((prev) => {
      const idx = SORT_OPTIONS.findIndex((o) => o.value === prev);
      return SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length].value;
    });
  }, []);

  useEffect(() => {
    if (gamepadHandlerRef) {
      gamepadHandlerRef.current = (action: string) => {
        const f = filteredRef.current;
        if (showKb) {
          const { perRow, totalKeys, funcCount } = kbLayoutRef.current;
          const rowStarts: number[] = [];
          let pos = funcCount;
          for (let r = 0; r < perRow.length; r++) {
            rowStarts.push(pos);
            pos += perRow[r];
          }
          const rowEnds = rowStarts.map((s, i) => s + perRow[i] - 1);
          const spaceIdx = totalKeys - 1;

          switch (action) {
            case "up": {
              setKbFocus((prev) => {
                const col = (() => {
                  for (let r = 0; r < rowStarts.length; r++) {
                    if (prev >= rowStarts[r] && prev <= rowEnds[r]) return prev - rowStarts[r];
                  }
                  return 0;
                })();
                let newRow = -1;
                for (let r = 0; r < rowStarts.length; r++) {
                  if (prev >= rowStarts[r] && prev <= rowEnds[r]) { newRow = r - 1; break; }
                }
                if (prev === spaceIdx) { newRow = rowStarts.length - 1; }
                if (newRow < 0) { newRow = rowStarts.length - 1; }
                const maxCol = perRow[newRow] - 1;
                return Math.min(rowStarts[newRow] + col, rowStarts[newRow] + maxCol);
              });
              return true;
            }
            case "down": {
              setKbFocus((prev) => {
                const col = (() => {
                  for (let r = 0; r < rowStarts.length; r++) {
                    if (prev >= rowStarts[r] && prev <= rowEnds[r]) return prev - rowStarts[r];
                  }
                  return 0;
                })();
                let newRow = -1;
                for (let r = 0; r < rowStarts.length; r++) {
                  if (prev >= rowStarts[r] && prev <= rowEnds[r]) { newRow = r + 1; break; }
                }
                if (newRow >= rowStarts.length) { return spaceIdx; }
                if (newRow < 0) { newRow = 0; }
                const maxCol = perRow[newRow] - 1;
                return Math.min(rowStarts[newRow] + col, rowStarts[newRow] + maxCol);
              });
              return true;
            }
            case "left": {
              setKbFocus((prev) => Math.max(prev - 1, 0));
              return true;
            }
            case "right": {
              setKbFocus((prev) => Math.min(prev + 1, totalKeys - 1));
              return true;
            }
            case "confirm": {
              const el = kbKeysListRef.current[kbFocus];
              if (el) el.click();
              return true;
            }
            case "back":
              setShowKb(false);
              return true;
          }
          return false;
        }
        if (action === "confirm") {
          const game = f[focusIndex];
          if (game) onShowDetails(game);
          return true;
        }
        if (action === "cycle_sort") {
          cycleSort();
          return true;
        }
        if (action === "open_kb") {
          setShowKb((v) => !v);
          return true;
        }
        if (action === "toggle_view") {
          onViewModeChange(viewMode === "grid" ? "list" : "grid");
          return true;
        }
        if (action === "pick_cover") {
          const game = f[focusIndex];
          if (game && game.source !== "Steam") pickCover(game.path);
          return true;
        }
        if (showTagDropdown) {
          const tagOptLen = 1 + tagsData.definitions.length + 2;
          if (action === "toggle_tag_filter" || action === "back") {
            setShowTagDropdown(false);
            onFocusChange(0);
            return true;
          }
          if (action === "up") {
            setTagFocusIdx((prev) => Math.max(prev - 1, 0));
            return true;
          }
          if (action === "down") {
            setTagFocusIdx((prev) => Math.min(prev + 1, tagOptLen - 1));
            return true;
          }
          if (action === "left" || action === "right") {
            return true;
          }
          if (action === "confirm") {
            const idx = tagFocusIdx;
            const defs = tagsData.definitions;
            if (idx === 0) { setTagFilter(null); setHideUntagged(false); setShowTagDropdown(false); }
            else if (idx >= 1 && idx <= defs.length) { setTagFilter(defs[idx - 1].id); setShowTagDropdown(false); }
            else if (idx === defs.length + 1) { setHideUntagged(true); }
            else if (idx === defs.length + 2) { setHideUntagged(false); }
            return true;
          }
        }
        if (action === "toggle_tag_filter") {
          setShowTagDropdown((v) => !v);
          setTagFocusIdx(0);
          return true;
        }
        if (action === "toggle_fav") {
          const game = f[focusIndex];
          if (game) handleToggleFav(game.path);
          return true;
        }
        return false;
      };
      return () => { if (gamepadHandlerRef) gamepadHandlerRef.current = null; };

    }
  }, [gamepadHandlerRef, showKb, kbFocus, cycleSort, focusIndex, handleToggleFav, onLaunch, pickCover, onShowDetails, showTagDropdown, tagFocusIdx, tagFilter, hideUntagged, tagsData]);

  const getTagName = useCallback((id: string) => {
    const def = tagsData.definitions.find((d) => d.id === id);
    if (!def) return id;
    return def.names[lang] || def.names["en"] || id;
  }, [tagsData, lang]);

  const sorted = useMemo(() => {
    let list = [...games];
    switch (sortMode) {
      case "name":
        list.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        break;
      case "source":
        list.sort((a, b) => a.source.localeCompare(b.source) || a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        break;
      case "recent": {
        const recentMap = new Map(recentGames.map((p, i) => [p, i]));
        list.sort((a, b) => {
          const ai = recentMap.get(a.path);
          const bi = recentMap.get(b.path);
          if (ai !== undefined && bi !== undefined) return ai - bi;
          if (ai !== undefined) return -1;
          if (bi !== undefined) return 1;
          return 0;
        });
        break;
      }
    }
    list.sort((a, b) => {
      const af = favorites.has(a.path) ? 0 : 1;
      const bf = favorites.has(b.path) ? 0 : 1;
      return af - bf;
    });
    if (tagFilter) {
      if (hideUntagged) {
        list = list.filter((g) => (tagsData.assignments[g.path] || []).includes(tagFilter) || (tagsData.assignments[g.path] || []).length === 0);
        list.sort((a, b) => {
          const aHas = (tagsData.assignments[a.path] || []).includes(tagFilter) ? 0 : 1;
          const bHas = (tagsData.assignments[b.path] || []).includes(tagFilter) ? 0 : 1;
          return aHas - bHas;
        });
      } else {
        list = list.filter((g) => (tagsData.assignments[g.path] || []).includes(tagFilter));
      }
    }
    return list;
  }, [games, sortMode, favorites, tagFilter, hideUntagged, tagsData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((g) => g.name.toLowerCase().includes(q));
  }, [sorted, query]);

  filteredRef.current = filtered;
  const focusedGame = filtered[focusIndex] || null;

  useEffect(() => {
    if (!showFocus || focusIndex < 0 || focusIndex >= filtered.length) return;
    const el = gridRef.current?.children[focusIndex] as HTMLElement | undefined;
    if (el) el.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [focusIndex, filtered.length, showFocus]);

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
        <div className="library-controls">
          <div className="search-box">
            <span className="search-trigger-icon" style={{ opacity: showHints ? 1 : 0 }}>
              {showHints && <icons.LtIcon />}
            </span>
            <input
              ref={searchInputRef}
              className="search-input"
              type="text"
              placeholder={t("search_placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ transform: showHints ? "none" : "translateX(-40px)" }}
              onFocus={() => { onFocusChange(-1); }}
            />
            {query && (
              <button className="search-clear" onClick={() => setQuery("")}>✕</button>
            )}
          </div>
          <div className="tag-filter-wrap" style={{ position: "relative" }}>
            <button
              ref={tagBtnRef}
              className="tag-filter-btn"
              onClick={() => setShowTagDropdown((v) => !v)}
            >
              <span className="tag-filter-btn-text">{tagFilter ? getTagName(tagFilter) : t("tag_all")}</span>
              {showHints && <span className="tag-filter-btn-icon"><icons.SelectIcon /></span>}
            </button>
            {showTagDropdown && (
              <div className="tag-filter-dropdown">
                {(() => {
                  const opts: { id: string; label: string; active: boolean; action: () => void }[] = [
                    { id: TAG_FILTER_ALL, label: t("tag_all"), active: !tagFilter, action: () => { setTagFilter(null); setHideUntagged(false); setShowTagDropdown(false); } },
                    ...tagsData.definitions.map((def) => ({
                      id: def.id,
                      label: getTagName(def.id),
                      active: tagFilter === def.id,
                      action: () => { setTagFilter(def.id); setShowTagDropdown(false); },
                    })),
                    { id: TAG_FILTER_UNTAGGED + "_end", label: t("tag_filter_end"), active: hideUntagged, action: () => setHideUntagged(true) },
                    { id: TAG_FILTER_UNTAGGED + "_hide", label: t("tag_filter_hide"), active: !hideUntagged, action: () => setHideUntagged(false) },
                  ];
                  return opts.map((opt, idx) => (
                    <button
                      key={opt.id}
                      className={`tag-filter-opt ${opt.active ? "active" : ""} ${tagFocusIdx === idx ? "focused" : ""}`}
                      onClick={opt.action}
                    >{opt.label}</button>
                  ));
                })()}
              </div>
            )}
          </div>
          <button ref={sortBtnRef} className="sort-trigger" onClick={cycleSort}>
            <span>{t(SORT_OPTIONS.find((o) => o.value === sortMode)?.labelKey || "sort_name")}</span>
            {showHints && <span className="sort-trigger-icon"><icons.RtIcon /></span>}
          </button>
          <button className="view-toggle" onClick={() => onViewModeChange(viewMode === "grid" ? "list" : "grid")} style={{ width: showHints ? 64 : 36 }}>
            <span className="view-toggle-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {viewMode === "grid"
                  ? <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>
                  : <><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></>}
              </svg>
            </span>
            <span className="view-toggle-gp" style={{ opacity: showHints ? 1 : 0, width: showHints ? 28 : 0, transition: "opacity 0.25s ease, width 0.25s ease" }}>
              <icons.ViewToggleIcon />
            </span>
          </button>
          <div className={`cover-hint-wrap${showHints && focusedGame && focusedGame.source !== "Steam" ? "" : " hidden"}`} style={{ maxWidth: showHints && focusedGame && focusedGame.source !== "Steam" ? 300 : 0 }}>
            <span className="cover-hint">
              <icons.R3Icon /> {t("set_cover")}
            </span>
          </div>
        </div>
      </div>

      <div className={`library-count ${filtered.length === 0 ? "empty" : ""}`}>
        {filtered.length === 0
          ? t("nothing_found")
          : plural(filtered.length, "game_found")}
      </div>

      <div className="library-scroll">
      <div className={`library-grid ${viewMode === "list" ? "library-list" : ""}`} ref={gridRef}>
        {filtered.map((game, i) => {
          const isFav = favorites.has(game.path);
          return (
            <div
              key={`${game.source}-${i}`}
              className={`library-card ${showFocus && focusIndex === i ? "focused" : ""} ${isFav ? "fav" : ""}`}
            >
              <button
                className={`fav-btn${isFav ? " faved" : ""}`}
                onClick={(e) => { e.stopPropagation(); handleToggleFav(game.path); }}
              >
                ★
              </button>
              {game.source !== "Steam" && (
                <button
                  className="cover-btn"
                  onClick={(e) => { e.stopPropagation(); pickCover(game.path); }}
                  title={t("set_cover")}
                >
                  +
                </button>
              )}
              <button
                className="library-card-inner"
                onClick={() => onShowDetails(game)}
              >
                <div className="library-card-cover">
                  {showGameCovers && (customCovers[game.path] || game.cover) ? (
                    <img src={customCovers[game.path] || game.cover} alt={game.name} className="library-card-img" />
                  ) : (
                    <span className="library-card-placeholder">
                      {game.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="library-card-body">
                  <span className="library-card-name">{game.name}</span>
                  <span className="library-card-source">{game.source}</span>
                </div>
              </button>
            </div>
          );
        })}
      </div>
      </div>

      {showKb && createPortal(
        <div className="vk-overlay" onClick={() => setShowKb(false)}>
          <div className="vk-overlay-inner" onClick={(e) => e.stopPropagation()}>
            <div className="vk-preview" data-placeholder={t("search_placeholder")}>{query}</div>
            <div className="vk-body">
              <VirtualKeyboard
                icons={icons}
                kbFocus={kbFocus}
                onKbFocusChange={setKbFocus}
                onInput={(ch) => setQuery((q) => q + ch)}
                onBackspace={() => setQuery((q) => q.slice(0, -1))}
                onEnter={() => { setShowKb(false); searchInputRef.current?.focus(); }}
                onClose={() => setShowKb(false)}
                buttonsRef={kbKeysListRef}
                layoutInfoRef={kbLayoutRef}
              />
              <div className="vk-exit-panel">
                <button className="vk-key vk-exit-standalone" onClick={() => setShowKb(false)}>
                  {t("exit")} <icons.BackIcon />
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {favError && (
        <div className="fav-error-toast" onClick={() => setFavError(null)}>
          {favError}
        </div>
      )}

      {games.length === 0 && (
        <div className="empty-state">
          <p>{t("not_found")}</p>
          <p className="empty-hint">{t("not_found_hint")}</p>
        </div>
      )}
    </div>
  );
}
