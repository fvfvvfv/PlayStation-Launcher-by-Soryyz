use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub game_paths: Vec<String>,
    pub auto_launch: bool,
    pub minimize_to_tray: bool,
    pub hints_visible: bool,
    pub bg_video: String,
    pub bg_video_enabled: bool,
    pub bg_dimmed: f64,
    pub accent_color: String,
    pub start_screen: String,
    pub show_game_covers: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            game_paths: Vec::new(),
            auto_launch: false,
            minimize_to_tray: true,
            hints_visible: true,
            bg_video: "S1.mp4".to_string(),
            bg_video_enabled: true,
            bg_dimmed: 0.8,
            accent_color: "#2d7aff".to_string(),
            start_screen: "home".to_string(),
            show_game_covers: true,
        }
    }
}

impl AppConfig {
    fn path() -> PathBuf {
        let mut p = std::env::current_exe().unwrap_or_default();
        p.set_file_name("config.json");
        p
    }

    pub fn load() -> Self {
        let path = Self::path();
        std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    pub fn save(&self) {
        if let Ok(data) = serde_json::to_string_pretty(self) {
            let _ = std::fs::write(Self::path(), data);
        }
    }
}

pub struct ConfigState(pub Mutex<AppConfig>);

#[tauri::command]
pub fn get_config(state: tauri::State<ConfigState>) -> AppConfig {
    state.0.lock().unwrap().clone()
}

#[tauri::command]
pub fn set_config(state: tauri::State<ConfigState>, config: AppConfig) {
    let mut c = state.0.lock().unwrap();
    *c = config.clone();
    c.save();
}
