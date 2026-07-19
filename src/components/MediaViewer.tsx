import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { useLocale } from "../hooks/useLocale";
import { vibrate } from "../hooks/vibrate";

interface MediaFile {
  name: string;
  path: string;
  is_image: boolean;
  thumbnail: string | null;
}

interface Props {
  initialTab: "screenshots" | "videos";
  onBack: () => void;
  onTabChange: (tab: "screenshots" | "videos") => void;
  icons: {
    ConfirmIcon: () => ReactNode;
    BackIcon: () => ReactNode;
    LbIcon: () => ReactNode;
    RbIcon: () => ReactNode;
    DpadNav: () => ReactNode;
    SearchIcon: () => ReactNode;
    ToggleIcon: () => ReactNode;
  };
  showHints: boolean;
  onToggleHints: () => void;
}

const TABS: ("screenshots" | "videos")[] = ["screenshots", "videos"];

const _cache: Record<string, MediaFile[]> = {};

function VideoThumbnail({ path }: { path: string }) {
  const [state, setState] = useState<"loading" | "ok" | "err">("loading");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let done = false;
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.crossOrigin = "anonymous";

    try {
      const src = convertFileSrc(path);
      if (!src) { setState("err"); return; }
      video.src = src;
    } catch { setState("err"); return; }

    const timeout = setTimeout(() => { if (!done) { done = true; setState("err"); video.remove(); } }, 4000);
    const capture = () => {
      if (done || !mountedRef.current) return;
      done = true; clearTimeout(timeout);
      try {
        if (!video.videoWidth || !video.videoHeight) { setState("err"); video.remove(); return; }
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(video.videoWidth, 320);
        canvas.height = Math.min(video.videoHeight, 180);
        const ctx = canvas.getContext("2d");
        if (!ctx) { setState("err"); video.remove(); return; }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL("image/jpeg", 0.4);
        if (mountedRef.current) { setDataUrl(url); setState("ok"); }
      } catch { setState("err"); }
      video.remove();
    };

    video.onloadedmetadata = () => {
      if (!done) video.currentTime = Math.min(0.5, video.duration || 1);
    };
    video.onseeked = capture;
    video.onerror = () => { if (!done) { done = true; clearTimeout(timeout); setState("err"); video.remove(); } };

    return () => { mountedRef.current = false; clearTimeout(timeout); if (!done) { video.remove(); done = true; } };
  }, [path]);

  if (state === "ok" && dataUrl) return <img className="media-viewer-thumb" src={dataUrl} alt="" />;
  return <div className="media-viewer-video-thumb"><span>🎥</span></div>;
}

