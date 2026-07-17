import { useState, useCallback, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useGamepad, type ControllerType } from "./hooks/useGamepad";
import { useGames } from "./hooks/useGames";
import { PS5Intro } from "./components/PS5Intro";
import { GamesLibrary } from "./components/GamesLibrary";
import { MediaScreen } from "./components/MediaScreen";
import { MediaViewer } from "./components/MediaViewer";
import { SettingsScreen } from "./components/SettingsScreen";
import { ControllerIcons } from "./components/ControllerIcons";
import type { Screen } from "./types";
import "./App.css";

type InputMode = "gamepad" | "mouse";

const TOP_ITEMS: { id: Screen; label: string }[] = [
  { id: "home", label: "Домой" },
  { id: "games", label: "Игры" },
  { id: "media", label: "Медиа" },
  { id: "settings", label: "Настройки" },
];

const MEDIA_TABS: { id: "screenshots" | "videos"; label: string }[] = [
  { id: "screenshots", label: "Скриншоты" },
  { id: "videos", label: "Видео" },
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
  const [inputMode, setInputMode] = useState<InputMode>("mouse");
  const [mediaTab, setMediaTab] = useState<"screenshots" | "videos" | null>(null);
  const [barState, setBarState] = useState<"normal" | "hiding" | "media" | "showing">("normal");
  const [hintsVisible, setHintsVisible] = useState(true);
  const [bgVideo, setBgVideo] = useState("S1.mp4");
  const [bgVideoEnabled, setBgVideoEnabled] = useState(true);
  const [bgDimmed, setBgDimmed] = useState(0.8);
  const [accentColor, setAccentColor] = useState("#2d7aff");
  const [startScreen, setStartScreen] = useState("home");
  const { games, loading, launch, refresh } = useGames();

  const loadConfig = useCallback(() => {
    invoke<{
      hints_visible: boolean; bg_video: string; bg_video_enabled: boolean; bg_dimmed: number;
      accent_color: string; start_screen: string;
    }>("get_config").then((cfg) => {
      if (cfg.hints_visible !== undefined) setHintsVisible(cfg.hints_visible);
      if (cfg.bg_video) setBgVideo(cfg.bg_video);
      if (cfg.bg_video_enabled !== undefined) setBgVideoEnabled(cfg.bg_video_enabled);
      if (cfg.bg_dimmed !== undefined) setBgDimmed(cfg.bg_dimmed);
      if (cfg.accent_color) setAccentColor(cfg.accent_color);
      if (cfg.start_screen) setStartScreen(cfg.start_screen);
    }).catch(() => {});
  }, []);

  const refreshAll = useCallback(() => {
    refresh();
    loadConfig();
  }, [refresh, loadConfig]);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { if (screen === "home" && startScreen !== "home") setScreen(startScreen as Screen); }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accentColor);
    document.documentElement.style.setProperty("--accent-glow", hexToRgba(accentColor, 0.3));
  }, [accentColor]);

  const screenRef = useRef(screen);
  screenRef.current = screen;
  const focusSecRef = useRef(focusSec);
  focusSecRef.current = focusSec;
  const libFocusRef = useRef(libFocus);
  libFocusRef.current = libFocus;
  const mediaTabRef = useRef(mediaTab);
  mediaTabRef.current = mediaTab;
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    invoke("get_config").then((cfg: any) => {
      invoke("set_config", { config: { ...cfg, hints_visible: hintsVisible } });
    }).catch(() => {});
  }, [hintsVisible]);

  useEffect(() => {
    const onMouse = () => setInputMode("mouse");
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("mousedown", onMouse);
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("mousedown", onMouse);
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

  const handleGamepad = useCallback(
    (action: string) => {
      try {
      setInputMode("gamepad");
      if (showIntro) return;
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
              if (focusItem === 0 && games.length > 0) launch(games[0].path);
              if (focusItem === 1) setScreen("games");
            } else if (sec.id === "games" && focusItem >= 0 && focusItem < games.length) {
              launch(games[focusItem].path);
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
              const cols = 4;
              return Math.max(i - cols, 0);
            });
            return;
          case "down":
            setLibFocus((i) => {
              const cols = 4;
              return Math.min(i + cols, games.length - 1);
            });
            return;
          case "confirm":
            if (games[libFocusRef.current]) launch(games[libFocusRef.current].path);
            return;
          case "search":
            searchInputRef.current?.focus();
            return;
        }
      }

      switch (action) {
        case "lb":
          setScreen((s) => {
            const idx = TOP_ITEMS.findIndex((t) => t.id === s);
            const prev = Math.max(idx - 1, 0);
            return TOP_ITEMS[prev].id;
          });
          return;
        case "rb":
          setScreen((s) => {
            const idx = TOP_ITEMS.findIndex((t) => t.id === s);
            const next = Math.min(idx + 1, TOP_ITEMS.length - 1);
            return TOP_ITEMS[next].id;
          });
          return;
        case "toggle_hints":
          setHintsVisible((v) => !v);
          return;
      }
      } catch (e) { console.error("gamepad handler error:", e); }
    },
    [showIntro, games.length, launch]
  );

  const controllerType = useGamepad(handleGamepad);
  const hasGamepad = controllerType !== "none";
  const showFocus = hasGamepad;
  const showHints = hasGamepad && inputMode === "gamepad" && hintsVisible;

  const icons = ControllerIcons({ type: controllerType });
  const visibleGames = games.slice(0, 6);

  return (
    <>
      {showIntro && <PS5Intro onFinish={() => setShowIntro(false)} />}
      {bgVideoEnabled && <video key={bgVideo} className="bg-video" src={`/bg/${bgVideo}`} muted loop autoPlay playsInline />}
      <div className="bg-overlay" />
      <div className="bg-gradient" style={{ opacity: bgDimmed }} />
      <div className={`app ${showIntro ? "hidden" : ""}`}>
        <header className={`top-bar ${barState === "hiding" ? "bar-hiding" : barState === "media" || barState === "showing" ? "bar-media" : ""}`}>
          {barState === "media" || barState === "showing" || barState === "hiding" ? (
            <div className="top-bar-inner" style={{ justifyContent: "flex-start", gap: 16 }}>
              <button className="top-bar-back" onClick={closeMediaViewer}>
                <span className="back-arrow">←</span>
                <span>Назад</span>
              </button>
              <div className={`top-bar-media-tabs ${showHints ? "with-hints" : ""}`}>
                <div className={`media-tab-hint left ${showHints ? "visible" : ""}`}>
                  <icons.LbIcon />
                </div>
                {MEDIA_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    className={`top-bar-media-tab ${mediaTab === tab.id ? "active" : ""}`}
                    onClick={() => setMediaTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
                <div className={`media-tab-hint right ${showHints ? "visible" : ""}`}>
                  <icons.RbIcon />
                </div>
              </div>
            </div>
          ) : (
            <div className="top-bar-inner">
              <div className="top-bar-left">
                <div className="ps-logo">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <text x="11" y="16" textAnchor="middle" fill="white" fontSize="14" fontWeight="700" fontFamily="Arial">PS</text>
                  </svg>
                </div>
                <div className={`tab-hint left ${showHints ? "visible" : ""} ${screen === "home" ? "no-op" : ""}`}>
                  <icons.LbIcon />
                </div>
                {TOP_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    className={`top-btn ${screen === item.id ? "active" : ""} ${showFocus ? "focusable" : ""}`}
                    onClick={() => setScreen(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
                <div className={`tab-hint right ${showHints ? "visible" : ""} ${screen === "settings" ? "no-op" : ""}`}>
                  <icons.RbIcon />
                </div>
              </div>
              <div className="top-bar-right">
                <div className="controller-badge" style={{
                  width: 22, height: 22,
                  transition: "opacity 0.3s ease",
                  opacity: inputMode === "gamepad" && controllerType !== "none" ? 0.5 : 0,
                  pointerEvents: "none",
                }}>
                  <img
                    src={controllerType === "ps"
                      ? "/icons/PS_iconpack/Button - PS Home 2.svg"
                      : controllerType === "xbox"
                        ? "/icons/XBOX_iconpack/button_xbox_digital_home_white.svg"
                        : ""}
                    alt=""
                    style={{ width: 22, height: 22, display: "block" }}
                  />
                </div>
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
                    <span className="hero-greeting">Добро пожаловать</span>
                    PS5 Launcher
                  </h1>
                  <p className="hero-subtitle">Ваши игры на ПК</p>
                  <div className="hero-actions">
                    <button
                      className={`hero-btn primary ${showFocus && focusSec === 0 && focusItem === 0 ? "focused" : ""}`}
                      onClick={() => games.length > 0 && launch(games[0].path)}
                    >
                      Играть
                    </button>
                    <button
                      className={`hero-btn secondary ${showFocus && focusSec === 0 && focusItem === 1 ? "focused" : ""}`}
                      onClick={() => setScreen("games")}
                    >
                      Библиотека
                    </button>
                  </div>
                </div>
              </section>

              <section className="games-strip-section">
                <div className="section-header">
                  <h2 className="section-title">Последние игры</h2>
                  <button className="see-all" onClick={() => setScreen("games")}>Смотреть все →</button>
                </div>
                {loading ? (
                  <div className="loading-text">Сканирование игр...</div>
                ) : visibleGames.length === 0 ? (
                  <div className="loading-text">Игры не найдены. Установите Steam или другие игры.</div>
                ) : (
                  <div className="games-strip">
                    {visibleGames.map((game, i) => (
                      <button
                        key={`${game.source}-${i}`}
                        className={`game-tile ${showFocus && focusSec === 1 && focusItem === i ? "focused" : ""}`}
                        onClick={() => launch(game.path)}
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
              onLaunch={launch}
              focusIndex={libFocus}
              onFocusChange={setLibFocus}
              showFocus={showFocus}
              searchInputRef={searchInputRef}
            />
          )}

          {screen === "media" && !mediaTab && (
            <MediaScreen
              games={games}
              onOpenViewer={openMediaViewer}
              onOpenLibrary={() => setScreen("games")}
            />
          )}

          {screen === "media" && mediaTab && (
            <MediaViewer
              key={mediaTab}
              initialTab={mediaTab}
              onBack={closeMediaViewer}
              controller={controllerType}
              icons={icons}
              onTabChange={setMediaTab}
              showHints={showHints}
              onToggleHints={() => setHintsVisible((v) => !v)}
            />
          )}

          {screen === "settings" && (
            <SettingsScreen onRefreshGames={refreshAll} />
          )}
        </main>

        <footer className={`bottom-bar ${showHints && !mediaTab ? "visible" : ""}`}>
          <div className="bottom-bar-inner">
            <div className="bottom-hint">
              <icons.ConfirmIcon /> Выбрать
            </div>
            <div className="bottom-hint">
              <icons.BackIcon /> Назад
            </div>
            <div className="bottom-hint">
              <icons.DpadNav /> Навигация
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export default App;
