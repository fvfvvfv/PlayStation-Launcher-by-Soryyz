mod config;
mod discord;
mod games;
mod media;
mod tags;

use config::{ConfigState, CoversState, FavoritesState, TagsState};
use discord::DiscordState;
use tauri::Manager;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::TrayIconBuilder;

fn create_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItemBuilder::with_id("show", "Показать").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Выйти").build(app)?;
    let menu = MenuBuilder::new(app).item(&show).item(&quit).build()?;

    let icon = app.default_window_icon().cloned().unwrap_or_else(|| {
        tauri::image::Image::new(&[], 0, 0)
    });

    TrayIconBuilder::new()
        .icon(icon)
        .tooltip("SLauncher")
        .menu(&menu)
        .on_menu_event(|app, event| {
            match event.id().as_ref() {
                "show" => {
                    if let Some(win) = app.get_webview_window("main") {
                        let _ = win.show();
                        let _ = win.set_focus();
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let cfg = config::AppConfig::load();
    let favs = FavoritesState::load();
    let covers = CoversState::load();
    let tags = TagsState::load();
    let discord = DiscordState::new();

    tauri::Builder::default()
        .manage(ConfigState(std::sync::Mutex::new(cfg)))
        .manage(favs)
        .manage(covers)
        .manage(tags)
        .manage(discord)
        .setup(|app| {
            app.handle().plugin(tauri_plugin_dialog::init())?;
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            // Create media folders on startup
            let pics = std::env::var("USERPROFILE")
                .map(|p| format!("{}\\Pictures\\LaunchScreen", p));
            let vids = std::env::var("USERPROFILE")
                .map(|p| format!("{}\\Videos\\LaunchVideo", p));
            if let Ok(dir) = pics {
                let _ = std::fs::create_dir_all(&dir);
            }
            if let Ok(dir) = vids {
                let _ = std::fs::create_dir_all(&dir);
            }
            create_tray(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            games::scan_games,
            games::launch_game,
            games::show_window,
            config::get_config,
            config::set_config,
            games::open_folder,
            games::toggle_favorite,
            games::get_favorites,
            games::set_game_cover,
            games::get_game_cover,
            games::get_cover_image,
            media::get_media_counts,
            media::get_media_files,
            media::delete_media_file,
            tags::get_tags_data,
            tags::set_tags_data,
            discord::set_discord_presence,
            discord::clear_discord_presence,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
