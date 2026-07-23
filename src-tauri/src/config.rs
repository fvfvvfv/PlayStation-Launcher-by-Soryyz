use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

fn data_dir() -> PathBuf {
    let base = std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| std::env::current_exe().unwrap_or_default());
    let dir = base.join("SLauncher");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct AppConfig {
    pub game_paths: Vec<String>,
    pub recent_games: Vec<String>,
    pub auto_launch: bool,
    pub minimize_to_tray: bool,
    pub hints_visible: bool,
    pub bg_video: String,
    pub bg_video_enabled: bool,
    pub bg_dimmed: f64,
    pub ui_opacity: f64,
    pub game_card_opacity: f64,
    pub accent_color: String,
    pub accent_auto: bool,
    pub start_screen: String,
    pub show_game_covers: bool,
    pub language: String,
    pub controller_theme: String,
    pub view_mode: String,
    pub discord_enabled: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            game_paths: Vec::new(),
            recent_games: Vec::new(),
            auto_launch: false,
            minimize_to_tray: true,
            hints_visible: true,
            bg_video: "S1.mp4".to_string(),
            bg_video_enabled: true,
            bg_dimmed: 0.8,
            ui_opacity: 0.85,
            game_card_opacity: 0.8,
            accent_color: "#2d7aff".to_string(),
            accent_auto: true,
            start_screen: "home".to_string(),
            show_game_covers: true,
            language: "ru".to_string(),
            controller_theme: "ps".to_string(),
            view_mode: "grid".to_string(),
            discord_enabled: true,
        }
    }
}

impl AppConfig {
    fn path() -> PathBuf {
        data_dir().join("config.json")
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

pub struct FavoritesState(pub Mutex<Vec<String>>);

impl FavoritesState {
    fn path() -> PathBuf {
        data_dir().join("favorites.json")
    }

    pub fn load() -> Self {
        let path = Self::path();
        let data = std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok())
            .unwrap_or_default();
        FavoritesState(Mutex::new(data))
    }

    pub fn save(state: &[String]) {
        if let Ok(data) = serde_json::to_string_pretty(state) {
            let _ = std::fs::write(Self::path(), data);
        }
    }
}

pub struct CoversState(pub Mutex<std::collections::HashMap<String, String>>);

impl CoversState {
    fn path() -> PathBuf {
        data_dir().join("covers.json")
    }

    pub fn load() -> Self {
        let path = Self::path();
        let data = std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str::<std::collections::HashMap<String, String>>(&s).ok())
            .unwrap_or_default();
        CoversState(Mutex::new(data))
    }

    pub fn save(state: &std::collections::HashMap<String, String>) {
        if let Ok(data) = serde_json::to_string_pretty(state) {
            let _ = std::fs::write(Self::path(), data);
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TagDefinition {
    pub id: String,
    pub names: std::collections::HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TagsData {
    pub definitions: Vec<TagDefinition>,
    pub assignments: std::collections::HashMap<String, Vec<String>>,
}

impl Default for TagsData {
    fn default() -> Self {
        Self {
            definitions: vec![
                TagDefinition {
                    id: "action".into(),
                    names: [("ru","Экшен"),("en","Action"),("uk","Екшн"),("be","Экшн"),("kk","Экшн"),("uz","Action")]
                        .map(|(k,v)| (k.to_string(),v.to_string())).into(),
                },
                TagDefinition {
                    id: "adventure".into(),
                    names: [("ru","Приключения"),("en","Adventure"),("uk","Пригоди"),("be","Прыгоды"),("kk","Приключения"),("uz","Sarguzasht")]
                        .map(|(k,v)| (k.to_string(),v.to_string())).into(),
                },
                TagDefinition {
                    id: "rpg".into(),
                    names: [("ru","RPG"),("en","RPG"),("uk","RPG"),("be","РПГ"),("kk","RPG"),("uz","RPG")]
                        .map(|(k,v)| (k.to_string(),v.to_string())).into(),
                },
                TagDefinition {
                    id: "racing".into(),
                    names: [("ru","Гонки"),("en","Racing"),("uk","Гонки"),("be","Гонкі"),("kk","Гонки"),("uz","Poyga")]
                        .map(|(k,v)| (k.to_string(),v.to_string())).into(),
                },
                TagDefinition {
                    id: "shooter".into(),
                    names: [("ru","Шутер"),("en","Shooter"),("uk","Шутер"),("be","Шутар"),("kk","Шутер"),("uz","Shooter")]
                        .map(|(k,v)| (k.to_string(),v.to_string())).into(),
                },
                TagDefinition {
                    id: "simulator".into(),
                    names: [("ru","Симулятор"),("en","Simulator"),("uk","Симулятор"),("be","Сімулятар"),("kk","Симулятор"),("uz","Simulyator")]
                        .map(|(k,v)| (k.to_string(),v.to_string())).into(),
                },
                TagDefinition {
                    id: "strategy".into(),
                    names: [("ru","Стратегия"),("en","Strategy"),("uk","Стратегія"),("be","Стратэгія"),("kk","Стратегия"),("uz","Strategiya")]
                        .map(|(k,v)| (k.to_string(),v.to_string())).into(),
                },
                TagDefinition {
                    id: "sports".into(),
                    names: [("ru","Спорт"),("en","Sports"),("uk","Спорт"),("be","Спорт"),("kk","Спорт"),("uz","Sport")]
                        .map(|(k,v)| (k.to_string(),v.to_string())).into(),
                },
                TagDefinition {
                    id: "horror".into(),
                    names: [("ru","Хоррор"),("en","Horror"),("uk","Хорор"),("be","Хорар"),("kk","Хоррор"),("uz","Qo'rqinchli")]
                        .map(|(k,v)| (k.to_string(),v.to_string())).into(),
                },
                TagDefinition {
                    id: "platformer".into(),
                    names: [("ru","Платформер"),("en","Platformer"),("uk","Платформер"),("be","Платформер"),("kk","Платформер"),("uz","Platformer")]
                        .map(|(k,v)| (k.to_string(),v.to_string())).into(),
                },
            ],
            assignments: std::collections::HashMap::new(),
        }
    }
}

pub struct TagsState(pub Mutex<TagsData>);

impl TagsState {
    fn path() -> PathBuf {
        data_dir().join("tags.json")
    }

    pub fn load() -> Self {
        let path = Self::path();
        let data = std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str::<TagsData>(&s).ok())
            .unwrap_or_default();
        TagsState(Mutex::new(data))
    }

    pub fn save(state: &TagsData) {
        if let Ok(data) = serde_json::to_string_pretty(state) {
            let _ = std::fs::write(Self::path(), data);
        }
    }
}
