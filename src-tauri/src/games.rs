use base64::Engine as _;
use serde::Serialize;
use serde_json;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager;
use tauri::State;
use winreg::enums::*;
use winreg::RegKey;

#[derive(Debug, Serialize, Clone)]
pub struct GameEntry {
    pub name: String,
    pub path: String,
    pub cover: String,
    pub source: String,
}

pub fn scan_all_games() -> Vec<GameEntry> {
    let mut games: Vec<GameEntry> = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for game in scan_steam_games() {
        if seen.insert(game.path.to_lowercase()) {
            games.push(game);
        }
    }
    for game in scan_epic_games() {
        if seen.insert(game.path.to_lowercase()) {
            games.push(game);
        }
    }
    for game in scan_gog_games() {
        if seen.insert(game.path.to_lowercase()) {
            games.push(game);
        }
    }
    for game in scan_battlenet_games() {
        if seen.insert(game.path.to_lowercase()) {
            games.push(game);
        }
    }
    for game in scan_installed_programs() {
        if seen.insert(game.path.to_lowercase()) {
            games.push(game);
        }
    }

    games.sort_by_key(|a| a.name.to_lowercase());
    games
}

fn scan_gog_games() -> Vec<GameEntry> {
    let mut games = Vec::new();
    let progdata = std::env::var("PROGRAMDATA").unwrap_or_default();
    let galaxy_dir = PathBuf::from(&progdata).join("GOG.com").join("Galaxy").join("webcache");
    if !galaxy_dir.exists() {
        return games;
    }

    let Ok(entries) = std::fs::read_dir(&galaxy_dir) else { return games };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }
        if !path.file_name().map_or(false, |n| n.to_string_lossy().starts_with("game_")) {
            continue;
        }
        let Ok(content) = std::fs::read_to_string(&path) else { continue };
        let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) else { continue };
        let name = val.get("title").and_then(|v| v.as_str()).unwrap_or("");
        if name.is_empty() { continue; }
        let install_path = val
            .get("installation_path")
            .or_else(|| val.get("path"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if install_path.is_empty() { continue; }
        let dir = PathBuf::from(install_path);
        if let Some(exe) = find_executable(&dir) {
            games.push(GameEntry {
                name: name.to_string(),
                path: exe,
                cover: String::new(),
                source: "GOG".to_string(),
            });
        }
    }
    games
}

fn scan_battlenet_games() -> Vec<GameEntry> {
    let mut games = Vec::new();
    let program_data = std::env::var("PROGRAMDATA").unwrap_or_default();

    let config_dirs = [
        PathBuf::from(&program_data).join("Battle.net").join("Agent").join("data"),
        PathBuf::from(&std::env::var("PROGRAMFILES(X86)").unwrap_or_default()).join("Battle.net"),
    ];

    for cfg_dir in &config_dirs {
        if !cfg_dir.exists() { continue; }
        if let Ok(entries) = std::fs::read_dir(cfg_dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.extension().and_then(|s| s.to_str()) != Some("config") {
                    continue;
                }
                let Ok(content) = std::fs::read_to_string(&p) else { continue };
                let mut name = String::new();
                let mut path = String::new();
                for line in content.lines() {
                    if line.contains("product_name") {
                        if let Some(val) = line.split('=').nth(1) {
                            name = val.trim().trim_matches('"').to_string();
                        }
                    }
                    if line.contains("install_path") {
                        if let Some(val) = line.split('=').nth(1) {
                            path = val.trim().trim_matches('"').to_string();
                        }
                    }
                }
                if name.is_empty() || path.is_empty() { continue; }
                let dir = PathBuf::from(&path);
                if let Some(exe) = find_executable(&dir) {
                    games.push(GameEntry {
                        name,
                        path: exe,
                        cover: String::new(),
                        source: "Battle.net".to_string(),
                    });
                }
            }
        }
    }
    games
}

fn scan_steam_games() -> Vec<GameEntry> {
    let mut games = Vec::new();
    let Some(steam_path) = get_steam_path() else {
        return games;
    };

    let mut scanned = std::collections::HashSet::new();

    let library_file = steam_path.join("steamapps").join("libraryfolders.vdf");
    if let Ok(content) = std::fs::read_to_string(&library_file) {
        for line in content.lines() {
            if let Some(path_part) = line.split('"').nth(3) {
                let lib_path = PathBuf::from(path_part.replace("\\\\", "\\"));
                if scanned.insert(lib_path.clone()) {
                    scan_steam_library(&lib_path, &mut games);
                }
            }
        }
    }

    if scanned.insert(steam_path.clone()) {
        scan_steam_library(&steam_path, &mut games);
    }
    games
}

