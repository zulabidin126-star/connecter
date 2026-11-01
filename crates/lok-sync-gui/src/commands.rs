use crate::ipc_client::IpcClient;
use lok_proto::ipc::{IpcRequest, IpcResponse, StateSnapshot};
use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct GuiSettingsPayload {
    pub autostart: bool,
    pub plain_text_only: bool,
    pub hide_body_when_locked: bool,
    pub forward_laptop_to_phone: bool,
    pub device_name: String,
    pub port: u16,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MediaPlayerInfo {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub status: String,
    pub player_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemdServiceStatus {
    pub active: bool,
    pub enabled: bool,
    pub status_text: String,
}

pub fn read_host_battery_direct() -> Option<lok_proto::ipc::PeerBattery> {
    let power_supply = std::path::Path::new("/sys/class/power_supply");
    if !power_supply.is_dir() {
        return None;
    }

    let mut bat_dir = None;
    if let Ok(entries) = std::fs::read_dir(power_supply) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Ok(type_str) = std::fs::read_to_string(path.join("type")) {
                if type_str.trim().eq_ignore_ascii_case("Battery") {
                    bat_dir = Some(path);
                    break;
                }
            }
        }
    }

    let dir = bat_dir?;
    let capacity_str = std::fs::read_to_string(dir.join("capacity")).ok()?;
    let percent: u8 = capacity_str.trim().parse().ok()?;
    let status = std::fs::read_to_string(dir.join("status")).unwrap_or_default();
    let charging = status.trim().eq_ignore_ascii_case("Charging")
        || status.trim().eq_ignore_ascii_case("Full");

    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    Some(lok_proto::ipc::PeerBattery {
        percent: percent.min(100),
        charging,
        ts,
    })
}

#[tauri::command]
pub async fn get_host_battery() -> Result<Option<lok_proto::ipc::PeerBattery>, String> {
    Ok(read_host_battery_direct())
}

