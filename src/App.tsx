import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useGamepad } from "./hooks/useGamepad";
import { useGames } from "./hooks/useGames";
import { VideoIntro } from "./components/VideoIntro";
import { GamesLibrary } from "./components/GamesLibrary";
import { GameDetails } from "./components/GameDetails";
import { MediaScreen } from "./components/MediaScreen";
import { MediaViewer } from "./components/MediaViewer";
import { SettingsScreen } from "./components/SettingsScreen";
import { ControllerIcons } from "./components/ControllerIcons";
import { LocaleContext } from "./hooks/useLocale";
import { messages, pluralFn, type Lang } from "./locales";
import type { GameEntry, Screen, TagsData } from "./types";
import "./App.css";

type InputMode = "gamepad" | "mouse";

const TOP_ITEMS: { id: Screen; labelKey: string }[] = [
  { id: "home", labelKey: "home" },
  { id: "games", labelKey: "library" },
  { id: "media", labelKey: "media" },
  { id: "settings", labelKey: "settings" },
];

const BG_ACCENT_MAP: Record<string, string> = {
  "S1.mp4": "#2d7aff",
  "S2.mp4": "#1a6b3c",
  "S3.mp4": "#8B3A3A",
  "S4.mp4": "#269EB6",
  "S5.mp4": "#6C5C33",
  "S6.mp4": "#A42784",
  "S7.mp4": "#14b8a6",
  "S8.mp4": "#6D7B9D",
};

const MEDIA_TABS: { id: "screenshots" | "videos"; labelKey: string }[] = [
  { id: "screenshots", labelKey: "screenshots" },
  { id: "videos", labelKey: "videos" },
];

interface Section {
  id: string;
  cols: number;
}

function getSections(favCount: number, recentCount: number): Section[] {
  const sections: Section[] = [{ id: "hero", cols: 2 }];
  if (favCount > 0) {
    sections.push({ id: "favorites", cols: Math.min(favCount, 6) });
  }
  if (recentCount > 0) {
    sections.push({ id: "games", cols: Math.min(recentCount, 6) });
  }
  return sections;
}

