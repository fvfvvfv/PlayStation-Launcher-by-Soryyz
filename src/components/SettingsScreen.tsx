import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { check as checkUpdatePlugin } from "@tauri-apps/plugin-updater";
import { useLocale } from "../hooks/useLocale";
import { langNames, type Lang } from "../locales";

const BG_GRADIENTS = [
  "linear-gradient(135deg, #0a2a5e, #1a4a8e, #2a6abe)",
  "linear-gradient(135deg, #2a0a4e, #4a1a7e, #6a2aae)",
  "linear-gradient(135deg, #4a1a0a, #7e3a1a, #ae5a2a)",
  "linear-gradient(135deg, #0a4a5e, #1a7a9e, #2aaabe)",
  "linear-gradient(135deg, #3a2a1a, #5a4a2a, #7a6a3a)",
  "linear-gradient(135deg, #4a0a2a, #7e1a5e, #ae2a8e)",
  "linear-gradient(135deg, #3a1a1a, #5a3a2a, #7a5a3a)",
  "linear-gradient(135deg, #1a1a2a, #2a2a3a, #3a3a4a)",
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
  { label: "home", value: "home" },
  { label: "games", value: "games" },
  { label: "settings", value: "settings" },
];

const ACCENT_PRESETS = [
  "#2d7aff", "#8b5cf6", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
  "#ec4899", "#a855f7", "#ffffff", "#78716c",
];

interface AppConfig {
  game_paths: string[];
  recent_games: string[];
  auto_launch: boolean;
  minimize_to_tray: boolean;
  hints_visible: boolean;
  bg_video: string;
  bg_video_enabled: boolean;
  bg_dimmed: number;
  ui_opacity: number;
  game_card_opacity: number;
  accent_color: string;
  accent_auto: boolean;
  start_screen: string;
  show_game_covers: boolean;
  language: string;
  controller_theme: string;
  view_mode: string;
  discord_enabled: boolean;
}

interface Props {
  onRefreshGames: () => void;
  uiOpacity: number;
  onUiOpacityChange: (v: number) => void;
  gameCardOpacity: number;
  onGameCardOpacityChange: (v: number) => void;
  accentColor: string;
  accentAuto: boolean;
  onAccentAutoChange: (v: boolean) => void;
  onAccentColorChange: (v: string) => void;
  lang: Lang;
  onLangChange: (v: Lang) => void;
  settingsDirtyRef: React.MutableRefObject<boolean>;
  settingsSaveRef: React.MutableRefObject<() => Promise<void>>;
  controllerTheme: string;
  onControllerThemeChange: (v: string) => void;
}

const defaultConfig: AppConfig = {
  game_paths: [],
  recent_games: [],
  auto_launch: false,
  minimize_to_tray: true,
  hints_visible: true,
  bg_video: "S1.mp4",
  bg_video_enabled: true,
  bg_dimmed: 0.8,
  ui_opacity: 0.85,
  game_card_opacity: 0.8,
  accent_color: "#2d7aff",
  accent_auto: true,
  start_screen: "home",
  show_game_covers: true,
  language: "ru",
  controller_theme: "ps",
  discord_enabled: true,
};

