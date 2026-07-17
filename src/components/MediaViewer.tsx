import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";

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
  controller: string;
  icons: {
    ConfirmIcon: () => JSX.Element;
    BackIcon: () => JSX.Element;
    DpadNav: () => JSX.Element;
  };
  showHints: boolean;
  onToggleHints: () => void;
}

const TABS: ("screenshots" | "videos")[] = ["screenshots", "videos"];

const _cache: Record<string, MediaFile[]> = {};
let _cacheKey = "";

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

export function MediaViewer({ initialTab, onBack, onTabChange, controller, icons, showHints, onToggleHints }: Props) {
  const [tabIdx, setTabIdx] = useState(initialTab === "videos" ? 1 : 0);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [preview, setPreview] = useState<MediaFile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const prevRef = useRef(new Map<string, number>());

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    setTabIdx(initialTab === "videos" ? 1 : 0);
    setSelected(null);
    setPreview(null);
    setConfirmDelete(null);
  }, [initialTab]);

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
        if (e.key === "Escape") setConfirmDelete(null);
        else if (e.key === "Enter") { del(confirmDelete); }
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
  }, [onBack, preview, selected, files, confirmDelete, del]);

  const handleAction = useCallback(
    (action: string) => {
      if (!mountedRef.current) return;
      if (confirmDelete) {
        if (action === "back") setConfirmDelete(null);
        else if (action === "confirm") del(confirmDelete);
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
          const cols = Math.max(1, Math.min(4, Math.floor(window.innerWidth / 200)));
          setSelected((i) => (i === null || i < cols ? 0 : i - cols));
          break;
        }
        case "down": {
          const cols = Math.max(1, Math.min(4, Math.floor(window.innerWidth / 200)));
          setSelected((i) => (i === null ? 0 : Math.min(i + cols, files.length - 1)));
          break;
        }
        case "confirm":
          if (selected !== null && files[selected]) setPreview(files[selected]);
          break;
        case "delete":
          if (selected !== null && files[selected]) setConfirmDelete(files[selected].path);
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
    [onBack, files, selected, preview, tabIdx, switchTab, confirmDelete, del, onToggleHints]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const gamepad = Array.from(navigator.getGamepads()).find((g) => g !== null);
      if (!gamepad) return;
      const prev = prevRef.current;
      const actions: [string, number][] = [
        ["confirm", 0], ["back", 1], ["delete", 2], ["toggle_hints", 3],
        ["lb", 4], ["rb", 5],
      ];
      for (const [action, idx] of actions) {
        const pressed = gamepad.buttons[idx]?.pressed ?? false;
        const k = `${action}-${gamepad.index}`;
        const p = prev.get(k) ?? 0;
        if (pressed && p === 0) { handleAction(action); prev.set(k, 1); }
        else if (!pressed) { prev.set(k, 0); }
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
          <p>Нет файлов</p>
          <p className="empty-hint">Добавьте {tabIdx === 0 ? "изображения" : "видео"} в папку</p>
        </div>
      ) : (
        <div className="media-viewer-grid">
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
              {selected === i && (
                <button className="media-viewer-del" onClick={(e) => { e.stopPropagation(); setConfirmDelete(file.path); }}>🗑</button>
              )}
            </div>
          ))}
        </div>
      )}

      {confirmDelete && createPortal(
        <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">Вы уверены?</div>
            <div className="confirm-actions">
              <button className="confirm-btn confirm-no" onClick={() => setConfirmDelete(null)}>Нет</button>
              <button className="confirm-btn confirm-yes" onClick={() => del(confirmDelete)}>Да</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <footer className={`bottom-bar ${showHints ? "visible" : ""}`}>
        <div className="bottom-bar-inner" style={{ justifyContent: "center", gap: 32 }}>
          <div className="bottom-hint"><span className="hint-icon-wrap"><icons.ConfirmIcon /></span>Открыть</div>
          <div className="bottom-hint"><span className="hint-icon-wrap"><icons.BackIcon /></span>Назад</div>
          <div className="bottom-hint">
            {controller === "xbox"
              ? <img src="/icons/XBOX_iconpack/button_xbox_digital_x_1.svg" className="hint-icon-img" draggable={false} />
              : <span className="hint-icon-char">□</span>}
            Удалить
          </div>
          <div className="bottom-hint">
            {controller === "xbox"
              ? <img src="/icons/XBOX_iconpack/button_xbox_digital_y_1.svg" className="hint-icon-img" draggable={false} />
              : <span className="hint-icon-char">△</span>}
            Скрыть
          </div>
          <div className="bottom-hint"><span className="hint-icon-wrap"><icons.DpadNav /></span>Навигация</div>
        </div>
      </footer>
    </div>
  );
}