fn scan_steam_library(path: &Path, games: &mut Vec<GameEntry>) {
    let apps_dir = path.join("steamapps");
    let Ok(entries) = std::fs::read_dir(&apps_dir) else {
        return;
    };

    for entry in entries.flatten() {
        let fname = entry.file_name();
        let fname_str = fname.to_string_lossy();
        if !fname_str.starts_with("appmanifest_") || !fname_str.ends_with(".acf") {
            continue;
        }

        let Ok(acf) = std::fs::read_to_string(entry.path()) else {
            continue;
        };

        let appid = fname_str
            .trim_start_matches("appmanifest_")
            .trim_end_matches(".acf");

        let name = acf
            .lines()
            .find(|l| l.trim().starts_with("\"name\""))
            .and_then(|l| l.split('"').nth(3))
            .unwrap_or("Unknown")
            .to_string();

        if name == "Unknown" || name.contains("Proton") || name.contains("Steamworks") {
            continue;
        }

        let install_dir = acf
            .lines()
            .find(|l| l.trim().starts_with("\"installdir\""))
            .and_then(|l| l.split('"').nth(3))
            .unwrap_or("");

        let game_path = path.join("steamapps").join("common").join(install_dir);
        if let Some(exe) = find_executable(&game_path) {
            games.push(GameEntry {
                name,
                path: exe,
                cover: format!(
                    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{}/library_600x900.jpg",
                    appid
                ),
                source: "Steam".to_string(),
            });
        }
    }
}

fn scan_epic_games() -> Vec<GameEntry> {
    let mut games = Vec::new();
    let localappdata = std::env::var("LOCALAPPDATA").unwrap_or_default();
    let manifests_dir = PathBuf::from(&localappdata)
        .join("EpicGamesLauncher")
        .join("Saved")
        .join("Data")
        .join("Manifests");

    let Ok(entries) = std::fs::read_dir(&manifests_dir) else {
        return games;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("item") {
            continue;
        }
        let Ok(content) = std::fs::read_to_string(&path) else {
            continue;
        };
        if let Some(name) = content
            .lines()
            .find(|l| l.trim().starts_with("DisplayName"))
            .and_then(|l| l.split('=').nth(1))
        {
            if let Some(launch_path) = content
                .lines()
                .find(|l| l.trim().starts_with("LaunchExecutable"))
                .and_then(|l| l.split('=').nth(1))
            {
                let exe_path = PathBuf::from(launch_path.trim().trim_matches('"'));
                if exe_path.exists() {
                    games.push(GameEntry {
                        name: name.trim().trim_matches('"').to_string(),
                        path: exe_path.to_string_lossy().to_string(),
                        cover: String::new(),
                        source: "Epic Games".to_string(),
                    });
                }
            }
        }
    }
    games
}

fn scan_installed_programs() -> Vec<GameEntry> {
    let mut games = Vec::new();
    let reg_paths = [
        r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
        r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
    ];

    let launcher_markers = [
        "steamapps", "\\epic games\\", "gog galaxy", "battle.net",
    ];

    for path in &reg_paths {
        let Ok(hklm) = RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey_with_flags(path, KEY_READ)
        else {
            continue;
        };
        for key_name in hklm.enum_keys().flatten() {
            let Ok(entry) = hklm.open_subkey_with_flags(&key_name, KEY_READ) else {
                continue;
            };
            let name: String = entry.get_value("DisplayName").unwrap_or_default();
            if name.is_empty() {
                continue;
            }

            let install: String = entry.get_value("InstallLocation").unwrap_or_default();
            if install.is_empty() {
                continue;
            }

            let install_path = PathBuf::from(&install);
            if let Some(exe) = find_executable(&install_path) {
                let exe_stem = std::path::Path::new(&exe)
                    .file_stem()
                    .map(|s| s.to_string_lossy().to_lowercase())
                    .unwrap_or_default();
                if exe_stem.contains("steam") || exe_stem.contains("epicgames") || exe_stem.contains("battle") {
                    continue;
                }
                let exe_lower = exe.to_lowercase();
                if launcher_markers.iter().any(|m| exe_lower.contains(m)) {
                    continue;
                }
                games.push(GameEntry {
                    name,
                    path: exe,
                    cover: String::new(),
                    source: "Windows".to_string(),
                });
            }
        }
    }
    games
}

fn find_executable(dir: &std::path::Path) -> Option<String> {
    fn scan_dir(dir: &std::path::Path, depth: usize, candidates: &mut Vec<PathBuf>) {
        if !dir.is_dir() || depth > 4 {
            return;
        }
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    scan_dir(&path, depth + 1, candidates);
                } else if path.extension().map(|e| e.to_string_lossy().to_lowercase()) == Some("exe".into()) {
                    let stem = match path.file_stem() {
                        Some(s) => s.to_string_lossy().to_lowercase(),
                        None => continue,
                    };
                    if stem.contains("launcher") || stem.contains("unins") || stem == "steam" {
                        continue;
                    }
                    candidates.push(path);
                }
            }
        }
    }

    if !dir.exists() || !dir.is_dir() {
        return None;
    }

    let mut candidates: Vec<PathBuf> = Vec::new();
    scan_dir(dir, 1, &mut candidates);

    if candidates.is_empty() {
        return None;
    }

    let dir_stem = dir
        .file_stem()
        .map(|s| s.to_string_lossy().to_lowercase());

    candidates.sort_by(|a, b| {
        let a_stem = a.file_stem().map(|s| s.to_string_lossy().to_lowercase());
        let b_stem = b.file_stem().map(|s| s.to_string_lossy().to_lowercase());
        let a_score = if a_stem == dir_stem { 0 } else { 1 };
        let b_score = if b_stem == dir_stem { 0 } else { 1 };
        a_score.cmp(&b_score)
    });

    Some(candidates[0].to_string_lossy().to_string())
}

