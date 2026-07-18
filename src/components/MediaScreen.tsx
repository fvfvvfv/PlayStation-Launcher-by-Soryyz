import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLocale } from "../hooks/useLocale";
import type { GameEntry } from "../types";

interface Props {
  games: GameEntry[];
  recentGames: string[];
  onOpenViewer: (tab: "screenshots" | "videos") => void;
  onOpenLibrary: () => void;
  focusIndex: number;
  showFocus: boolean;
}

interface Counts {
  screenshots: number;
  videos: number;
}

export function MediaScreen({ games, recentGames, onOpenViewer, onOpenLibrary, focusIndex, showFocus }: Props) {
  const { t, plural } = useLocale();
  const [counts, setCounts] = useState<Counts>({ screenshots: 0, videos: 0 });

  const recent = recentGames.length > 0
    ? recentGames.map(p => games.find(g => g.path === p)).filter((g): g is NonNullable<typeof g> => !!g)
    : games.slice(0, 3);
  const hasRecent = recent.length > 0;
  const screenshotsIdx = hasRecent ? 1 : 0;
  const videosIdx = hasRecent ? 2 : 1;

  useEffect(() => {
    invoke<Counts>("get_media_counts").then(setCounts).catch(() => {});
    const id = setInterval(() => {
      invoke<Counts>("get_media_counts").then(setCounts).catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="media-screen">
      <h2 className="media-title">{t("media_title")}</h2>

      {hasRecent && (
        <section className="media-section">
          <h3 className="media-section-title">{t("recent_games")}</h3>
          <div className="media-recent-list">
            {recent.map((game) => (
              <div key={game.path} className="media-recent-card" onClick={onOpenLibrary}>
                <div className="media-recent-icon">
                  {game.name.charAt(0).toUpperCase()}
                </div>
                <div className="media-recent-body">
                  <span className="media-recent-name">{game.name}</span>
                  <span className="media-recent-meta">{game.source}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="media-section">
        <h3 className="media-section-title">{t("media_library")}</h3>
        <div className="media-grid">
          <div
            className={`media-grid-card ${showFocus && focusIndex === screenshotsIdx ? "focused" : ""}`}
            onClick={() => onOpenViewer("screenshots")}
          >
            <span className="media-grid-icon">📸</span>
            <div className="media-grid-info">
              <span className="media-grid-label">{t("screenshots")}</span>
              <span className="media-grid-count">{plural(counts.screenshots, "file")}</span>
            </div>
            <span className="media-grid-arrow">→</span>
          </div>
          <div
            className={`media-grid-card ${showFocus && focusIndex === videosIdx ? "focused" : ""}`}
            onClick={() => onOpenViewer("videos")}
          >
            <span className="media-grid-icon">🎥</span>
            <div className="media-grid-info">
              <span className="media-grid-label">{t("videos")}</span>
              <span className="media-grid-count">{plural(counts.videos, "file")}</span>
            </div>
            <span className="media-grid-arrow">→</span>
          </div>
        </div>
      </section>
    </div>
  );
}