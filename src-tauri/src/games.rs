use serde::Serialize;
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
        if seen.insert(game.path.clone()) {
            games.push(game);
        }
    }
    for game in scan_epic_games() {
        if seen.insert(game.path.clone()) {
            games.push(game);
        }
    }
    for game in scan_installed_programs() {
        if seen.insert(game.path.clone()) {
            games.push(game);
        }
    }

    games.sort_by_key(|a| a.name.to_lowercase());
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
                    "https://steamcdn-a.akamaihd.net/steam/apps/{}/library_600x900.jpg",
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
    if !dir.exists() || !dir.is_dir() {
        return None;
    }

    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map(|e| e.to_string_lossy().to_lowercase()) == Some("exe".into()) {
                let stem = path.file_stem()?.to_string_lossy().to_lowercase();
                if stem.contains("launcher") || stem.contains("unins") {
                    continue;
                }
                candidates.push(path);
            }
        }
    }

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
        games.iter().map(|g| g.path.clone()).collect();
    for game in user {
        if seen.insert(game.path.clone()) {
            games.push(game);
        }
    }
    games
}

#[tauri::command]
pub fn launch_game(
    path: String,
    state: State<crate::config::ConfigState>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    if path.is_empty() {
        return Err("Empty path".into());
    }
    Command::new(&path)
        .spawn()
        .map_err(|e| format!("Failed to launch: {}", e))?;

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
pub fn open_folder(path: String) -> Result<(), String> {
    std::process::Command::new("explorer")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open folder: {}", e))?;
    Ok(())
}

