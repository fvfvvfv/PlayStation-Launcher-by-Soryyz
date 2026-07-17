use base64::Engine;
use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Serialize)]
pub struct MediaCount {
    pub screenshots: usize,
    pub videos: usize,
}

#[derive(Serialize)]
pub struct MediaFileEntry {
    pub name: String,
    pub path: String,
    pub is_image: bool,
    pub thumbnail: Option<String>,
}

const IMG_EXTS: &[&str] = &["png", "jpg", "jpeg", "bmp", "gif", "webp", "tiff", "ico"];
const VID_EXTS: &[&str] = &["mp4", "avi", "mkv", "mov", "webm", "wmv", "flv", "m4v"];

fn userprofile() -> String {
    std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\Users\\Default".to_string())
}

fn count_files(dir: &str, exts: &[&str]) -> usize {
    let path = Path::new(dir);
    if !path.exists() {
        return 0;
    }
    fs::read_dir(path).map_or(0, |entries| {
        entries
            .filter_map(Result::ok)
            .filter(|e| e.path().is_file())
            .filter(|e| {
                e.path()
                    .extension()
                    .and_then(std::ffi::OsStr::to_str)
                    .is_some_and(|ext| exts.iter().any(|valid| ext.eq_ignore_ascii_case(valid)))
            })
            .count()
    })
}

#[tauri::command]
pub fn get_media_counts() -> MediaCount {
    let base = userprofile();
    let screenshots = count_files(&format!("{base}\\Pictures\\LaunchScreen"), IMG_EXTS);
    let videos = count_files(&format!("{base}\\Videos\\LaunchVideo"), VID_EXTS);
    MediaCount {
        screenshots,
        videos,
    }
}

#[tauri::command]
pub fn get_media_files(dir_type: &str) -> Result<Vec<MediaFileEntry>, String> {
    let (dir, exts, is_image) = match dir_type {
        "screenshots" => (
            format!("{}\\Pictures\\LaunchScreen", userprofile()),
            IMG_EXTS,
            true,
        ),
        "videos" => (
            format!("{}\\Videos\\LaunchVideo", userprofile()),
            VID_EXTS,
            false,
        ),
        _ => return Err("Invalid directory type".to_string()),
    };

    let path = Path::new(&dir);
    if !path.exists() {
        return Ok(Vec::new());
    }

    let mut files: Vec<MediaFileEntry> = fs::read_dir(path)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let fpath = entry.path();
            if !fpath.is_file() {
                return None;
            }
            let ext = fpath
                .extension()
                .and_then(std::ffi::OsStr::to_str)
                .map(str::to_lowercase)
                .unwrap_or_default();
            if !exts.contains(&ext.as_str()) {
                return None;
            }
            let name = entry.file_name().to_string_lossy().to_string();
            let path_str = fpath.to_string_lossy().to_string();
            let thumbnail = if is_image {
                fs::read(&fpath).ok().map(|data| {
                    let mime = match ext.as_str() {
                        "jpg" | "jpeg" => "image/jpeg",
                        "gif" => "image/gif",
                        "webp" => "image/webp",
                        "bmp" => "image/bmp",
                        _ => "image/png",
                    };
                    format!(
                        "data:{mime};base64,{}",
                        base64::engine::general_purpose::STANDARD.encode(&data)
                    )
                })
            } else {
                None
            };
            Some(MediaFileEntry {
                name,
                path: path_str,
                is_image,
                thumbnail,
            })
        })
        .collect();

    files.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(files)
}

#[tauri::command]
pub fn delete_media_file(path: &str) -> Result<(), String> {
    fs::remove_file(path).map_err(|e| format!("Failed to delete file: {e}"))
}