export function SettingsScreen({
  onRefreshGames, uiOpacity, onUiOpacityChange, gameCardOpacity, onGameCardOpacityChange,
  accentAuto, onAccentAutoChange, onAccentColorChange, lang, onLangChange,
  settingsDirtyRef, settingsSaveRef, controllerTheme, onControllerThemeChange,
}: Props) {
  const { t } = useLocale();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [selectOpen, setSelectOpen] = useState<string | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [colorPos, setColorPos] = useState({ top: 0, left: 0 });
  const selectRef = useRef<HTMLDivElement>(null);
  const langSelectRef = useRef<HTMLDivElement>(null);
  const themeSelectRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const colorGridRef = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useState(0);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  const checkUpdate = useCallback(async () => {
    setUpdateStatus("...");
    try {
      const update = await checkUpdatePlugin();
      if (update) {
        setUpdateStatus(t("update_available"));
        let downloaded = 0;
        await update.downloadAndInstall((event) => {
          if ('progress' in event) downloaded = event.progress;
        });
      } else {
        setUpdateStatus(t("update_uptodate"));
        setTimeout(() => setUpdateStatus(null), 3000);
      }
    } catch {
      setUpdateStatus(t("update_uptodate"));
      setTimeout(() => setUpdateStatus(null), 3000);
    }
  }, [t]);

  useEffect(() => {
    settingsSaveRef.current = async () => {
      if (config) await doSave(config);
    };
  });

  const markDirty = useCallback(() => {
    settingsDirtyRef.current = true;
    forceUpdate(n => n + 1);
  }, []);

  useEffect(() => {
    let retries = 0;
    const fetchConfig = () => {
      invoke<AppConfig>("get_config").then((cfg) => {
        setConfig({
          game_paths: cfg.game_paths || [],
          auto_launch: cfg.auto_launch ?? false,
          minimize_to_tray: cfg.minimize_to_tray ?? true,
          hints_visible: cfg.hints_visible ?? true,
          bg_video: cfg.bg_video || "S1.mp4",
          bg_video_enabled: cfg.bg_video_enabled ?? true,
          bg_dimmed: cfg.bg_dimmed ?? 0.8,
          ui_opacity: cfg.ui_opacity ?? 0.85,
          game_card_opacity: cfg.game_card_opacity ?? 0.8,
          accent_color: cfg.accent_color || "#2d7aff",
          accent_auto: cfg.accent_auto ?? true,
          start_screen: cfg.start_screen || "home",
          show_game_covers: cfg.show_game_covers ?? true,
          language: (cfg.language && ["ru", "en", "uk", "be", "kk", "uz"].includes(cfg.language) ? cfg.language : "ru") as Lang,
          controller_theme: cfg.controller_theme || "ps",
          view_mode: cfg.view_mode || "grid",
  discord_enabled: cfg.discord_enabled ?? true,
        });
      }).catch((err) => {
        console.error("Failed to load config", err);
        if (retries < 3) {
          retries++;
          setTimeout(fetchConfig, 500 * retries);
        }
      });
    };
    fetchConfig();
  }, []);

  const doSave = useCallback(async (updated: AppConfig) => {
    try {
      await invoke("set_config", { config: updated });
      settingsDirtyRef.current = false;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await onRefreshGames();
    } catch (e) {
      console.error(e);
    }
  }, [onRefreshGames, settingsDirtyRef]);

  const update = useCallback((patch: Partial<AppConfig>) => {
    markDirty();
    setConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, ...patch };
    });
  }, [markDirty]);

  const doReset = useCallback(async () => {
    try {
      await invoke("set_config", { config: defaultConfig });
      setConfig({ ...defaultConfig, language: lang });
      onLangChange("ru");
      onUiOpacityChange(0.85);
      onGameCardOpacityChange(0.8);
      onAccentAutoChange(true);
      onAccentColorChange("#2d7aff");
      onControllerThemeChange("ps");
      setResetConfirm(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await onRefreshGames();
    } catch {}
  }, [lang, onRefreshGames, onLangChange, onUiOpacityChange, onGameCardOpacityChange, onAccentAutoChange, onAccentColorChange]);

  useEffect(() => {
    if (selectOpen) {
      const handler = (e: MouseEvent) => {
        const t = e.target as Node;
        const inside = 
          selectRef.current?.contains(t) ||
          langSelectRef.current?.contains(t) ||
          themeSelectRef.current?.contains(t);
        if (!inside) setSelectOpen(null);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [selectOpen]);

  useEffect(() => {
    if (colorPickerOpen) {
      const handler = (e: MouseEvent) => {
        const t = e.target as Node;
        if (colorRef.current && !colorRef.current.contains(t) && colorGridRef.current && !colorGridRef.current.contains(t))
          setColorPickerOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [colorPickerOpen]);

  if (!config) {
    return (
      <div className="settings-screen">
        <div className="settings-header">
          <h2 className="settings-title">{t("settings_title")}</h2>
        </div>
        <div className="loading-screen">
          <p>{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-screen">
      <div className="settings-header">
        <h2 className="settings-title">{t("settings_title")}</h2>
        <button className="settings-save-btn" onClick={() => doSave(config)}>
          {saved ? t("saved_ok") : t("save")}
        </button>
      </div>

      <div className="settings-grid">
        <section className="settings-section">
          <h3 className="settings-section-title">{t("general")}</h3>

          <div className="settings-row">
            <span>{t("minimize_tray")}</span>
            <button className={`toggle-switch ${config.minimize_to_tray ? "on" : ""}`} onClick={() => update({ minimize_to_tray: !config.minimize_to_tray })} tabIndex={-1}>
              <div className="toggle-knob" />
            </button>
          </div>

          <div className="settings-row">
            <span>{t("autostart")}</span>
            <button className={`toggle-switch ${config.auto_launch ? "on" : ""}`} onClick={() => update({ auto_launch: !config.auto_launch })} tabIndex={-1}>
              <div className="toggle-knob" />
            </button>
          </div>

          <div className="settings-row">
            <span>{t("start_screen")}</span>
            <div className="custom-select-wrap" ref={selectRef}>
              <button className="custom-select" onClick={() => setSelectOpen((v) => v === "start" ? null : "start")}>
                <span>{t(START_OPTIONS.find((o) => o.value === config.start_screen)?.label || "home")}</span>
                <span className="custom-select-arrow">▾</span>
              </button>
              {selectOpen === "start" && (
                <div className="custom-select-dropdown">
                  {START_OPTIONS.map((o) => (
                    <button key={o.value} className={`custom-select-option ${config.start_screen === o.value ? "active" : ""}`} onClick={() => { update({ start_screen: o.value }); setSelectOpen(null); }}>
                      {t(o.label)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="settings-row">
            <span>{t("show_covers")}</span>
            <button className={`toggle-switch ${config.show_game_covers ? "on" : ""}`} onClick={() => update({ show_game_covers: !config.show_game_covers })} tabIndex={-1}>
              <div className="toggle-knob" />
            </button>
          </div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span>{t("settings_discord")}</span>
              <span className="settings-row-desc">{t("settings_discord_desc")}</span>
            </div>
            <button className={`toggle-switch ${config.discord_enabled ? "on" : ""}`} onClick={() => { const next = !config.discord_enabled; update({ discord_enabled: next }); if (!next) invoke("clear_discord_presence").catch(() => {}); }} tabIndex={-1}>
              <div className="toggle-knob" />
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h3 className="settings-section-title">{t("appearance")}</h3>

          <div className="settings-row">
            <span>{t("bg_video")}</span>
            <button className={`toggle-switch ${config.bg_video_enabled ? "on" : ""}`} onClick={() => update({ bg_video_enabled: !config.bg_video_enabled })} tabIndex={-1}>
              <div className="toggle-knob" />
            </button>
          </div>

          {config.bg_video_enabled && (
            <>
              <div className="bg-selector">
                {BG_OPTIONS.map((o, i) => (
                  <button key={o.value} className={`bg-card ${config.bg_video === o.value ? "active" : ""}`} onClick={() => update({ bg_video: o.value })}>
                    <div className="bg-card-preview" style={{ background: BG_GRADIENTS[i % BG_GRADIENTS.length] }}>
                      <span className="bg-card-num">{o.label}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="settings-row">
                <span>{t("dimming")}</span>
                <input type="range" min="0" max="1" step="0.05" className="settings-slider" value={config.bg_dimmed} onChange={(e) => update({ bg_dimmed: parseFloat(e.target.value) })} />
                <span className="settings-slider-value">{Math.round(config.bg_dimmed * 100)}%</span>
              </div>
            </>
          )}

          <div className="settings-row">
            <span>{t("panel_opacity")}</span>
            <input type="range" min="0.3" max="1" step="0.05" className="settings-slider" value={uiOpacity} onChange={(e) => { const v = parseFloat(e.target.value); onUiOpacityChange(v); update({ ui_opacity: v }); }} />
            <span className="settings-slider-value">{Math.round(uiOpacity * 100)}%</span>
          </div>

          <div className="settings-row">
            <span>{t("card_opacity")}</span>
            <input type="range" min="0.3" max="1" step="0.05" className="settings-slider" value={gameCardOpacity} onChange={(e) => { const v = parseFloat(e.target.value); onGameCardOpacityChange(v); update({ game_card_opacity: v }); }} />
            <span className="settings-slider-value">{Math.round(gameCardOpacity * 100)}%</span>
          </div>

          <div className="settings-row">
            <span>{t("accent_color")}</span>
            <div className="settings-toggle-group">
              <button className={`toggle-btn ${accentAuto ? "active" : ""}`} onClick={() => { onAccentAutoChange(true); update({ accent_auto: true }); }}>
                {t("accent_auto")}
              </button>
              <button className={`toggle-btn ${!accentAuto ? "active" : ""}`} onClick={() => { onAccentAutoChange(false); update({ accent_auto: false }); }}>
                {t("accent_custom")}
              </button>
            </div>
          </div>
          <div className="settings-row">
            <span className={accentAuto ? "disabled" : ""}>{t("custom_color")}</span>
            <div className="color-picker-wrap">
              {accentAuto ? (
                <div className="color-picker-btn disabled" style={{ background: config.accent_color }} />
              ) : (
                <>
                <button className="color-picker-btn" style={{ background: config.accent_color }} onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setColorPos({ top: r.bottom + 4, left: r.left }); setColorPickerOpen((v) => !v); }} ref={colorRef}>
                  <span className="color-picker-label">{t("choose")}</span>
                </button>
                {colorPickerOpen && createPortal(
                  <div className="color-picker-grid" ref={colorGridRef} style={{ position: "fixed", top: colorPos.top, left: colorPos.left }}>
                    {ACCENT_PRESETS.map((color) => (
                      <button key={color} className={`color-preset ${config.accent_color === color ? "active" : ""}`} style={{ background: color }} onClick={() => { update({ accent_color: color }); onAccentColorChange(color); setColorPickerOpen(false); }} />
                    ))}
                    <button className="color-preset custom" onClick={() => { const input = document.createElement("input"); input.type = "color"; input.value = config.accent_color; input.oninput = () => { update({ accent_color: input.value }); onAccentColorChange(input.value); }; input.click(); setColorPickerOpen(false); }} title={t("custom_color")}><span>+</span></button>
                  </div>,
                  document.body
                )}
                </>
              )}
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h3 className="settings-section-title">{t("game_paths")}</h3>
          <p className="settings-hint">{t("paths_hint")}</p>
          {config.game_paths.map((p, i) => (
            <div key={i} className="settings-path-row">
              <span className="settings-path">{p}</span>
              <button className="settings-remove-btn" onClick={() => update({ game_paths: config.game_paths.filter((_, j) => j !== i) })}>✕</button>
            </div>
          ))}
          <button className="settings-add-btn" onClick={async () => { try { const selected = await open({ directory: true, multiple: false }); if (selected) update({ game_paths: [...config.game_paths, selected] }); } catch {} }}>
            {t("add_folder")}
          </button>
        </section>

        <section className="settings-section">
          <h3 className="settings-section-title">{t("language")}</h3>
          <div className="settings-row">
            <span>{t("language")}</span>
            <div className="custom-select-wrap" ref={langSelectRef}>
              <button className="custom-select" onClick={() => setSelectOpen((v) => v === "lang" ? null : "lang")}>
                <span>{langNames[lang]}</span>
                <span className="custom-select-arrow">▾</span>
              </button>
              {selectOpen === "lang" && (
                <div className="custom-select-dropdown">
                  {(Object.keys(langNames) as Lang[]).map((l) => (
                    <button
                      key={l}
                      className={`custom-select-option ${lang === l ? "active" : ""}`}
                      onClick={() => { onLangChange(l); update({ language: l }); setSelectOpen(null); }}
                    >
                      {langNames[l]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="settings-row">
            <span>{t("controller_theme")}</span>
            <div className="custom-select-wrap" ref={themeSelectRef}>
              <button className="custom-select" onClick={() => setSelectOpen((v) => v === "theme" ? null : "theme")}>
                <span>{t("controller_" + controllerTheme)}</span>
                <span className="custom-select-arrow">▾</span>
              </button>
              {selectOpen === "theme" && (
                <div className="custom-select-dropdown">
                  {(["ps", "xbox"] as const).map((v) => (
                    <button key={v} className={`custom-select-option ${controllerTheme === v ? "active" : ""}`} onClick={() => { onControllerThemeChange(v); update({ controller_theme: v }); setSelectOpen(null); }}>
                      {t("controller_" + v)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h3 className="settings-section-title">{t("system")}</h3>
          <div className="settings-row">
            <span>{t("app_version")}</span>
            <span className="settings-value">1.1.0</span>
          </div>
          <div className="settings-row">
            <span>{t("update_check")}</span>
            <button className="settings-btn" onClick={checkUpdate}>
              {updateStatus || t("update_check")}
            </button>
          </div>
          <div className="settings-row" style={{ border: "none" }}>
            {!resetConfirm ? (
              <button className="settings-reset-btn" onClick={() => setResetConfirm(true)}>
                {t("reset")}
              </button>
            ) : (
              <div className="reset-confirm-row">
                <span>{t("reset_confirm")}</span>
                <button className="reset-yes" onClick={doReset}>{t("yes")}</button>
                <button className="reset-no" onClick={() => setResetConfirm(false)}>{t("no")}</button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}