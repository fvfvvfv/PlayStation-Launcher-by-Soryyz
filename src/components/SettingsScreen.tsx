import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

const BG_GRADIENTS = [
  "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
  "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)",
  "linear-gradient(135deg, #2b0f1c, #3b1f2c, #4a2f3c)",
  "linear-gradient(135deg, #0d0d0d, #1a1a2e, #16213e)",
  "linear-gradient(135deg, #1c0a2e, #2a1a3e, #382a4e)",
  "linear-gradient(135deg, #0a1f0f, #1a2f1f, #2a3f2f)",
  "linear-gradient(135deg, #2e1f0a, #3e2f1a, #4e3f2a)",
  "linear-gradient(135deg, #1f0f2e, #2f1f3e, #3f2f4e)",
];

const BG_OPTIONS = [
  { label: "1", value: "S1.mp4" },
  { label: "2", value: "S2.mp4" },
  { label: "3", value: "S3.mp4" },
  { label: "4", value: "S4.mp4" },
  { label: "5", value: "S5.mp4" },
  { label: "6", value: "S6.mp4" },
  { label: "7", value: "S7.mp4" },
  { label: "8", value: "S8.mp4" },
];

const START_OPTIONS = [
  { label: "Домой", value: "home" },
  { label: "Библиотека", value: "games" },
  { label: "Настройки", value: "settings" },
];

interface AppConfig {
  game_paths: string[];
  auto_launch: boolean;
  minimize_to_tray: boolean;
  bg_video: string;
  bg_video_enabled: boolean;
  bg_dimmed: number;
  accent_color: string;
  start_screen: string;
  show_game_covers: boolean;
}

interface Props {
  onRefreshGames: () => void;
}

export function SettingsScreen({ onRefreshGames }: Props) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    invoke<AppConfig>("get_config").then((cfg) => {
      setConfig({
        game_paths: cfg.game_paths || [],
        auto_launch: cfg.auto_launch ?? false,
        minimize_to_tray: cfg.minimize_to_tray ?? true,
        bg_video: cfg.bg_video || "S1.mp4",
        bg_video_enabled: cfg.bg_video_enabled ?? true,
        bg_dimmed: cfg.bg_dimmed ?? 0.8,
        accent_color: cfg.accent_color || "#2d7aff",
        start_screen: cfg.start_screen || "home",
        show_game_covers: cfg.show_game_covers ?? true,
      });
    }).catch(console.error);
  }, []);

  const doSave = useCallback((updated: AppConfig) => {
    invoke("set_config", { config: updated })
      .then(() => { setSaved(true); setTimeout(() => setSaved(false), 2000); onRefreshGames(); })
      .catch(console.error);
  }, [onRefreshGames]);

  const update = useCallback((patch: Partial<AppConfig>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, ...patch };
    });
  }, []);

  if (!config) return null;

  return (
    <div className="settings-screen">
      <div className="settings-header">
        <h2 className="settings-title">Настройки</h2>
        <button className="settings-save-btn" onClick={() => doSave(config)}>
          {saved ? "✓ Сохранено" : "Сохранить"}
        </button>
      </div>

      <div className="settings-grid">
      <section className="settings-section">
        <h3 className="settings-section-title">Общие</h3>

        <label className="settings-row">
          <span>Сворачивать в трей при запуске игры</span>
          <input
            type="checkbox"
            checked={config.minimize_to_tray}
            onChange={(e) => update({ minimize_to_tray: e.target.checked })}
          />
        </label>

        <label className="settings-row">
          <span>Автозапуск лаунчера</span>
          <input
            type="checkbox"
            checked={config.auto_launch}
            onChange={(e) => update({ auto_launch: e.target.checked })}
          />
        </label>

        <label className="settings-row">
          <span>Начальный экран</span>
          <select
            className="settings-select"
            value={config.start_screen}
            onChange={(e) => update({ start_screen: e.target.value })}
          >
            {START_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="settings-row">
          <span>Показывать обложки игр</span>
          <input
            type="checkbox"
            checked={config.show_game_covers}
            onChange={(e) => update({ show_game_covers: e.target.checked })}
          />
        </label>
      </section>

      <section className="settings-section">
        <h3 className="settings-section-title">Оформление</h3>

        <label className="settings-row">
          <span>Фоновое видео</span>
          <input
            type="checkbox"
            checked={config.bg_video_enabled}
            onChange={(e) => update({ bg_video_enabled: e.target.checked })}
          />
        </label>

        {config.bg_video_enabled && (
          <>
            <div className="bg-selector">
              {BG_OPTIONS.map((o, i) => (
                <button
                  key={o.value}
                  className={`bg-card ${config.bg_video === o.value ? "active" : ""}`}
                  onClick={() => update({ bg_video: o.value })}
                >
                  <div className="bg-card-preview" style={{ background: BG_GRADIENTS[i % BG_GRADIENTS.length] }}>
                    <span className="bg-card-num">{o.label}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="settings-row">
              <span>Затемнение</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                className="settings-slider"
                value={config.bg_dimmed}
                onChange={(e) => update({ bg_dimmed: parseFloat(e.target.value) })}
              />
              <span className="settings-slider-value">{Math.round(config.bg_dimmed * 100)}%</span>
            </div>
          </>
        )}

        <div className="settings-row">
          <span>Цвет акцента</span>
          <input
            type="color"
            className="settings-color"
            value={config.accent_color}
            onChange={(e) => update({ accent_color: e.target.value })}
          />
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-section-title">Пути к играм</h3>
        <p className="settings-hint">
          Лаунчер автоматически сканирует Steam, Epic Games и установленные программы.
          Добавьте дополнительные папки с играми вручную.
        </p>

        {config.game_paths.map((p, i) => (
          <div key={i} className="settings-path-row">
            <span className="settings-path">{p}</span>
            <button
              className="settings-remove-btn"
              onClick={() => {
                const next = config.game_paths.filter((_, j) => j !== i);
                update({ game_paths: next });
              }}
            >
              ✕
            </button>
          </div>
        ))}

        <button
          className="settings-add-btn"
          onClick={async () => {
            try {
              const selected = await open({ directory: true, multiple: false });
              if (selected) {
                update({ game_paths: [...config.game_paths, selected] });
              }
            } catch {}
          }}
        >
          + Добавить папку
        </button>
      </section>
      </div>
    </div>
  );
}
