<p align="center">
  <img src="screenshots/Screen1.png" alt="SLauncher" width="800">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white" alt="Rust">
  <img src="https://img.shields.io/badge/Tauri-FFC131?style=for-the-badge&logo=tauri&logoColor=black" alt="Tauri">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
</p>

<p align="center">
  <a href="https://github.com/Soryyz-Project/Game-Launcher-by-Soryyz/releases/latest"><img src="https://img.shields.io/github/v/release/Soryyz-Project/Game-Launcher-by-Soryyz?style=flat-square&label=%D0%92%D0%B5%D1%80%D1%81%D0%B8%D1%8F&color=%232d7aff" alt="Release"></a>
  <img src="https://img.shields.io/github/repo-size/Soryyz-Project/Game-Launcher-by-Soryyz?style=flat-square&label=%D0%A0%D0%B0%D0%B7%D0%BC%D0%B5%D1%80&color=%232d7aff" alt="Size">
  <img src="https://img.shields.io/github/license/Soryyz-Project/Game-Launcher-by-Soryyz?style=flat-square&label=%D0%9B%D0%B8%D1%86%D0%B5%D0%BD%D0%B7%D0%B8%D1%8F&color=%232d7aff" alt="License">
  <img src="https://img.shields.io/github/stars/Soryyz-Project/Game-Launcher-by-Soryyz?style=flat-square&label=%D0%97%D0%B2%D1%91%D0%B7%D0%B4%D1%8B&color=%232d7aff" alt="Stars">
</p>

<p align="center">
  <b>SLauncher</b> — современный лаунчер для ПК-игр с продуманным интерфейсом, полной поддержкой геймпадов и автоматическим поиском установленных игр.
</p>

---

## Возможности

| | |
|---|---|
| 🎮 **Геймпад** | DualSense, DualShock, Xbox и generic — A/B/X/Y, крестовина, стики, LB/RB, Select/Start + тактильная отдача (вибрация) |
| 🖥️ **Интерфейс** | Полноэкранный borderless, тёмная тема, плавные анимации, blur-панели, нижняя панель подсказок |
| 🔍 **Автоопределение игр** | Сканирует Steam, Epic Games, реестр Windows и пользовательские папки |
| 🎬 **Медиа-просмотрщик** | Скриншоты и видео в сетке, превью, полноэкранный плеер, удаление, навигация с геймпада |
| 🌍 **Мультиязычность** | Русский, English, українська, беларуская, қазақша, oʻzbekcha |
| 🎨 **Кастомизация** | Цвет акцента, прозрачность панелей и карточек, фоновое видео, затемнение |
| 📺 **Интро** | Видео при запуске со случайными советами внизу экрана |
| 🗂️ **Трей** | Сворачивание в трей при запуске игры, контекстное меню |

## Скриншоты

<p align="center">
  <img src="screenshots/Screen1.png" alt="Загрузка" width="45%">
  <img src="screenshots/Screen2.png" alt="Главный экран" width="45%">
</p>
<p align="center">
  <img src="screenshots/Screen3.png" alt="Библиотека" width="45%">
  <img src="screenshots/Screen4.png" alt="Настройки" width="45%">
</p>

## Технологии

<p align="center">
  <img src="https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Tauri_v2-FFC131?style=flat-square&logo=tauri&logoColor=black" alt="Tauri">
  <img src="https://img.shields.io/badge/Rust-000000?style=flat-square&logo=rust&logoColor=white" alt="Rust">
  <img src="https://img.shields.io/badge/Web_Gamepad_API-2d7aff?style=flat-square" alt="Web Gamepad API">
  <img src="https://img.shields.io/badge/Google_Fonts_Inter-4285F4?style=flat-square&logo=googlefonts&logoColor=white" alt="Inter">
</p>

## Управление с геймпада

| Кнопка | Действие |
|--------|----------|
| **Cross / A** | Подтвердить |
| **Circle / B** | Назад |
| **Square / X** | Поиск (библиотека) |
| **Triangle / Y** | Скрыть/показать подсказки |
| **LB / RB** | Переключение вкладок |
| **Крестовина / Стики** | Навигация |

### Вибрация

| Действие | Импульс |
|----------|---------|
| Навигация | 50 мс, сила 1.0 / 0.8 |
| Подтверждение / Назад | 100 мс |
| Удаление медиа | Двойной импульс |
| Открытие / закрытие плеера | 150 мс |

## Быстрый старт

### Требования

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/)
- [Tauri CLI](https://v2.tauri.app/start/cli/): `cargo install tauri-cli --version "^2"`

### Запуск в разработке

```bash
npm install
npm run tauri dev
```

Или просто запустите `run.bat` (без консольного окна).

### Сборка

```bash
npm run tauri build
```

Готовый установщик появится в `src-tauri/target/release/bundle/`.

## Структура проекта

```
src/
├── App.tsx                     # Корневой компонент, роутинг, геймпад
├── App.css                     # Все стили (тёмная тема)
├── locales.ts                  # Переводы (ru, en, uk, be, kk, uz)
├── hooks/
│   ├── useGamepad.ts           # Опрос геймпада, маппинг кнопок
│   ├── useGames.ts             # Сканирование и запуск игр
│   └── useLocale.ts            # Контекст локализации
├── components/
│   ├── VideoIntro.tsx          # Интро-видео со случайными фразами
│   ├── GamesLibrary.tsx        # Библиотека игр с поиском и сеткой
│   ├── MediaScreen.tsx         # Экран медиа с последними играми
│   ├── MediaViewer.tsx         # Сетка скриншотов/видео и плеер
│   ├── SettingsScreen.tsx      # Все настройки (config.json)
│   └── ControllerIcons.tsx     # SVG-иконки PS/Xbox
├── types.ts                    # Типы
└── main.tsx                    # Точка входа

src-tauri/
├── src/
│   ├── lib.rs                  # Точка входа, трей, команды
│   ├── config.rs               # AppConfig, загрузка/сохранение
│   ├── games.rs                # Сканирование Steam/Epic/реестр
│   └── media.rs                # Сканирование медиа, превью, удаление
├── Cargo.toml
├── tauri.conf.json
└── capabilities/default.json
```

## Настройки

Файл `config.json` сохраняется рядом с исполняемым файлом.

| Поле | По умолчанию | Описание |
|------|-------------|----------|
| `bg_video` | `S1.mp4` | Фоновое видео |
| `bg_video_enabled` | `true` | Включить фоновое видео |
| `bg_dimmed` | `0.8` | Затемнение фона (0–1) |
| `ui_opacity` | `0.85` | Прозрачность панелей |
| `game_card_opacity` | `0.8` | Прозрачность карточек игр |
| `accent_color` | `#2d7aff` | Цвет акцента |
| `start_screen` | `home` | Стартовый экран |
| `show_game_covers` | `true` | Показывать обложки Steam |
| `hints_visible` | `true` | Подсказки геймпада |
| `language` | `ru` | Язык интерфейса |
| `auto_launch` | `false` | Автозапуск |
| `minimize_to_tray` | `true` | Сворачивать в трей при запуске игры |
| `game_paths` | `[]` | Дополнительные папки с играми |
| `recent_games` | `[]` | Недавно запущенные игры (авто) |

## Лицензия

[MIT](LICENSE)

---

<p align="center">
  <a href="https://github.com/Soryyz-Project/Game-Launcher-by-Soryyz/releases">Скачать последнюю версию</a>
</p>
