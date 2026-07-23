use serde_json::json;
use std::io::{Read, Write};
use std::sync::Mutex;
use std::fs::OpenOptions;
use std::os::windows::fs::OpenOptionsExt;
use crate::config::AppConfig;
use tauri::State;

const CLIENT_ID: &str = "1529438788814766190";

pub(crate) enum DiscordPipe {
    NamedPipe(std::fs::File),
    UnixSocket(uds_windows::UnixStream),
}

impl DiscordPipe {
    fn write_all(&mut self, data: &[u8]) -> std::io::Result<()> {
        match self {
            Self::NamedPipe(f) => f.write_all(data),
            Self::UnixSocket(s) => s.write_all(data),
        }
    }

    fn read_exact(&mut self, buf: &mut [u8]) -> std::io::Result<()> {
        match self {
            Self::NamedPipe(f) => f.read_exact(buf),
            Self::UnixSocket(s) => s.read_exact(buf),
        }
    }
}

pub struct DiscordState(pub Mutex<(Option<DiscordPipe>, bool)>);

fn try_connect_named_pipe() -> Option<DiscordPipe> {
    for i in 0..10 {
        let path = format!(r"\\.\pipe\discord-ipc-{}", i);
        match OpenOptions::new().access_mode(0x3).open(&path) {
            Ok(f) => {
                log::info!("Discord: connected via named pipe {}", i);
                return Some(DiscordPipe::NamedPipe(f));
            }
            Err(e) => {
                log::debug!("Discord: pipe {} failed: {}", i, e);
                continue;
            }
        }
    }
    None
}

fn try_connect_unix_socket() -> Option<DiscordPipe> {
    let appdata = std::env::var("APPDATA").ok()?;
    for i in 0..10 {
        let path = format!(r"{}\discord\ipc-{}", appdata, i);
        match uds_windows::UnixStream::connect(&path) {
            Ok(s) => {
                log::info!("Discord: connected via unix socket {}", i);
                return Some(DiscordPipe::UnixSocket(s));
            }
            Err(e) => {
                log::debug!("Discord: unix socket {} failed: {}", i, e);
                continue;
            }
        }
    }
    None
}

fn try_connect() -> Option<DiscordPipe> {
    try_connect_named_pipe()
        .or_else(try_connect_unix_socket)
}

fn send_handshake(pipe: &mut DiscordPipe) -> bool {
    let data = json!({ "v": 1, "client_id": CLIENT_ID });
    send_frame(pipe, 0, &data.to_string()).is_ok()
        && recv_frame(pipe).is_ok()
}

fn send_frame(pipe: &mut DiscordPipe, opcode: u32, data: &str) -> std::io::Result<()> {
    let mut header = [0u8; 8];
    header[..4].copy_from_slice(&opcode.to_le_bytes());
    header[4..8].copy_from_slice(&(data.len() as u32).to_le_bytes());
    pipe.write_all(&header)?;
    pipe.write_all(data.as_bytes())?;
    Ok(())
}

fn recv_frame(pipe: &mut DiscordPipe) -> std::io::Result<(u32, String)> {
    let mut header = [0u8; 8];
    pipe.read_exact(&mut header)?;
    let opcode = u32::from_le_bytes(header[..4].try_into().unwrap());
    let len = u32::from_le_bytes(header[4..8].try_into().unwrap()) as usize;
    let mut buf = vec![0u8; len];
    pipe.read_exact(&mut buf)?;
    let data = String::from_utf8_lossy(&buf).to_string();
    Ok((opcode, data))
}

fn set_activity(pipe: &mut DiscordPipe, details: &str) {
    let data = json!({
        "cmd": "SET_ACTIVITY",
        "args": {
            "pid": std::process::id(),
            "activity": {
                "state": "SLauncher",
                "details": details
            }
        },
        "nonce": format!("{:x}", rand_u64())
    });
    let _ = send_frame(pipe, 1, &data.to_string());
}

fn rand_u64() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let t = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    (t.as_nanos() as u64) ^ (std::process::id() as u64).wrapping_mul(0x9E3779B97F4A7C15)
}

impl DiscordState {
    pub fn new() -> Self {
        let mut pipe = try_connect();
        let connected = if let Some(ref mut p) = pipe {
            if send_handshake(p) {
                log::info!("Discord: handshake successful, setting idle");
                set_activity(p, "В лаунчере");
                true
            } else {
                log::warn!("Discord: handshake failed");
                false
            }
        } else {
            log::warn!("Discord: no pipe found");
            false
        };
        DiscordState(Mutex::new((pipe, connected)))
    }

    fn ensure_connected(guard: &mut (Option<DiscordPipe>, bool)) -> bool {
        if guard.1 {
            return true;
        }
        log::info!("Discord: reconnecting...");
        let mut pipe = try_connect();
        let ok = if let Some(ref mut p) = pipe {
            if send_handshake(p) {
                set_activity(p, "В лаунчере");
                true
            } else {
                false
            }
        } else {
            false
        };
        guard.0 = pipe;
        guard.1 = ok;
        ok
    }

    pub fn set_playing(state: &Self, game_name: &str) {
        let mut guard = state.0.lock().unwrap();
        if !Self::ensure_connected(&mut guard) {
            log::warn!("Discord: not connected, can't set playing");
            return;
        }
        if let Some(ref mut pipe) = guard.0 {
            log::info!("Discord: setting playing: {}", game_name);
            set_activity(pipe, &format!("Играет в {}", game_name));
        }
    }
}

fn clear_activity(pipe: &mut DiscordPipe) {
    let data = json!({
        "cmd": "SET_ACTIVITY",
        "args": {
            "pid": std::process::id(),
            "activity": null
        },
        "nonce": format!("{:x}", rand_u64())
    });
    let _ = send_frame(pipe, 1, &data.to_string());
}

#[tauri::command]
pub fn set_discord_presence(state: State<DiscordState>, cfgstate: State<crate::config::ConfigState>, details: String) {
    {
        let cfg = cfgstate.0.lock().unwrap();
        if !cfg.discord_enabled {
            log::info!("Discord: presence disabled in config");
            return;
        }
    }
    log::info!("Discord: set_presence called: {}", details);
    let mut guard = state.0.lock().unwrap();
    if !DiscordState::ensure_connected(&mut guard) {
        log::warn!("Discord: can't connect for set_presence");
        return;
    }
    if let Some(ref mut pipe) = guard.0 {
        set_activity(pipe, &details);
    }
}

#[tauri::command]
pub fn clear_discord_presence(state: State<DiscordState>) {
    log::info!("Discord: clearing presence");
    let mut guard = state.0.lock().unwrap();
    if !DiscordState::ensure_connected(&mut guard) {
        log::warn!("Discord: can't connect for clear_presence");
        return;
    }
    if let Some(ref mut pipe) = guard.0 {
        clear_activity(pipe);
    }
}
