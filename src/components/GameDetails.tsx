import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLocale } from "../hooks/useLocale";
import type { GameEntry, TagsData, TagDefinition } from "../types";
import type { Icons } from "./ControllerIcons";

interface Props {
  game: GameEntry;
  onLaunch: (path: string, name: string) => void;
  onClose: () => void;
  showFocus: boolean;
  icons: Icons;
  showHints: boolean;
  coverData: string | null;
  tagsData: TagsData;
  onTagsChange: (data: TagsData) => void;
  tagEditorOpen: boolean;
  onToggleEditor: () => void;
  gamepadHandlerRef?: React.MutableRefObject<((action: string) => boolean) | null>;
}

const setDiscord = (details: string) => {
  invoke("set_discord_presence", { details }).catch(() => {});
};

export function GameDetails({ game, onLaunch, onClose, showFocus, icons, showHints, coverData, tagsData, onTagsChange, tagEditorOpen, onToggleEditor, gamepadHandlerRef }: Props) {
  const { t, lang } = useLocale();
  const [focusIdx, setFocusIdx] = useState(0);
  const [tagEditorFocusIdx, setTagEditorFocusIdx] = useState(0);
  const tagEditorFocusRef = useRef(0);
  tagEditorFocusRef.current = tagEditorFocusIdx;
  const containerRef = useRef<HTMLDivElement>(null);

  const gameTags = tagsData.assignments[game.path] || [];
  const gameTagsRef = useRef(gameTags);
  gameTagsRef.current = gameTags;

  const addTag = useCallback(async (tagId: string) => {
    const newTags = [...gameTags, tagId];
    const newData = { ...tagsData, assignments: { ...tagsData.assignments, [game.path]: newTags } };
    onTagsChange(newData);
    await invoke("set_tags_data", { data: newData }).catch(() => {});
  }, [gameTags, tagsData, game.path, onTagsChange]);

  const removeTag = useCallback(async (tagId: string) => {
    const newTags = gameTags.filter((t) => t !== tagId);
    const newData = { ...tagsData, assignments: { ...tagsData.assignments, [game.path]: newTags } };
    onTagsChange(newData);
    await invoke("set_tags_data", { data: newData }).catch(() => {});
  }, [gameTags, tagsData, game.path, onTagsChange]);

  const addTagRef = useRef(addTag);
  addTagRef.current = addTag;
  const removeTagRef = useRef(removeTag);
  removeTagRef.current = removeTag;
  const onToggleEditorRef = useRef(onToggleEditor);
  onToggleEditorRef.current = onToggleEditor;

  // Update Discord presence when viewing game
  useEffect(() => {
    setDiscord(`Просматривает ${game.name}`);
    return () => setDiscord("В лаунчере");
  }, [game.name]);

  // Register gamepad handler for tag editor navigation
  useEffect(() => {
    if (!gamepadHandlerRef) return;
    if (!tagEditorOpen) {
      gamepadHandlerRef.current = null;
      return;
    }
    gamepadHandlerRef.current = (action: string) => {
      switch (action) {
        case "up":
          setTagEditorFocusIdx((prev) => Math.max(0, prev - 1));
          return true;
        case "down":
          setTagEditorFocusIdx((prev) => {
            const total = gameTagsRef.current.length + availableTagsRef.current.length;
            return Math.min(total - 1, prev + 1);
          });
          return true;
        case "confirm": {
          const idx = tagEditorFocusRef.current;
          const gt = gameTagsRef.current;
          const at = availableTagsRef.current;
          if (idx < gt.length) removeTagRef.current(gt[idx]);
          else if (idx - gt.length < at.length) addTagRef.current(at[idx - gt.length].id);
          return true;
        }
      }
      return false;
    };
    return () => { if (gamepadHandlerRef) gamepadHandlerRef.current = null; };
  }, [tagEditorOpen, gamepadHandlerRef]);

  const getTagName = useCallback((def: TagDefinition) => {
    return def.names[lang] || def.names["en"] || def.id;
  }, [lang]);

  const availableTags = tagsData.definitions.filter((d) => !gameTags.includes(d.id));
  const availableTagsRef = useRef(availableTags);
  availableTagsRef.current = availableTags;

  const bindings = tagEditorOpen
    ? [
        { label: t("details_close"), key: "back", icon: icons.BackIcon },
        { label: t("details_edit_tags"), key: "confirm", icon: icons.SearchIcon },
      ]
    : [
        { label: t("details_launch"), key: "confirm", icon: icons.ConfirmIcon },
        { label: t("details_close"), key: "back", icon: icons.BackIcon },
        { label: t("details_edit_tags"), key: "toggle_view", icon: icons.ViewToggleIcon },
        { label: showHints ? t("hide") : t("show"), key: "toggle_hints", icon: icons.ToggleIcon },
      ];

  useEffect(() => {
    if (tagEditorOpen) setTagEditorFocusIdx(0);
  }, [tagEditorOpen]);

  // Keyboard navigation for tag editor
  useEffect(() => {
    if (!tagEditorOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setTagEditorFocusIdx((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setTagEditorFocusIdx((prev) => {
          const total = gameTagsRef.current.length + availableTagsRef.current.length;
          return Math.min(total - 1, prev + 1);
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        const idx = tagEditorFocusRef.current;
        const gt = gameTagsRef.current;
        const at = availableTagsRef.current;
        if (idx < gt.length) removeTagRef.current(gt[idx]);
        else if (idx - gt.length < at.length) addTagRef.current(at[idx - gt.length].id);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [tagEditorOpen]);



  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (tagEditorOpen) onToggleEditor();
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, tagEditorOpen, onToggleEditor]);

  return (
    <div className="details-overlay" ref={containerRef} onClick={onClose}>
      <div className="details-panel" onClick={(e) => e.stopPropagation()}>
        <div className="details-header">
          <div className="details-cover-wrap">
            {coverData ? (
              <img src={coverData} alt={game.name} className="details-cover" />
            ) : (
              <div className="details-cover-fallback">{game.name.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <div className="details-info">
            <h2 className="details-title">{game.name}</h2>
            <span className="details-source">{game.source}</span>
          </div>
        </div>

        <div className="details-body">
          <div className="details-tags-section">
            <div className="details-tags-header">
              <span className="details-section-label">{t("details_tags")}</span>
              <button
                className={`details-edit-tags-btn ${showFocus && !tagEditorOpen ? "focused" : ""}`}
                onClick={onToggleEditor}
              >
                {showHints && <icons.ViewToggleIcon />} {t("details_edit_tags")}
              </button>
            </div>
            <div className="details-tags-list">
              {gameTags.length === 0 ? (
                <span className="details-no-tags">{t("details_no_tags")}</span>
              ) : (
                gameTags.map((tid) => {
                  const def = tagsData.definitions.find((d) => d.id === tid);
                  return (
                    <span key={tid} className="details-tag">
                      {def ? getTagName(def) : tid}
                    </span>
                  );
                })
              )}
            </div>
          </div>

          {tagEditorOpen && (
            <div className="details-tag-editor">
              <div className="details-tag-editor-title">{t("details_edit_tags")}</div>
              {gameTags.map((tid, i) => {
                const def = tagsData.definitions.find((d) => d.id === tid);
                return (
                  <div
                    key={tid}
                    className={`details-tag-editor-item ${showFocus && tagEditorFocusIdx === i ? "focused" : ""}`}
                    onClick={() => removeTag(tid)}
                  >
                    <span>{def ? getTagName(def) : tid}</span>
                    <span className="details-tag-remove">✕</span>
                  </div>
                );
              })}
              {availableTags.map((def, i) => (
                <div
                  key={def.id}
                  className={`details-tag-editor-item unused ${showFocus && tagEditorFocusIdx === gameTags.length + i ? "focused" : ""}`}
                  onClick={() => addTag(def.id)}
                >
                  <span>{getTagName(def)}</span>
                  <span className="details-tag-add">✓</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="details-actions">
          <button
            className={`details-action-btn primary ${showFocus && focusIdx === 0 ? "focused" : ""}`}
            onClick={() => onLaunch(game.path, game.name)}
          >
            {showHints && <icons.ConfirmIcon />} <span className="details-action-label">{t("details_launch")}</span>
          </button>
          <button
            className={`details-action-btn secondary ${showFocus && focusIdx === 1 ? "focused" : ""}`}
            onClick={onClose}
          >
            {showHints && <icons.BackIcon />} <span className="details-action-label">{t("details_close")}</span>
          </button>
        </div>

        <div className={`details-hints${showFocus && showHints ? " visible" : ""}`}>
          {showFocus && showHints && bindings.map((b, i) => (
            <div key={i} className="details-hint-item">
              <b.icon /> <span>{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}