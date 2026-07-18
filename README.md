# SLauncher

A PlayStation 5-style PC game launcher built with Rust + Tauri v2 + React + TypeScript + Vite.

## Features

- **PS5-like UI** — fullscreen, dark theme, rounded panels, backdrop blur, bottom hints bar
- **Auto game detection** — scans Steam, Epic Games, Windows Registry, and user-defined folders
- **Gamepad support** — PS DualSense/DualShock, Xbox, and generic controllers via Web Gamepad API
- **Media viewer** — screenshots & videos viewer with thumbnails, preview, delete
- **Multi-language** — Russian, English, Ukrainian, Belarusian, Kazakh, Uzbek
- **Customizable** — accent color, panel/card transparency, background video, dimming
- **System tray** — minimize to tray on game launch, tray menu
- **Intro video** — plays on startup with random tip text

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Desktop | Tauri v2 (Rust) |
| Styling | CSS (PS5-inspired dark theme) |
| Font | Inter (Google Fonts) |
| Gamepad | Web Gamepad API |
| State | React hooks + Tauri invoke |

## Project Structure

```
src/
├── App.tsx              # Root component, screen routing, gamepad handling
├── App.css              # All styles (PS5 theme)
├── locales.ts           # i18n translations (ru, en, uk, be, kk, uz)
├── hooks/
│   ├── useGamepad.ts    # Gamepad polling, button mapping, keyboard fallback
│   ├── useGames.ts      # Game scanning & launching
│   └── useLocale.ts     # Locale context provider
├── components/
│   ├── VideoIntro.tsx   # Startup intro video with random tips
│   ├── GamesLibrary.tsx # Full library with search & grid
│   ├── MediaScreen.tsx  # Media overview with recent games
│   ├── MediaViewer.tsx  # Screenshots/videos grid & player
│   ├── SettingsScreen.tsx # All settings (save to config.json)
│   └── ControllerIcons.tsx # SVG icon loader (PS/Xbox)
├── types.ts             # Shared TypeScript types
└── main.tsx             # Entry point

src-tauri/
├── src/
│   ├── lib.rs           # Entry point, tray, command registration
│   ├── config.rs        # AppConfig (13 fields), load/save
│   ├── games.rs         # Game scanning (Steam/Epic/Registry/user paths), launch
│   └── media.rs         # Media file scanning, thumbnails, delete
├── Cargo.toml
├── tauri.conf.json
└── capabilities/default.json
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (latest stable)
- [Tauri CLI](https://v2.tauri.app/start/cli/): `cargo install tauri-cli --version "^2"`

### Run in development

```bash
npm install
npm run tauri dev
```

Or double-click `run.bat` (launches without console window).

### Build for production

```bash
npm run tauri build
```

The installer will be in `src-tauri/target/release/bundle/`.

## Configuration

Settings are stored as `config.json` next to the executable.

| Key | Default | Description |
|-----|---------|-------------|
| `bg_video` | `S1.mp4` | Background video filename |
| `bg_video_enabled` | `true` | Toggle background video |
| `bg_dimmed` | `0.8` | Background dimming (0–1) |
| `ui_opacity` | `0.85` | Panel transparency (0.3–1) |
| `game_card_opacity` | `0.8` | Game card transparency (0.3–1) |
| `accent_color` | `#2d7aff` | Accent color hex |
| `start_screen` | `home` | Default screen on launch |
| `show_game_covers` | `true` | Show remote Steam covers |
| `hints_visible` | `true` | Show gamepad hints |
| `language` | `ru` | UI language |
| `auto_launch` | `false` | Auto-start launcher |
| `minimize_to_tray` | `true` | Minimize to tray on game launch |
| `game_paths` | `[]` | Additional game folders |
| `recent_games` | `[]` | Recently launched games (auto) |

## Gamepad Controls

| Button | Action |
|--------|--------|
| Cross / A | Confirm |
| Circle / B | Back |
| Square / X | Search (library) |
| Triangle / Y | Toggle hints |
| LB / RB | Switch tabs |
| D-Pad / Sticks | Navigate |
| Options / Start | — |

Background videos (`public/bg/S1.mp4`–`S8.mp4`) are not included — place your own `.mp4` files there.

## License

MIT
