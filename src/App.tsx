import { useState, useCallback, useRef, useEffect } from "react";
import { useGamepad, type ControllerType } from "./hooks/useGamepad";
import { useGames } from "./hooks/useGames";
import { PS5Intro } from "./components/PS5Intro";
import { GamesLibrary } from "./components/GamesLibrary";
import { MediaScreen } from "./components/MediaScreen";
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

interface Section {
  id: string;
  cols: number;
}

function getSections(gamesCount: number): Section[] {
  return [
    { id: "hero", cols: 2 },
    { id: "games", cols: Math.min(gamesCount, 6) },
  ];
}

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [screen, setScreen] = useState<Screen>("home");
  const [focusSec, setFocusSec] = useState(0);
  const [focusItem, setFocusItem] = useState(0);
  const [libFocus, setLibFocus] = useState(0);
  const [inputMode, setInputMode] = useState<InputMode>("mouse");
  const { games, loading, launch } = useGames();
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const focusSecRef = useRef(focusSec);
  focusSecRef.current = focusSec;
  const libFocusRef = useRef(libFocus);
  libFocusRef.current = libFocus;

  useEffect(() => {
    const onMouse = () => setInputMode("mouse");
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("mousedown", onMouse);
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("mousedown", onMouse);
    };
  }, []);

  const handleGamepad = useCallback(
    (action: string) => {
      setInputMode("gamepad");
      if (showIntro) return;
      const cs = screenRef.current;
      const secs = getSections(games.length);

      if (cs === "home") {
        switch (action) {
          case "up":
            setFocusSec((s) => {
              const next = Math.max(s - 1, 0);
              setFocusItem((i) => Math.min(i, secs[next].cols - 1));
              return next;
            });
            return;
          case "down":
            setFocusSec((s) => {
              const next = Math.min(s + 1, secs.length - 1);
              setFocusItem((i) => Math.min(i, secs[next].cols - 1));
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
            } else if (sec.id === "games" && focusItem < games.length) {
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
            if (libFocusRef.current < games.length) {
              launch(games[libFocusRef.current].path);
            }
            return;
        }
      }

      switch (action) {
        case "lb": {
          const idx = TOP_ITEMS.findIndex((t) => t.id === cs);
          if (idx > 0) {
            setScreen(TOP_ITEMS[idx - 1].id);
            setFocusSec(0);
            setFocusItem(0);
            setLibFocus(0);
          }
          return;
        }
        case "rb": {
          const idx = TOP_ITEMS.findIndex((t) => t.id === cs);
          if (idx < TOP_ITEMS.length - 1) {
            setScreen(TOP_ITEMS[idx + 1].id);
            setFocusSec(0);
            setFocusItem(0);
            setLibFocus(0);
          }
          return;
        }
        case "back": {
          if (cs !== "home") {
            setScreen("home");
            setFocusSec(0);
            setFocusItem(0);
            setLibFocus(0);
          }
          return;
        }
      }
    },
    [showIntro, focusItem, games, launch]
  );

  const controllerType: ControllerType = useGamepad(handleGamepad);
  const icons = ControllerIcons({ type: controllerType });
  const hasGamepad = controllerType !== "none";

  useEffect(() => {
    if (hasGamepad && inputMode === "mouse") {
      setInputMode("gamepad");
    }
  }, [hasGamepad, inputMode]);

  const showHints = inputMode === "gamepad" && hasGamepad;
  const showFocus = hasGamepad;
  const visibleGames = games.slice(0, 6);

  return (
    <>
      {showIntro && <PS5Intro onFinish={() => setShowIntro(false)} />}

      <div className="app" style={{ display: showIntro ? "none" : "flex" }}>
        <div className="bg-overlay" />
        <div className="bg-gradient" />

        <header className="top-bar">
          <div className="top-bar-inner">
            <div className="top-bar-left">
              <div className="ps-logo">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <circle cx="12" cy="12" r="10" fill="white" />
                  <text x="12" y="16" textAnchor="middle" fontSize="11" fill="black" fontWeight="bold">PS</text>
                </svg>
              </div>
              <div className={`tab-hint tab-hint-left ${showHints ? "" : "hidden"}`}>
                <icons.LbIcon />
              </div>
              {TOP_ITEMS.map((item) => (
                <button
                  key={item.id}
                  className={`top-btn ${screen === item.id ? "active" : ""}`}
                  onClick={() => { setScreen(item.id); setFocusSec(0); setFocusItem(0); setLibFocus(0); }}
                >
                  {item.label}
                </button>
              ))}
              <div className={`tab-hint tab-hint-right ${showHints ? "" : "hidden"}`}>
                <icons.RbIcon />
              </div>
            </div>
            <div className="top-bar-right">
              <div className="controller-indicator">
                {controllerType === "ps" && <span className="ctrl-badge ps">PS</span>}
                {controllerType === "xbox" && <span className="ctrl-badge xbox">Xbox</span>}
                {controllerType === "generic" && <span className="ctrl-badge generic">🎮</span>}
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
            />
          )}

          {screen === "media" && (
            <MediaScreen games={games} onOpenLibrary={() => setScreen("games")} />
          )}

          {screen === "settings" && (
            <SettingsScreen />
          )}
        </main>

        {showHints && (
          <footer className="bottom-bar">
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
        )}
      </div>
    </>
  );
}

export default App;