#[tauri::command]
pub async fn get_daemon_status() -> Result<StateSnapshot, String> {
    match IpcClient::connect().await {
        Ok(mut client) => match client.get_state().await {
            Ok(mut snap) => {
                if snap.local_battery.is_none() {
                    snap.local_battery = read_host_battery_direct();
                }
                Ok(snap)
            }
            Err(_) => {
                let hostname = std::env::var("HOSTNAME")
                    .or_else(|_| std::fs::read_to_string("/etc/hostname").map(|s| s.trim().to_string()))
                    .unwrap_or_else(|_| "Linux-Host".into());
                Ok(StateSnapshot {
                    daemon_version: "0.1.0".into(),
                    device_id: "local".into(),
                    device_name: hostname,
                    local_battery: read_host_battery_direct(),
                    peers: vec![],
                    pairing_active: false,
                })
            }
        },
        Err(_) => {
            let hostname = std::env::var("HOSTNAME")
                .or_else(|_| std::fs::read_to_string("/etc/hostname").map(|s| s.trim().to_string()))
                .unwrap_or_else(|_| "Linux-Host".into());
            Ok(StateSnapshot {
                daemon_version: "0.1.0".into(),
                device_id: "local".into(),
                device_name: hostname,
                local_battery: read_host_battery_direct(),
                peers: vec![],
                pairing_active: false,
            })
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PairingSessionInfo {
    pub pin: String,
    pub qr: String,
    pub expires_in_secs: u64,
}

#[tauri::command]
pub async fn start_pairing() -> Result<PairingSessionInfo, String> {
    let fallback_pin = format!(
        "{:06}",
        (std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos()
            % 900_000)
            + 100_000
    );

    match IpcClient::connect().await {
        Ok(mut client) => match client.request(&IpcRequest::PairStart).await {
            Ok(IpcResponse::PairPin { pin, qr, expires_in_secs, .. }) => {
                Ok(PairingSessionInfo { pin, qr, expires_in_secs })
            }
            Ok(IpcResponse::Error { message, .. }) => Err(message),
            Ok(_) => {
                Ok(PairingSessionInfo {
                    pin: fallback_pin,
                    qr: "".into(),
                    expires_in_secs: 120,
                })
            }
            Err(e) => Err(format!("Pairing command error: {e}")),
        },
        Err(_) => {
            Ok(PairingSessionInfo {
                pin: fallback_pin,
                qr: "".into(),
                expires_in_secs: 120,
            })
        }
    }
}

#[tauri::command]
pub async fn cancel_pairing() -> Result<(), String> {
    let mut client = IpcClient::connect()
        .await
        .map_err(|e| format!("Daemon socket connection failed: {e}"))?;

    let _ = client.request(&IpcRequest::PairCancel).await;
    Ok(())
}

#[tauri::command]
pub async fn unpair_peer(peer_id: String) -> Result<(), String> {
    let mut client = IpcClient::connect()
        .await
        .map_err(|e| format!("Daemon socket connection failed: {e}"))?;

    match client.request(&IpcRequest::Unpair { peer: peer_id }).await {
        Ok(IpcResponse::Ok { .. }) => Ok(()),
        Ok(IpcResponse::Error { message, .. }) => Err(message),
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Unpair command error: {e}")),
    }
}

#[tauri::command]
pub async fn update_settings(settings: GuiSettingsPayload) -> Result<(), String> {
    println!("Updated GUI settings: {:?}", settings);
    Ok(())
}

#[tauri::command]
pub async fn get_media_status() -> Result<MediaPlayerInfo, String> {
    let output = Command::new("playerctl")
        .args(["metadata", "--format", "{{title}}|||{{artist}}|||{{album}}|||{{status}}|||{{playerName}}"])
        .output();

    match output {
        Ok(out) if out.status.success() => {
            let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
            let parts: Vec<&str> = s.split("|||").collect();
            Ok(MediaPlayerInfo {
                title: parts.first().unwrap_or(&"Unknown Title").trim().to_string(),
                artist: parts.get(1).unwrap_or(&"Unknown Artist").trim().to_string(),
                album: parts.get(2).unwrap_or(&"").trim().to_string(),
                status: parts.get(3).unwrap_or(&"Stopped").trim().to_string(),
                player_name: parts.get(4).unwrap_or(&"Media Player").trim().to_string(),
            })
        }
        _ => Ok(MediaPlayerInfo {
            title: "No Media Playing".into(),
            artist: "None".into(),
            album: "".into(),
            status: "Stopped".into(),
            player_name: "MPRIS".into(),
        }),
    }
}

#[tauri::command]
pub async fn media_control(action: String) -> Result<String, String> {
    match action.as_str() {
        "play-pause" => {
            let _ = Command::new("playerctl").arg("play-pause").status();
            Ok("Toggled playback".into())
        }
        "next" => {
            let _ = Command::new("playerctl").arg("next").status();
            Ok("Next track".into())
        }
        "previous" => {
            let _ = Command::new("playerctl").arg("previous").status();
            Ok("Previous track".into())
        }
        "stop" => {
            let _ = Command::new("playerctl").arg("stop").status();
            Ok("Playback stopped".into())
        }
        "volume-up" => {
            let res = Command::new("wpctl")
                .args(["set-volume", "@DEFAULT_AUDIO_SINK@", "5%+"])
                .status();
            if res.is_err() {
                let _ = Command::new("pactl")
                    .args(["set-sink-volume", "@DEFAULT_SINK@", "+5%"])
                    .status();
            }
            Ok("Volume increased".into())
        }
        "volume-down" => {
            let res = Command::new("wpctl")
                .args(["set-volume", "@DEFAULT_AUDIO_SINK@", "5%-"])
                .status();
            if res.is_err() {
                let _ = Command::new("pactl")
                    .args(["set-sink-volume", "@DEFAULT_SINK@", "-5%"])
                    .status();
            }
            Ok("Volume decreased".into())
        }
        _ => Err("Unknown media action".into()),
    }
}

#[tauri::command]
pub async fn send_test_notification(title: String, body: String) -> Result<(), String> {
    let _ = Command::new("notify-send")
        .args(["-a", "LokSync", &title, &body])
        .status();
    Ok(())
}

#[tauri::command]
pub async fn get_systemd_status() -> Result<SystemdServiceStatus, String> {
    let active_out = Command::new("systemctl")
        .args(["--user", "is-active", "lok-sync.service"])
        .output();
    let enabled_out = Command::new("systemctl")
        .args(["--user", "is-enabled", "lok-sync.service"])
        .output();

    let is_active = active_out
        .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "active")
        .unwrap_or(false);

    let is_enabled = enabled_out
        .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "enabled")
        .unwrap_or(false);

    let status_text = if is_active {
        "Running (systemd user unit active)"
    } else {
        "Stopped (systemd user unit inactive)"
    };

    Ok(SystemdServiceStatus {
        active: is_active,
        enabled: is_enabled,
        status_text: status_text.into(),
    })
}

#[tauri::command]
pub async fn manage_systemd_service(action: String) -> Result<String, String> {
    match action.as_str() {
        "start" => {
            let res = Command::new("systemctl")
                .args(["--user", "start", "lok-sync.service"])
                .status();
            if res.is_ok() {
                Ok("Service started".into())
            } else {
                Err("Failed to start service".into())
            }
        }
        "stop" => {
            let _ = Command::new("systemctl")
                .args(["--user", "stop", "lok-sync.service"])
                .status();
            Ok("Service stopped".into())
        }
        "restart" => {
            let _ = Command::new("systemctl")
                .args(["--user", "restart", "lok-sync.service"])
                .status();
            Ok("Service restarted".into())
        }
        "enable" => {
            let _ = Command::new("systemctl")
                .args(["--user", "enable", "--now", "lok-sync.service"])
                .status();
            Ok("Autostart enabled".into())
        }
        "disable" => {
            let _ = Command::new("systemctl")
                .args(["--user", "disable", "--now", "lok-sync.service"])
                .status();
            Ok("Autostart disabled".into())
        }
        _ => Err("Invalid action".into()),
    }
}

#[tauri::command]
pub async fn get_clipboard_content() -> Result<String, String> {
    // 1. Explicitly request plain text to prevent dumping binary data (like PNG images)
    let text_output = Command::new("wl-paste")
        .args(["-n", "--type", "text/plain;charset=utf-8"])
        .output()
        .or_else(|_| {
            Command::new("wl-paste")
                .args(["-n", "--type", "text/plain"])
                .output()
        })
        .or_else(|_| {
            Command::new("xclip")
                .args(["-selection", "clipboard", "-t", "text/plain", "-o"])
                .output()
        })
        .or_else(|_| {
            Command::new("xclip")
                .args(["-selection", "clipboard", "-o"])
                .output()
        });

    if let Ok(out) = text_output {
        if out.status.success() {
            if let Ok(s) = String::from_utf8(out.stdout) {
                // Ensure text is clean printable UTF-8 with no null bytes
                if !s.contains('\0') {
                    return Ok(s);
                }
            }
        }
    }

    // 2. If plain text was not available, check if an image or file is in clipboard
    if let Ok(types) = Command::new("wl-paste").arg("--list-types").output() {
        if types.status.success() {
            let t = String::from_utf8_lossy(&types.stdout);
            if t.contains("image/png") || t.contains("image/jpeg") || t.contains("image/") {
                return Ok("[Image in Clipboard (Screenshot / Photo)]".into());
            }
            if t.contains("application/pdf") {
                return Ok("[PDF Document in Clipboard]".into());
            }
        }
    }

    Ok("".into())
}

#[tauri::command]
pub async fn set_clipboard_content(text: String) -> Result<(), String> {
    use std::io::Write;
    let child = Command::new("wl-copy")
        .stdin(std::process::Stdio::piped())
        .spawn()
        .or_else(|_| {
            Command::new("xclip")
                .args(["-selection", "clipboard"])
                .stdin(std::process::Stdio::piped())
                .spawn()
        });

    if let Ok(mut child) = child {
        if let Some(mut stdin) = child.stdin.take() {
            let _ = stdin.write_all(text.as_bytes());
        }
        let _ = child.wait();
    }
    Ok(())
}
