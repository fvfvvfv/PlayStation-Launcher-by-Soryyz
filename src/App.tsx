import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useGamepad } from "./hooks/useGamepad";
import { useGames } from "./hooks/useGames";
import { VideoIntro } from "./components/VideoIntro";
import { GamesLibrary } from "./components/GamesLibrary";
import { MediaScreen } from "./components/MediaScreen";
import { MediaViewer } from "./components/MediaViewer";
import { SettingsScreen } from "./components/SettingsScreen";
import { ControllerIcons } from "./components/ControllerIcons";
import { LocaleContext } from "./hooks/useLocale";
import { messages, pluralFn, type Lang } from "./locales";
import type { Screen } from "./types";
import "./App.css";

type InputMode = "gamepad" | "mouse";

const TOP_ITEMS: { id: Screen; labelKey: string }[] = [
  { id: "home", labelKey: "home" },
  { id: "games", labelKey: "library" },
  { id: "media", labelKey: "media" },
  { id: "settings", labelKey: "settings" },
];

const MEDIA_TABS: { id: "screenshots" | "videos"; labelKey: string }[] = [
  { id: "screenshots", labelKey: "screenshots" },
  { id: "videos", labelKey: "videos" },
];

interface Section {
  id: string;
  cols: number;
}

function getSections(gamesCount: number): Section[] {
  const sections: Section[] = [{ id: "hero", cols: 2 }];
  if (gamesCount > 0) {
    sections.push({ id: "games", cols: Math.min(gamesCount, 6) });
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
  const [lang, setLang] = useState<Lang>("ru");
  const [startScreen, setStartScreen] = useState("home");
  const { games, loading, launch, refresh } = useGames();
  const [recentGames, setRecentGames] = useState<string[]>([]);

  const reloadRecent = useCallback(async () => {
    try {
      const cfg = await invoke<{ recent_games: string[] }>("get_config");
      if (cfg.recent_games) setRecentGames(cfg.recent_games);
    } catch {}
  }, []);

  const handleLaunch = useCallback(async (path: string) => {
    await launch(path);
    await reloadRecent();
  }, [launch, reloadRecent]);

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await invoke<{
        hints_visible: boolean; bg_video: string; bg_video_enabled: boolean; bg_dimmed: number;
        ui_opacity: number; game_card_opacity: number; accent_color: string; start_screen: string; language: string;
        recent_games: string[]; controller_theme: string;
      }>("get_config");
      if (cfg.hints_visible !== undefined) setHintsVisible(cfg.hints_visible);
      if (cfg.bg_video) setBgVideo(cfg.bg_video);
      if (cfg.bg_video_enabled !== undefined) setBgVideoEnabled(cfg.bg_video_enabled);
      if (cfg.bg_dimmed !== undefined) setBgDimmed(cfg.bg_dimmed);
      if (cfg.ui_opacity !== undefined) setUiOpacity(cfg.ui_opacity);
      if (cfg.game_card_opacity !== undefined) setGameCardOpacity(cfg.game_card_opacity);
      if (cfg.accent_color) setAccentColor(cfg.accent_color);
      if (cfg.start_screen) setStartScreen(cfg.start_screen);
      if (cfg.language && ["ru", "en", "uk", "be", "kk", "uz"].includes(cfg.language)) setLang(cfg.language as Lang);
      if (cfg.recent_games) setRecentGames(cfg.recent_games);
      if (cfg.controller_theme) setControllerTheme(cfg.controller_theme);
    } catch {}
  }, []);

  const refreshAll = useCallback(async () => {
    await refresh();
    await loadConfig();
  }, [refresh, loadConfig]);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { if (screen === "home" && startScreen !== "home") setScreen(startScreen as Screen); }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accentColor);
    document.documentElement.style.setProperty("--accent-glow", hexToRgba(accentColor, 0.3));
  }, [accentColor]);

  useEffect(() => {
    document.documentElement.style.setProperty("--panel-alpha", String(uiOpacity));
  }, [uiOpacity]);

  useEffect(() => {
    document.documentElement.style.setProperty("--card-alpha", String(gameCardOpacity));
  }, [gameCardOpacity]);

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

  useEffect(() => {
    invoke("get_config").then((cfg: any) => {
      invoke("set_config", { config: { ...cfg, hints_visible: hintsVisible } });
    }).catch(() => {});
  }, [hintsVisible]);

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

  const openMediaViewer = useCallback((tab: "screenshots" | "videos") => {
    setBarState("hiding");
    setTimeout(() => {
      setMediaTab(tab);
      setBarState("media");
    }, 200);
  }, []);

  const closeMediaViewer = useCallback(() => {
    setBarState("hiding");
    setTimeout(() => {
      setMediaTab(null);
      setBarState("normal");
    }, 200);
  }, []);

  const [pendingScreen, setPendingScreen] = useState<Screen | null>(null);
  const settingsDirtyRef = useRef(false);
  const settingsSaveRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const changeScreen = useCallback((s: Screen) => {
    if (screen === "settings" && s !== "settings" && settingsDirtyRef.current) {
      setPendingScreen(s);
      return;
    }
    setScreen(s);
  }, [screen]);

  const handleConfirmSave = useCallback(async () => {
    await settingsSaveRef.current();
    setPendingScreen(null);
    if (pendingScreen) setScreen(pendingScreen);
  }, [pendingScreen]);

  const handleConfirmDiscard = useCallback(async () => {
    await loadConfig();
    setPendingScreen(null);
    if (pendingScreen) setScreen(pendingScreen);
  }, [pendingScreen, loadConfig]);

  const handleGamepad = useCallback(
    (action: string) => {
      try {
      setInputMode("gamepad");
      if (!action) return;
      const cs = screenRef.current;
      const secs = getSections(games.length);

      if (mediaTabRef.current) {
        return;
      }

      if (cs === "home") {
        switch (action) {
          case "up":
            setFocusSec((s) => {
              const next = Math.max(s - 1, 0);
              const max = secs[next].cols - 1;
              setFocusItem((i) => Math.min(i, max >= 0 ? max : 0));
              return next;
            });
            return;
          case "down":
            setFocusSec((s) => {
              const next = Math.min(s + 1, secs.length - 1);
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
              const max = secs[focusSecRef.current].cols - 1;
              return Math.min(i + 1, max);
            });
            return;
          case "confirm": {
            const sec = secs[focusSecRef.current];
            if (!sec) return;
            if (sec.id === "hero") {
              if (focusItem === 0 && games.length > 0) handleLaunch(games[0].path);
              if (focusItem === 1) changeScreen("games");
            } else if (sec.id === "games" && focusItem >= 0 && focusItem < games.length) {
              handleLaunch(games[focusItem].path);
            }
            return;
          }
        }
      }

      if (cs === "games") {
        switch (action) {
          case "left":
            setLibFocus((i) => Math.max(i - 1, 0));
            return;
          case "right":
            setLibFocus((i) => Math.min(i + 1, games.length - 1));
            return;
          case "up":
            setLibFocus((i) => {
              const c = libColsRef.current;
              return Math.max(i - c, 0);
            });
            return;
          case "down":
            setLibFocus((i) => {
              const c = libColsRef.current;
              return Math.min(i + c, games.length - 1);
            });
            return;
          case "confirm":
            if (games[libFocusRef.current]) handleLaunch(games[libFocusRef.current].path);
            return;
          case "search":
            searchInputRef.current?.focus();
            return;
        }
      }

      if (cs === "media") {
        const recent = recentGames.length > 0
          ? recentGames.map(p => games.find(g => g.path === p)).filter((g): g is NonNullable<typeof g> => !!g)
          : [];
        const recentLimit = Math.min(recent.length, 4);
        const totalItems = recentLimit + 2;
        switch (action) {
          case "up":
            setMediaFocus((i) => Math.max(i - 1, 0));
            return;
          case "down":
            setMediaFocus((i) => Math.min(i + 1, totalItems - 1));
            return;
          case "left":
            setMediaFocus((i) => Math.max(i - 1, 0));
            return;
          case "right":
            setMediaFocus((i) => Math.min(i + 1, totalItems - 1));
            return;
          case "confirm": {
            const fi = mediaFocusRef.current;
            if (fi < recentLimit) { changeScreen("games"); return; }
            if (fi === recentLimit) { openMediaViewer("screenshots"); return; }
            if (fi === recentLimit + 1) { openMediaViewer("videos"); return; }
            return;
          }
        }
      }

      switch (action) {
        case "lb": {
          const si = screenRef.current;
          const idx = TOP_ITEMS.findIndex((t) => t.id === si);
          changeScreen(TOP_ITEMS[Math.max(idx - 1, 0)].id);
          return;
        }
        case "rb": {
          const si = screenRef.current;
          const idx = TOP_ITEMS.findIndex((t) => t.id === si);
          changeScreen(TOP_ITEMS[Math.min(idx + 1, TOP_ITEMS.length - 1)].id);
          return;
        }
        case "toggle_hints":
          setHintsVisible((v) => !v);
          return;
      }
      } catch (e) { console.error("gamepad handler error:", e); }
    },
    [games.length, handleLaunch]
  );

  const [controllerTheme, setControllerTheme] = useState("ps");

  const actualControllerType = useGamepad(handleGamepad);
  const effectiveControllerType = controllerTheme === "ps" ? "ps" as const : "xbox" as const;
  const hasGamepad = actualControllerType !== "none";
  const showFocus = hasGamepad;
  const showHints = hasGamepad && inputMode === "gamepad" && hintsVisible;

  const icons = ControllerIcons({ type: effectiveControllerType });
  const visibleGames = useMemo(() => {
    if (recentGames.length > 0) {
      const ordered = recentGames
        .map(p => games.find(g => g.path === p))
        .filter((g): g is NonNullable<typeof g> => !!g);
      if (ordered.length > 0) return ordered.length <= 6 ? ordered : ordered.slice(0, 6);
    }
    return games.slice(0, 3);
  }, [games, recentGames]);

  const localeCtx = useMemo(() => ({
    lang,
    t: (key: string) => messages[lang]?.[key] ?? key,
    plural: pluralFn(lang),
  }), [lang]);

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

        <main className="main-content">
          {screen === "home" && (
            <>
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
                      onClick={() => games.length > 0 && handleLaunch(games[0].path)}
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

              <section className="games-strip-section">
                <div className="section-header">
                  <h2 className="section-title">{localeCtx.t("last_games")}</h2>
                </div>
                {loading ? (
                  <div className="loading-text">{localeCtx.t("scanning")}</div>
                ) : visibleGames.length === 0 ? (
                  <div className="loading-text">{localeCtx.t("no_games")}</div>
                ) : (
                  <div className="games-strip">
                    {visibleGames.map((game, i) => (
                      <button
                        key={`${game.source}-${i}`}
                        className={`game-tile ${showFocus && focusSec === 1 && focusItem === i ? "focused" : ""}`}
                        onClick={() => handleLaunch(game.path)}
                      >
                        <div className="game-tile-bg">
                          <span className="game-tile-icon">{game.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="game-tile-info">
                          <span className="game-tile-name">{game.name}</span>
                          <span className="game-tile-source">{game.source}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {screen === "games" && (
            <GamesLibrary
              games={games}
              loading={loading}
              onLaunch={handleLaunch}
              focusIndex={libFocus}
              onFocusChange={setLibFocus}
              showFocus={showFocus}
              searchInputRef={searchInputRef}
              libColsRef={libColsRef}
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

        {!mediaTab && (
        <footer className={`bottom-bar ${showHints ? "visible" : ""}`}>
          <div className="bottom-bar-inner">
            <div className="bottom-hint">
              <icons.ConfirmIcon /> {localeCtx.t("select")}
            </div>
            <div className="bottom-hint">
              <icons.BackIcon /> {localeCtx.t("back")}
            </div>
            <div className="bottom-hint">
              <icons.LbIcon /> <icons.RbIcon /> {localeCtx.t("tabs")}
            </div>
            <div className="bottom-hint">
              <icons.ToggleIcon /> {hintsVisible ? localeCtx.t("hide") : localeCtx.t("show")}
            </div>
            <div className="bottom-hint">
              <icons.DpadNav /> {localeCtx.t("navigation")}
            </div>
          </div>
        </footer>
        )}
      </div>

      {pendingScreen && (
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