function hexToRgba(hex: string, alpha: number): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16) || 45;
  const g = parseInt(c.substring(2, 4), 16) || 122;
  const b = parseInt(c.substring(4, 6), 16) || 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [screen, setScreen] = useState<Screen>("home");
  const [focusSec, setFocusSec] = useState(0);
  const [focusItem, setFocusItem] = useState(0);
  const [libFocus, setLibFocus] = useState(0);
  const [mediaFocus, setMediaFocus] = useState(0);
  const [inputMode, setInputMode] = useState<InputMode>("mouse");
  const [mediaTab, setMediaTab] = useState<"screenshots" | "videos" | null>(null);
  const [barState, setBarState] = useState<"normal" | "hiding" | "media" | "showing">("normal");
  const [hintsVisible, setHintsVisible] = useState(true);
  const [bgVideo, setBgVideo] = useState("S1.mp4");
  const [bgVideoEnabled, setBgVideoEnabled] = useState(true);
  const [bgDimmed, setBgDimmed] = useState(0.8);
  const [uiOpacity, setUiOpacity] = useState(0.85);
  const [gameCardOpacity, setGameCardOpacity] = useState(0.8);
  const [accentColor, setAccentColor] = useState("#2d7aff");
  const [accentAuto, setAccentAuto] = useState(true);
  const [lang, setLang] = useState<Lang>("ru");
  const [startScreen, setStartScreen] = useState("home");
  const { games, loading, launch, refresh, favorites, toggleFav, loadFavorites } = useGames();
  const [recentGames, setRecentGames] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [detailsGame, setDetailsGame] = useState<GameEntry | null>(null);
  const [detailsCover, setDetailsCover] = useState<string | null>(null);
  const [detailsTagEditor, setDetailsTagEditor] = useState(false);
  const detailsTagEditorRef = useRef(false);
  detailsTagEditorRef.current = detailsTagEditor;
  const [tagsData, setTagsData] = useState<TagsData>({ definitions: [], assignments: {} });
  const detailsGameRef = useRef<GameEntry | null>(null);
  detailsGameRef.current = detailsGame;
  const detailsGamepadRef = useRef<((action: string) => boolean) | null>(null);
  const [customCovers, setCustomCovers] = useState<Record<string, string>>({});

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

  useEffect(() => {
    invoke<TagsData>("get_tags_data").then(setTagsData).catch(() => {});
  }, []);

  const reloadRecent = useCallback(async () => {
    try {
      const cfg = await invoke<{ recent_games: string[] }>("get_config");
      if (cfg.recent_games) setRecentGames(cfg.recent_games);
    } catch {}
  }, []);

  const handleLaunch = useCallback(async (path: string, gameName?: string) => {
    await invoke("launch_game", { path, gameName: gameName || null });
    await reloadRecent();
    await loadFavorites();
  }, [reloadRecent, loadFavorites]);

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await invoke<{
        hints_visible: boolean; bg_video: string; bg_video_enabled: boolean; bg_dimmed: number;
        ui_opacity: number; game_card_opacity: number; accent_color: string; accent_auto: boolean; start_screen: string; language: string;
        recent_games: string[]; controller_theme: string; view_mode: string; show_game_covers: boolean;
      }>("get_config");
      if (cfg.hints_visible !== undefined) setHintsVisible(cfg.hints_visible);
      if (cfg.bg_video) setBgVideo(cfg.bg_video);
      if (cfg.bg_video_enabled !== undefined) setBgVideoEnabled(cfg.bg_video_enabled);
      if (cfg.bg_dimmed !== undefined) setBgDimmed(cfg.bg_dimmed);
      if (cfg.ui_opacity !== undefined) setUiOpacity(cfg.ui_opacity);
      if (cfg.game_card_opacity !== undefined) setGameCardOpacity(cfg.game_card_opacity);
      if (cfg.accent_color) setAccentColor(cfg.accent_color);
      if (cfg.accent_auto !== undefined) setAccentAuto(cfg.accent_auto);
      if (cfg.start_screen) setStartScreen(cfg.start_screen);
      if (cfg.language && ["ru", "en", "uk", "be", "kk", "uz"].includes(cfg.language)) setLang(cfg.language as Lang);
      if (cfg.recent_games) setRecentGames(cfg.recent_games);
      if (cfg.controller_theme) setControllerTheme(cfg.controller_theme);
      if (cfg.view_mode === "grid" || cfg.view_mode === "list") setViewMode(cfg.view_mode);
      if (cfg.show_game_covers !== undefined) setShowGameCovers(cfg.show_game_covers);
    } catch {}
    loadFavorites();
  }, [loadFavorites]);

  const refreshAll = useCallback(async () => {
    await refresh();
    await loadConfig();
    await loadFavorites();
  }, [refresh, loadConfig, loadFavorites]);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { if (screen === "home" && startScreen !== "home") setScreen(startScreen as Screen); }, []);
  useEffect(() => {
    invoke("set_discord_presence", { details: "В лаунчере" }).catch(() => {});
  }, []);

  useEffect(() => {
    const color = accentAuto ? (BG_ACCENT_MAP[bgVideo] || "#2d7aff") : accentColor;
    document.documentElement.style.setProperty("--accent", color);
    document.documentElement.style.setProperty("--accent-glow", hexToRgba(color, 0.3));
    document.documentElement.style.setProperty("--accent-bg-glow", hexToRgba(color, 0.1));
  }, [accentColor, accentAuto, bgVideo]);

  useEffect(() => {
    document.documentElement.style.setProperty("--panel-alpha", String(uiOpacity));
  }, [uiOpacity]);

  useEffect(() => {
    document.documentElement.style.setProperty("--card-alpha", String(gameCardOpacity));
  }, [gameCardOpacity]);

  useEffect(() => {
    if (screen !== "home") return;
    const secs = getSections(favorites.size, visibleGamesRef.current.length);
    const sec = secs[focusSec];
    if (!sec) return;
    if (sec.id === "hero") {
      document.querySelector(".home-sections")?.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const el = document.querySelector(`.home-section-${sec.id}`);
      if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focusSec, screen, favorites.size, getSections]);

  useEffect(() => {
    const interval = setInterval(() => refresh(), 3600000);
    return () => clearInterval(interval);
  }, [refresh]);

  const screenRef = useRef(screen);
  screenRef.current = screen;
  const focusSecRef = useRef(focusSec);
  focusSecRef.current = focusSec;
  const libFocusRef = useRef(libFocus);
  libFocusRef.current = libFocus;
  const mediaFocusRef = useRef(mediaFocus);
  mediaFocusRef.current = mediaFocus;
  const mediaTabRef = useRef(mediaTab);
  mediaTabRef.current = mediaTab;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const libColsRef = useRef(4);
  const libGamepadHandlerRef = useRef<((action: string) => boolean) | null>(null);
  const gamesRef = useRef(games);
  gamesRef.current = games;
  const visibleGamesRef = useRef<GameEntry[]>([]);
  const recentGamesRef = useRef<string[]>([]);
  recentGamesRef.current = recentGames;

  useEffect(() => {
    invoke("get_config").then((cfg: any) => {
      invoke("set_config", { config: { ...cfg, hints_visible: hintsVisible } });
    }).catch(() => {});
  }, [hintsVisible]);

  useEffect(() => {
    invoke("get_config").then((cfg: any) => {
      invoke("set_config", { config: { ...cfg, view_mode: viewMode } });
    }).catch(() => {});
  }, [viewMode]);

  useEffect(() => {
    const onMouse = () => setInputMode("mouse");
    const preventCtx = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("mousedown", onMouse);
    window.addEventListener("contextmenu", preventCtx);
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("mousedown", onMouse);
      window.removeEventListener("contextmenu", preventCtx);
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (focused && !detailsGameRef.current) {
        invoke("set_discord_presence", { details: "В лаунчере" }).catch(() => {});
      }
    }).then((f) => { unlisten = f; });
    return () => { unlisten?.(); };
  }, []);

  const openMediaViewer = useCallback((tab: "screenshots" | "videos") => {
    setBarState("hiding");
    setTimeout(() => {
      setMediaTab(tab);
      setBarState("media");
    }, 200);
  }, []);

  const pendingScreenRef = useRef<Screen | null>(null);

  const closeMediaViewer = useCallback(() => {
    setBarState("showing");
    setTimeout(() => {
      setMediaTab(null);
      setBarState("normal");
    }, 200);
  }, []);

  const changeScreen = useCallback((s: Screen) => {
    if (screen === "settings" && s !== "settings" && settingsDirtyRef.current) {
      pendingScreenRef.current = s;
      setConfirmPending(true);
      return;
    }
    setScreen(s);
  }, [screen]);

  const handleConfirmSave = useCallback(async () => {
    await settingsSaveRef.current();
    setConfirmPending(false);
    const target = pendingScreenRef.current;
    pendingScreenRef.current = null;
    if (target) setScreen(target);
  }, []);

  const handleConfirmDiscard = useCallback(async () => {
    await loadConfig();
    setConfirmPending(false);
    pendingScreenRef.current = null;
  }, [loadConfig]);

  const showDetails = useCallback(async (game: GameEntry) => {
    setDetailsGame(game);
    setDetailsCover(customCovers[game.path] || game.cover || null);
  }, [customCovers]);

  const closeDetails = useCallback(() => {
    setDetailsGame(null);
    setDetailsCover(null);
    setDetailsTagEditor(false);
    invoke("set_discord_presence", { details: "В лаунчере" }).catch(() => {});
  }, []);

  const handleGamepad = useCallback(
    (action: string) => {
      try {
      setInputMode("gamepad");
      if (!action) return;
      const cs = screenRef.current;
      const g = gamesRef.current;
      const vg = visibleGamesRef.current;
      const rg = recentGamesRef.current;
      const secs = getSections(favorites.size, vg.length);
      const de = detailsGameRef.current;
      const dte = detailsTagEditorRef.current;

      // GameDetails overlay gamepad handling
      if (de) {
        if (dte && detailsGamepadRef.current?.(action)) return;
        if (dte && action === "back") { setDetailsTagEditor(false); return; }
        if (dte && action === "toggle_view") { setDetailsTagEditor(false); return; }
        if (!dte && action === "confirm") { handleLaunch(de.path, de.name); return; }
        if (!dte && action === "back") { closeDetails(); return; }
        if (!dte && action === "toggle_view") { setDetailsTagEditor(true); return; }
        if (action === "toggle_hints") { setHintsVisible((v) => !v); return; }
        return;
      }

      if (mediaTabRef.current) {
        return;
      }

      // Screen navigation with LB/RB (skip when MediaViewer tab is active)
      if (!mediaTabRef.current && (action === "lb" || action === "rb")) {
        const items = TOP_ITEMS;
        const curIdx = items.findIndex((t) => t.id === cs);
        const nextIdx = action === "rb"
          ? (curIdx + 1) % items.length
          : (curIdx - 1 + items.length) % items.length;
        changeScreen(items[nextIdx].id);
        return;
      }

      if (cs === "home") {
        if (focusSecRef.current >= secs.length) return;
        switch (action) {
          case "up":
            setFocusSec((s) => {
              const next = Math.max(s - 1, 0);
              if (!secs[next]) return s;
              const max = secs[next].cols - 1;
              setFocusItem((i) => Math.min(i, max >= 0 ? max : 0));
              return next;
            });
            return;
          case "down":
            setFocusSec((s) => {
              const next = Math.min(s + 1, secs.length - 1);
              if (!secs[next]) return s;
              const max = secs[next].cols - 1;
              setFocusItem((i) => Math.min(i, max >= 0 ? max : 0));
              return next;
            });
            return;
          case "left":
            setFocusItem((i) => Math.max(i - 1, 0));
            return;
          case "right":
            setFocusItem((i) => {
              const maxSec = secs[focusSecRef.current];
              if (!maxSec) return i;
              const max = maxSec.cols - 1;
              return Math.min(i + 1, max);
            });
            return;
          case "confirm": {
            const secIdx = focusSecRef.current;
            if (secIdx >= secs.length) return;
            const sec = secs[secIdx];
            if (!sec) return;
            if (sec.id === "hero") {
              if (focusItem === 0) {
                const favList = g.filter((ge: GameEntry) => favorites.has(ge.path));
                if (favList.length > 0) { handleLaunch(favList[0].path, favList[0].name); }
                else if (rg.length > 0) { const recent = g.find((ge: GameEntry) => ge.path === rg[0]); if (recent) handleLaunch(recent.path, recent.name); }
                else if (g.length > 0) handleLaunch(g[0].path, g[0].name);
              }
              if (focusItem === 1) changeScreen("games");
            } else if (sec.id === "favorites") {
              const favGames = g.filter((ge: GameEntry) => favorites.has(ge.path));
              if (focusItem >= 0 && focusItem < favGames.length) handleLaunch(favGames[focusItem].path, favGames[focusItem].name);
            } else if (sec.id === "games" && focusItem >= 0 && focusItem < vg.length) {
              handleLaunch(vg[focusItem].path, vg[focusItem].name);
            }
            return;
          }
        }
      }

      if (cs === "games") {
        if (libGamepadHandlerRef.current?.(action)) return;
        const doMove = (fn: (i: number) => number) => {
          const next = fn(libFocusRef.current);
          libFocusRef.current = next;
          setLibFocus(next);
        };
        switch (action) {
          case "left":
            doMove((i) => Math.max(i - 1, 0));
            return;
          case "right":
            doMove((i) => i + 1);
            return;
          case "up":
            doMove((i) => {
              const c = libColsRef.current;
              return Math.max(i - c, 0);
            });
            return;
          case "down":
            doMove((i) => {
              const c = libColsRef.current;
              return i + c;
            });
            return;
          case "confirm":
          case "toggle_view":
          case "toggle_fav":
          case "pick_cover":
          case "cycle_sort":
          case "open_kb":
          case "toggle_tag_filter":
            return;
        }
        return;
      }

      if (cs === "media" && !mediaTabRef.current) {
        const doMove = (fn: (i: number) => number) => {
          const next = fn(mediaFocusRef.current);
          mediaFocusRef.current = next;
          setMediaFocus(next);
        };
        switch (action) {
          case "left": doMove((i) => Math.max(i - 1, 0)); return;
          case "right": doMove((i) => i + 1); return;
          case "up": doMove((i) => Math.max(i - 2, 0)); return;
          case "down": doMove((i) => i + 2); return;
          case "confirm": return;
        }
        return;
      }
      } catch (e) { console.error("gamepad handler error:", e); }
    },
    [favorites, handleLaunch]
  );

  const [controllerTheme, setControllerTheme] = useState("ps");
  const [showGameCovers, setShowGameCovers] = useState(true);
  const [confirmPending, setConfirmPending] = useState(false);
  const settingsDirtyRef = useRef(false);
  const settingsSaveRef = useRef<() => Promise<void>>(async () => {});

  const visibleGames = useMemo(() => {
    if (recentGames.length > 0) {
      const ordered = recentGames
        .map(p => games.find(g => g.path === p))
        .filter((g): g is NonNullable<typeof g> => !!g);
      if (ordered.length > 0) return ordered.length <= 6 ? ordered : ordered.slice(0, 6);
    }
    return games.slice(0, 3);
  }, [games, recentGames]);
  visibleGamesRef.current = visibleGames;

  const actualControllerType = useGamepad(handleGamepad);
  const effectiveControllerType = controllerTheme === "ps" ? "ps" as const : "xbox" as const;
  const hasGamepad = actualControllerType !== "none";
  const showFocus = hasGamepad;
  const showHints = hasGamepad && inputMode === "gamepad" && hintsVisible;
  const icons = ControllerIcons({ type: effectiveControllerType });

  const localeCtx = useMemo(() => ({
    lang,
    t: (key: string) => messages[lang]?.[key] ?? key,
    plural: pluralFn(lang),
  }), [lang]);

  // Close details on Escape or back
  useEffect(() => {
    if (!detailsGame) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetails();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [detailsGame, closeDetails]);

  return (
    <LocaleContext.Provider value={localeCtx}>
      {showIntro && <VideoIntro onFinish={() => setShowIntro(false)} />}
      {bgVideoEnabled && <video key={bgVideo} className="bg-video" src={`/bg/${bgVideo}`} muted loop autoPlay playsInline />}
      <div className="bg-overlay" />
      <div className="bg-gradient" style={{ opacity: bgDimmed }} />
      <div className={`app ${showIntro ? "hidden" : ""}`}>
        <header className={`top-bar ${barState === "hiding" ? "bar-hiding" : barState === "media" || barState === "showing" ? "bar-media" : ""}`}>
          {barState === "media" || barState === "showing" || barState === "hiding" ? (
            <div className="top-bar-inner" style={{ justifyContent: "flex-start", gap: 16 }}>
              <button className="top-bar-back" onClick={closeMediaViewer}>
                <span className="back-arrow">←</span>
                <span>{localeCtx.t("back")}</span>
              </button>
              <div className={`top-bar-media-tabs ${showHints ? "with-hints" : ""}`}>
                <div className={`media-tab-hint left ${showHints ? "visible" : ""}`}>
                  <icons.TabLIcon />
                </div>
                {MEDIA_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    className={`top-bar-media-tab ${mediaTab === tab.id ? "active" : ""}`}
                    onClick={() => setMediaTab(tab.id)}
                  >
                    {localeCtx.t(tab.labelKey)}
                  </button>
                ))}
                <div className={`media-tab-hint right ${showHints ? "visible" : ""}`}>
                  <icons.TabRIcon />
                </div>
              </div>
            </div>
          ) : (
            <div className="top-bar-inner">
              <div className="top-bar-left">
                <div className="ps-logo">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <text x="11" y="17" textAnchor="middle" fill="white" fontSize="15" fontWeight="700" fontFamily="Arial">SL</text>
                  </svg>
                </div>
                <div className={`tab-hint left ${showHints ? "visible" : ""} ${screen === "home" ? "no-op" : ""}`}>
                  <icons.TabLIcon />
                </div>
                {TOP_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    className={`top-btn ${screen === item.id ? "active" : ""} ${showFocus ? "focusable" : ""}`}
                    onClick={() => changeScreen(item.id)}
                  >
                    {localeCtx.t(item.labelKey)}
                  </button>
                ))}
                <div className={`tab-hint right ${showHints ? "visible" : ""} ${screen === "settings" ? "no-op" : ""}`}>
                  <icons.TabRIcon />
                </div>
              </div>
              <div className="top-bar-right">
                <div className="time-display">
                  {new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="user-avatar">
                  <svg width="28" height="28" viewBox="0 0 28 28">
                    <circle cx="14" cy="14" r="13" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.15)" />
                    <text x="14" y="18" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="12" fontWeight="600">U</text>
                  </svg>
                </div>
              </div>
            </div>
          )}
        </header>

        <main className={`main-content${screen === "home" ? " no-scroll" : ""}`}>
          {screen === "home" && (
            <>
              <div className="home-hero">
              <section className="hero-section">
                <div className="hero-content">
                  <h1 className="hero-title">
                    <span className="hero-greeting">{localeCtx.t("greeting")}</span>
                    {localeCtx.t("app_name")}
                  </h1>
                  <p className="hero-subtitle">{localeCtx.t("your_games")}</p>
                  <div className="hero-actions">
                    <button
                      className={`hero-btn primary ${showFocus && focusSec === 0 && focusItem === 0 ? "focused" : ""}`}
                      onClick={() => {
                        const fav = games.filter(g => favorites.has(g.path));
                        if (fav.length > 0) return handleLaunch(fav[0].path, fav[0].name);
                        if (recentGames.length > 0) {
                          const recent = games.find(g => g.path === recentGames[0]);
                          if (recent) return handleLaunch(recent.path, recent.name);
                        }
                        if (games.length > 0) handleLaunch(games[0].path, games[0].name);
                      }}
                    >
                      {localeCtx.t("play")}
                    </button>
                    <button
                      className={`hero-btn secondary ${showFocus && focusSec === 0 && focusItem === 1 ? "focused" : ""}`}
                      onClick={() => changeScreen("games")}
                    >
                      {localeCtx.t("library")}
                    </button>
                  </div>
                </div>
              </section>
              </div>
              <div className="home-sections">

              {games.filter(g => favorites.has(g.path)).length > 0 && (
                <section className="games-strip-section home-section-favorites">
                  <div className="section-header">
                    <h2 className="section-title">{localeCtx.t("favorites")}</h2>
                  </div>
                  <div className="games-strip">
                    {(() => {
                      const __secs = getSections(favorites.size, visibleGames.length);
                      const __favSec = __secs.findIndex(s => s.id === "favorites");
                      return games.filter(g => favorites.has(g.path)).map((game, i) => (
                      <button
                        key={`fav-${i}`}
                        className={`game-tile${showFocus && focusSec === __favSec && focusItem === i ? " focused" : ""}`}
                        onClick={() => handleLaunch(game.path, game.name)}
                      >
                        <div className="game-tile-bg">
                          {showGameCovers && (customCovers[game.path] || game.cover) ? (
                            <img src={customCovers[game.path] || game.cover} alt={game.name} className="game-tile-cover" />
                          ) : (
                            <span className="game-tile-icon">{game.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="game-tile-info">
                          <span className="game-tile-name">{game.name}</span>
                          <span className="game-tile-source">{game.source}</span>
                        </div>
                      </button>
                      ));
                    })()}
                  </div>
                </section>
              )}
              <section className="games-strip-section home-section-games">
                <div className="section-header">
                  <h2 className="section-title">{localeCtx.t("last_games")}</h2>
                </div>
                {loading ? (
                  <div className="loading-text">{localeCtx.t("scanning")}</div>
                ) : visibleGames.length === 0 ? (
                  <div className="loading-text">{localeCtx.t("no_games")}</div>
                ) : (
                  <div className="games-strip">
                    {(() => {
                      const __secs = getSections(favorites.size, visibleGames.length);
                      const __recentSec = __secs.findIndex(s => s.id === "games");
                      return visibleGames.map((game, i) => (
                      <button
                        key={`${game.source}-${i}`}
                        className={`game-tile${showFocus && focusSec === __recentSec && focusItem === i ? " focused" : ""}`}
                        onClick={() => handleLaunch(game.path, game.name)}
                      >
                        <div className="game-tile-bg">
                          {showGameCovers && (customCovers[game.path] || game.cover) ? (
                            <img src={customCovers[game.path] || game.cover} alt={game.name} className="game-tile-cover" />
                          ) : (
                            <span className="game-tile-icon">{game.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="game-tile-info">
                          <span className="game-tile-name">{game.name}</span>
                          <span className="game-tile-source">{game.source}</span>
                        </div>
                      </button>
                      ));
                    })()}
                  </div>
                )}
              </section>
              </div>
            </>
          )}

          {screen === "games" && (
            <GamesLibrary
              games={games}
              loading={loading}
              onLaunch={handleLaunch}
              onShowDetails={showDetails}
              focusIndex={libFocus}
              onFocusChange={setLibFocus}
              showFocus={showFocus}
              searchInputRef={searchInputRef}
              libColsRef={libColsRef}
              favorites={favorites}
              onToggleFav={toggleFav}
              gamepadHandlerRef={libGamepadHandlerRef}
              icons={icons}
              gpadActive={inputMode === "gamepad" && hasGamepad}
              showHints={showHints}
              viewMode={viewMode}
              showGameCovers={showGameCovers}
              recentGames={recentGames}
              onViewModeChange={setViewMode}
              tagsData={tagsData}
              onTagsChange={setTagsData}
            />
          )}

          {screen === "media" && !mediaTab && (
            <MediaScreen
              games={games}
              recentGames={recentGames}
              onOpenViewer={openMediaViewer}
              onOpenLibrary={() => changeScreen("games")}
              focusIndex={mediaFocus}
              showFocus={showFocus}
            />
          )}

          {screen === "media" && mediaTab && (
            <MediaViewer
              key={mediaTab}
              initialTab={mediaTab}
              onBack={closeMediaViewer}
              icons={icons}
              onTabChange={setMediaTab}
              showHints={showHints}
              onToggleHints={() => setHintsVisible((v) => !v)}
            />
          )}

          {screen === "settings" && (
            <SettingsScreen
              onRefreshGames={refreshAll}
              uiOpacity={uiOpacity}
              onUiOpacityChange={setUiOpacity}
              gameCardOpacity={gameCardOpacity}
              onGameCardOpacityChange={setGameCardOpacity}
              accentColor={accentColor}
              accentAuto={accentAuto}
              onAccentAutoChange={setAccentAuto}
              onAccentColorChange={setAccentColor}
              lang={lang}
              onLangChange={setLang}
              settingsDirtyRef={settingsDirtyRef}
              settingsSaveRef={settingsSaveRef}
              controllerTheme={controllerTheme}
              onControllerThemeChange={setControllerTheme}
            />
          )}
        </main>

        {!mediaTab && !detailsGame && (
        <footer className={`bottom-bar ${showHints ? "visible" : ""}`}>
          <div className="bottom-bar-inner">
            <div className="bottom-hint">
              <icons.ConfirmIcon /> {localeCtx.t("select")}
            </div>
            <div className="bottom-hint">
              <icons.BackIcon /> {localeCtx.t("back")}
            </div>
            <div className="bottom-hint">
              <icons.ToggleIcon /> {hintsVisible ? localeCtx.t("hide") : localeCtx.t("show")}
            </div>
            <div className="bottom-hint">
              <icons.SearchIcon /> {localeCtx.t("favorites")}
            </div>
            <div className="bottom-hint">
              <icons.DpadNav /> {localeCtx.t("navigation")}
            </div>
          </div>
        </footer>
        )}
      </div>

      {detailsGame && (
        <GameDetails
          game={detailsGame}
          onLaunch={handleLaunch}
          onClose={closeDetails}
          showFocus={showFocus}
          icons={icons}
          showHints={showHints}
          coverData={detailsCover}
          tagsData={tagsData}
          onTagsChange={setTagsData}
          tagEditorOpen={detailsTagEditor}
          onToggleEditor={() => setDetailsTagEditor((v) => !v)}
          gamepadHandlerRef={detailsGamepadRef}
        />
      )}

      {confirmPending && (
        <div className="confirm-overlay">
          <div className="confirm-dialog">
            <p className="confirm-text">{localeCtx.t("confirm_save")}</p>
            <div className="confirm-actions">
              <button className="confirm-yes" onClick={handleConfirmSave}>{localeCtx.t("yes")}</button>
              <button className="confirm-no" onClick={handleConfirmDiscard}>{localeCtx.t("no")}</button>
            </div>
          </div>
        </div>
      )}

    </LocaleContext.Provider>
  );
}

export default App;