fn get_steam_path() -> Option<PathBuf> {
    for (root, subkey) in &[
        (HKEY_CURRENT_USER, r"Software\Valve\Steam"),
        (HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Valve\Steam"),
    ] {
        if let Ok(key) = RegKey::predef(*root).open_subkey_with_flags(subkey, KEY_READ) {
            if let Ok(path) = key.get_value::<String, _>("SteamPath") {
                let p = PathBuf::from(&path);
                if p.exists() {
                    return Some(p);
                }
            }
        }
    }
    None
}

fn scan_user_path(paths: &[String]) -> Vec<GameEntry> {
    let mut games = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for p in paths {
        let dir = std::path::Path::new(p);
        if !dir.exists() {
            continue;
        }
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    if let Some(exe) = find_executable(&path) {
                        let name = path
                            .file_stem()
                            .map(|s| s.to_string_lossy().to_string())
                            .unwrap_or_default();
                        if seen.insert(exe.clone()) {
                            games.push(GameEntry {
                                name,
                                path: exe,
                                cover: String::new(),
                                source: "Пользовательская".to_string(),
                            });
                        }
                    }
                }
            }
        }
    }
    games
}

#[tauri::command]
pub fn scan_games(state: tauri::State<crate::config::ConfigState>) -> Vec<GameEntry> {
    let mut games = scan_all_games();
    let cfg = state.0.lock().unwrap();
    let user = scan_user_path(&cfg.game_paths);
    let mut seen: std::collections::HashSet<String> =
        games.iter().map(|g| g.path.to_lowercase()).collect();
    for game in user {
        if seen.insert(game.path.to_lowercase()) {
            games.push(game);
        }
    }
    games
}

#[tauri::command]
pub fn launch_game(
    path: String,
    game_name: Option<String>,
    state: State<crate::config::ConfigState>,
    app_handle: tauri::AppHandle,
    discord: tauri::State<crate::discord::DiscordState>,
) -> Result<(), String> {
    if path.is_empty() {
        return Err("Empty path".into());
    }
    Command::new(&path)
        .spawn()
        .map_err(|e| format!("Failed to launch: {}", e))?;

    {
        let cfg = state.0.lock().unwrap();
        if cfg.discord_enabled {
            if let Some(name) = &game_name {
                crate::discord::DiscordState::set_playing(&discord, name);
            }
        }
    }

    let mut cfg = state.0.lock().unwrap();
    cfg.recent_games.retain(|p| p != &path);
    cfg.recent_games.insert(0, path.clone());
    cfg.recent_games.truncate(10);
    cfg.save();

    if let Some(win) = app_handle.get_webview_window("main") {
        let _ = win.hide();
    }
    Ok(())
}

#[tauri::command]
pub fn show_window(app_handle: tauri::AppHandle) {
    if let Some(win) = app_handle.get_webview_window("main") {
        let _ = win.show();
        let _ = win.set_focus();
    }
}

#[tauri::command]
pub fn toggle_favorite(path: String, state: tauri::State<crate::config::FavoritesState>) -> bool {
    let mut favs = state.0.lock().unwrap();
    if let Some(pos) = favs.iter().position(|p| p == &path) {
        favs.remove(pos);
        crate::config::FavoritesState::save(&favs);
        false
    } else {
        favs.push(path);
        crate::config::FavoritesState::save(&favs);
        true
    }
}

#[tauri::command]
pub fn get_favorites(state: tauri::State<crate::config::FavoritesState>) -> Vec<String> {
    state.0.lock().unwrap().clone()
}

#[tauri::command]
pub fn open_folder(path: String) -> Result<(), String> {
    std::process::Command::new("explorer")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open folder: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn set_game_cover(
    game_path: String,
    cover_path: Option<String>,
    state: tauri::State<crate::config::CoversState>,
) {
    let mut covers = state.0.lock().unwrap();
    if let Some(p) = cover_path {
        covers.insert(game_path, p);
    } else {
        covers.remove(&game_path);
    }
    crate::config::CoversState::save(&covers);
}

#[tauri::command]
pub fn get_game_cover(
    game_path: String,
    state: tauri::State<crate::config::CoversState>,
) -> Option<String> {
    state.0.lock().unwrap().get(&game_path).cloned()
}

#[tauri::command]
pub fn get_cover_image(
    game_path: String,
    state: tauri::State<crate::config::CoversState>,
) -> Option<String> {
    let path = state.0.lock().unwrap().get(&game_path)?.clone();
    let data = std::fs::read(&path).ok()?;
    let ext = std::path::Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");
    let mime = match ext.to_lowercase().as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        _ => "image/png",
    };
    let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
    Some(format!("data:{mime};base64,{b64}"))
}

