import { invoke } from "@tauri-apps/api/core";
import type { GameEntry } from "../types";

interface Props {
  games: GameEntry[];
  onOpenLibrary: () => void;
}

function openFolder(path: string) {
  invoke("open_folder", { path });
}

export function MediaScreen({ games, onOpenLibrary }: Props) {
  const recent = games.slice(0, 5);

  return (
    <div className="media-screen">
      <h2 className="media-title">Медиа</h2>

      {recent.length > 0 && (
        <section className="media-section">
          <h3 className="media-section-title">Недавние игры</h3>
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
        <h3 className="media-section-title">Библиотека медиа</h3>
        <div className="media-captures-grid">
          <div
            className="media-capture-card"
            onClick={() => openFolder("%USERPROFILE%\\Pictures\\LaunchScreen")}
          >
            <span className="media-capture-icon">📸</span>
            <span className="media-capture-label">Скриншоты</span>
            <span className="media-capture-hint">Открыть папку</span>
          </div>
          <div
            className="media-capture-card"
            onClick={() => openFolder("%USERPROFILE%\\Videos\\LaunchVideo")}
          >
            <span className="media-capture-icon">🎥</span>
            <span className="media-capture-label">Видео</span>
            <span className="media-capture-hint">Открыть папку</span>
          </div>
        </div>
      </section>
    </div>
  );
}