export function MediaViewer({ initialTab, onBack, onTabChange, icons, showHints, onToggleHints }: Props) {
  const { t } = useLocale();
  const [tabIdx, setTabIdx] = useState(initialTab === "videos" ? 1 : 0);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [preview, setPreview] = useState<MediaFile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmFocus, setConfirmFocus] = useState(0);
  const [cols, setCols] = useState(4);
  const mountedRef = useRef(true);
  const prevRef = useRef(new Map<string, number>());
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    setTabIdx(initialTab === "videos" ? 1 : 0);
    setSelected(null);
    setPreview(null);
    setConfirmDelete(null);
  }, [initialTab]);

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
  }, [files]);

  const load = useCallback((idx: number) => {
    const key = TABS[idx];
    if (key in _cache) { setFiles(_cache[key]); return; }
    invoke<MediaFile[]>("get_media_files", { dirType: key })
      .then((res) => {
        if (!mountedRef.current) return;
        _cache[key] = res;
        setFiles(res);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { load(tabIdx); }, [tabIdx, load]);

  useEffect(() => {
    if (files.length > 0 && (selected === null || selected >= files.length)) setSelected(0);
  }, [files]);

  const switchTab = useCallback((idx: number) => {
    if (idx < 0 || idx >= TABS.length || idx === tabIdx) return;
    setTabIdx(idx);
    setSelected(null);
    setPreview(null);
    setConfirmDelete(null);
    onTabChange(TABS[idx]);
  }, [tabIdx, onTabChange]);

  const del = useCallback(async (path: string) => {
    try {
      await invoke("delete_media_file", { path });
      const key = TABS[tabIdx];
      _cache[key] = (_cache[key] || []).filter((f) => f.path !== path);
      setFiles(_cache[key]);
      setConfirmDelete(null);
    } catch {}
  }, [tabIdx]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (confirmDelete) {
        if (e.key === "Escape") { setConfirmDelete(null); return; }
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") { setConfirmFocus((f) => (f === 0 ? 1 : 0)); return; }
        if (e.key === "Enter") { if (confirmFocus === 1) del(confirmDelete); else setConfirmDelete(null); return; }
        return;
      }
      if (preview) {
        if (e.key === "Escape" || e.key === "Backspace" || e.key === "Enter") { setPreview(null); }
        return;
      }
      if (e.key === "Escape" || e.key === "Backspace") { onBack(); }
      if (e.key === "Delete" && selected !== null && files[selected]) setConfirmDelete(files[selected].path);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onBack, preview, selected, files, confirmDelete, del, confirmFocus]);

  const handleAction = useCallback(
    (action: string) => {
      if (!mountedRef.current) return;
      if (confirmDelete) {
        if (action === "left" || action === "right") { setConfirmFocus((f) => (f === 0 ? 1 : 0)); return; }
        if (action === "confirm") { if (confirmFocus === 1) del(confirmDelete); else setConfirmDelete(null); return; }
        if (action === "back") { setConfirmDelete(null); return; }
        return;
      }
      if (preview) {
        if (action === "back" || action === "confirm") { setPreview(null); }
        else if (action === "delete") setConfirmDelete(preview.path);
        return;
      }
      switch (action) {
        case "back": onBack(); break;
        case "left":
          setSelected((i) => (i === null || i <= 0 ? 0 : i - 1));
          break;
        case "right":
          setSelected((i) => (i === null ? 0 : Math.min(i + 1, files.length - 1)));
          break;
        case "up": {
          setSelected((i) => (i === null || i < cols ? 0 : i - cols));
          break;
        }
        case "down": {
          setSelected((i) => (i === null ? 0 : Math.min(i + cols, files.length - 1)));
          break;
        }
        case "confirm":
          if (selected !== null && files[selected]) setPreview(files[selected]);
          break;
        case "delete":
          if (selected !== null && files[selected]) { setConfirmDelete(files[selected].path); setConfirmFocus(0); }
          break;
        case "lb":
          switchTab(Math.max(0, tabIdx - 1));
          break;
        case "rb":
          switchTab(Math.min(TABS.length - 1, tabIdx + 1));
          break;
        case "toggle_hints":
          onToggleHints();
          break;
      }
    },
    [onBack, files, selected, preview, tabIdx, switchTab, confirmDelete, del, onToggleHints, cols, confirmFocus]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const gamepad = Array.from(navigator.getGamepads()).find((g) => g !== null);
      if (!gamepad) return;
      const prev = prevRef.current;
      const axes = gamepad.axes;
      const axisLeftRight = Math.abs(axes[0]) > 0.5;
      const axisUpDown = Math.abs(axes[1]) > 0.5;
      const vibrateForAction = (action: string) => {
        switch (action) {
          case "up": case "down": case "left": case "right":
            vibrate(gamepad, 38, 0.6, 0.6); break;
          case "confirm":
            vibrate(gamepad, 63, 1.0, 1.0); break;
          case "back":
            vibrate(gamepad, 50, 0.75, 0.75); break;
          case "lb": case "rb":
            vibrate(gamepad, 88, 1.0, 1.0); break;
          case "delete":
            vibrate(gamepad, 100, 1.0, 1.0); break;
          case "toggle_hints":
            vibrate(gamepad, 50, 0.75, 0.75); break;
        }
      };
      const handleWithVibrate = (a: string) => { handleAction(a); vibrateForAction(a); };
      const actions: [string, number][] = [
        ["confirm", 0], ["back", 1], ["delete", 2], ["toggle_hints", 3],
        ["lb", 4], ["rb", 5],
      ];
      for (const [action, idx] of actions) {
        const pressed = gamepad.buttons[idx]?.pressed ?? false;
        const k = `${action}-${gamepad.index}`;
        const p = prev.get(k) ?? 0;
        if (pressed && p === 0) { handleWithVibrate(action); prev.set(k, 1); }
        else if (!pressed) { prev.set(k, 0); }
      }
      if (axisLeftRight) {
        const dir = axes[0] < -0.5 ? "left" : "right";
        const k = `axis-${dir}-${gamepad.index}`;
        const p = prev.get(k) ?? 0;
        if (p === 0) { handleWithVibrate(dir); prev.set(k, 1); }
      } else {
        const kl = `axis-left-${gamepad.index}`;
        const kr = `axis-right-${gamepad.index}`;
        if (prev.get(kl) === 1) prev.set(kl, 0);
        if (prev.get(kr) === 1) prev.set(kr, 0);
      }
      if (axisUpDown) {
        const dir = axes[1] < -0.5 ? "up" : "down";
        const k = `axis-${dir}-${gamepad.index}`;
        const p = prev.get(k) ?? 0;
        if (p === 0) { handleWithVibrate(dir); prev.set(k, 1); }
      } else {
        const ku = `axis-up-${gamepad.index}`;
        const kd = `axis-down-${gamepad.index}`;
        if (prev.get(ku) === 1) prev.set(ku, 0);
        if (prev.get(kd) === 1) prev.set(kd, 0);
      }
    }, 80);
    return () => clearInterval(interval);
  }, [handleAction]);

  return (
    <div className="media-viewer">
      {preview && createPortal(
        <div className="preview-overlay" onClick={() => setPreview(null)}>
          <div className="preview-frame" onClick={(e) => e.stopPropagation()}>
            {preview.is_image && preview.thumbnail ? (
              <img className="preview-image" src={preview.thumbnail} alt={preview.name} />
            ) : (
              <video className="preview-video" src={(() => { try { return convertFileSrc(preview.path); } catch { return ""; } })()} controls autoPlay />
            )}
          </div>
        </div>,
        document.body
      )}

      {files.length === 0 ? (
        <div className="media-viewer-empty">
          <p>{t("no_files")}</p>
          <p className="empty-hint">{tabIdx === 0 ? t("add_images") : t("add_videos")}</p>
        </div>
      ) : (
        <div className="media-viewer-grid" ref={gridRef}>
          {files.map((file, i) => (
            <div
              key={file.path}
              className={`media-viewer-item ${selected === i ? "selected focused" : ""}`}
              onClick={() => { setSelected(i); }}
              onDoubleClick={() => { if (file) setPreview(file); }}
            >
              {file.is_image && file.thumbnail ? (
                <img className="media-viewer-thumb" src={file.thumbnail} alt={file.name} />
              ) : (
                <VideoThumbnail path={file.path} />
              )}
              <span className="media-viewer-name">{file.name}</span>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && createPortal(
        <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">{t("confirm_question")}</div>
            <div className="confirm-actions">
              <button className={`confirm-btn confirm-no ${confirmFocus === 0 ? "focused" : ""}`} onClick={() => setConfirmDelete(null)}>{t("no")}</button>
              <button className={`confirm-btn confirm-yes ${confirmFocus === 1 ? "focused" : ""}`} onClick={() => del(confirmDelete)}>{t("yes")}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <footer className={`bottom-bar ${showHints ? "visible" : ""}`}>
        <div className="bottom-bar-inner">
          <div className="bottom-hint"><icons.ConfirmIcon />{t("open")}</div>
          <div className="bottom-hint"><icons.BackIcon />{t("back")}</div>
          <div className="bottom-hint"><icons.LbIcon /> <icons.RbIcon />{t("tabs")}</div>
          <div className="bottom-hint"><icons.SearchIcon />{t("delete")}</div>
          <div className="bottom-hint"><icons.ToggleIcon />{showHints ? t("hide") : t("show")}</div>
          <div className="bottom-hint"><icons.DpadNav />{t("navigation")}</div>
        </div>
      </footer>
    </div>
  );
}
