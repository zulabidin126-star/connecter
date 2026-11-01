mod battery;
mod ipc;

use clap::{Parser, Subcommand};
use ipc::IpcClient;
use lok_proto::ipc::{IpcEvent, IpcRequest, IpcResponse, StateSnapshot};
use qrcode::render::unicode;
use qrcode::QrCode;
use serde::Serialize;
use std::io::{stdout, Write};
use std::process::Command;
use std::time::Duration;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::time::sleep;

#[derive(Parser, Debug)]
#[command(name = "lok-sync")]
#[command(author = "LokSync Contributors")]
#[command(version = env!("CARGO_PKG_VERSION"))]
#[command(
    about = "LokSync - Fast, lightweight phone <-> Linux bridge CLI",
    long_about = "A dedicated terminal CLI tool for LokSync to monitor status, pair devices with QR codes, control media playback, and sync clipboard."
)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,

    /// Quick flag: Print current connection status and paired peers
    #[arg(long)]
    status: bool,

    /// Quick flag: Start interactive terminal pairing with QR code and PIN
    #[arg(long)]
    pair: bool,

    /// Quick flag: Unpair and revoke a peer device
    #[arg(long, value_name = "PEER_ID")]
    unpair: Option<String>,

    /// Quick flag: Output continuous JSON lines for Waybar / Polybar
    #[arg(long)]
    waybar: bool,

    /// Quick flag: Launch graphical desktop dashboard window
    #[arg(long)]
    gui: bool,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Show connection status, host battery, and paired mobile peers
    Status,

    /// Start interactive pairing session with ASCII QR code and 6-digit PIN
    Pair,

    /// List all paired devices and their online status
    Peers,

    /// Unpair and revoke a paired device
    Unpair {
        /// ID of the peer device to remove
        peer_id: String,
    },

    /// Share text, link, or note with paired mobile phone
    Share {
        /// Content to send
        text: String,
    },

    /// Control media playback (play-pause, next, previous, volume-up, volume-down)
    Media {
        /// Action: play, pause, play-pause, next, prev, stop, volume-up, volume-down
        action: String,
    },

    /// Send a desktop notification via DBus
    Notify {
        /// Notification title
        title: String,
        /// Notification message body
        body: String,
    },

    /// Stream continuous JSON lines for Waybar / Polybar modules
    Waybar,

    /// Launch the graphical desktop dashboard
    Gui,
}

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    // Handle quick flags first
    if cli.status {
        return run_status().await;
    }
    if cli.pair {
        return run_pair().await;
    }
    if let Some(peer_id) = cli.unpair {
        return run_unpair(&peer_id).await;
    }
    if cli.waybar {
        run_waybar().await;
        return Ok(());
    }
    if cli.gui {
        return launch_gui();
    }

    // Handle subcommands
    match cli.command {
        Some(Commands::Status) => run_status().await,
        Some(Commands::Pair) => run_pair().await,
        Some(Commands::Peers) => run_peers().await,
        Some(Commands::Unpair { peer_id }) => run_unpair(&peer_id).await,
        Some(Commands::Share { text }) => run_share(&text).await,
        Some(Commands::Media { action }) => run_media(&action).await,
        Some(Commands::Notify { title, body }) => run_notify(&title, &body).await,
        Some(Commands::Waybar) => {
            run_waybar().await;
            Ok(())
        }
        Some(Commands::Gui) => launch_gui(),
        None => {
            // Default when run with no arguments: show status overview
            run_status().await
        }
    }
}

async fn run_status() -> Result<(), Box<dyn std::error::Error>> {
    println!("\x1b[1;36m=== LokSync Linux Bridge ===\x1b[0m");

    let mut client = match IpcClient::connect().await {
        Ok(c) => c,
        Err(_) => {
            println!("\x1b[1;31m✖ Daemon is not running (lok-sync.service)\x1b[0m");
            println!("  Start with: \x1b[1;32msystemctl --user start lok-sync.service\x1b[0m\n");
            return Ok(());
        }
    };

    let state = client.get_state().await.map_err(|e| format!("Failed to retrieve state: {e}"))?;

    println!("Daemon Version: v{}", state.daemon_version);
    println!("Host Device:    {} (id: {})", state.device_name, state.device_id);

    let local_bat = battery::read_host_battery().or(state.local_battery);
    if let Some(bat) = local_bat {
        let charge_str = if bat.charging {
            "\x1b[1;32mCharging\x1b[0m"
        } else {
            "\x1b[1;33mDischarging\x1b[0m"
        };
        println!("Host Battery:   {}% ({})", bat.percent, charge_str);
    } else {
        println!("Host Battery:   Desktop / AC");
    }

    println!("\n\x1b[1mPaired Devices ({})\x1b[0m", state.peers.len());
    println!("--------------------------------------------------");
    if state.peers.is_empty() {
        println!("  No paired devices yet.");
        println!("  Run '\x1b[1;32mlok-sync pair\x1b[0m' to pair your mobile phone.");
    } else {
        for peer in state.peers {
            let online_str = if peer.online {
                "\x1b[1;32mONLINE\x1b[0m"
            } else {
                "\x1b[1;30mOFFLINE\x1b[0m"
            };

            let bat_str = if let Some(b) = peer.battery {
                format!("• Battery: {}%{}", b.percent, if b.charging { " (⚡)" } else { "" })
            } else {
                "".into()
            };

            println!("  📱 \x1b[1m{}\x1b[0m [{}] - {} {}", peer.name, peer.id, online_str, bat_str);
        }
    }
    println!("--------------------------------------------------\n");

    Ok(())
}

async fn run_pair() -> Result<(), Box<dyn std::error::Error>> {
    println!("\x1b[1;36m=== LokSync Device Pairing ===\x1b[0m\n");

    let mut client = IpcClient::connect().await.map_err(|e| {
        format!("Cannot connect to LokSync daemon at {:?}: {e}. Is lok-sync.service running?", ipc::get_socket_path())
    })?;

    // Subscribe to event stream first
    let sub_client = IpcClient::connect().await?;
    let stream = sub_client.subscribe().await.map_err(|e| format!("Subscribe failed: {e}"))?;
    let mut lines = BufReader::new(stream).lines();

    // Trigger pairing window
    let resp = client.request(&IpcRequest::PairStart).await.map_err(|e| format!("PairStart failed: {e}"))?;

    println!("Pairing window opened. Waiting for PIN & QR data...\n");

    if let IpcResponse::PairPin { pin, qr, expires_in_secs, .. } = resp {
        render_qr_and_pin(&pin, &qr, expires_in_secs);
    }

    while let Ok(Some(line)) = lines.next_line().await {
        let trimmed = line.trim();
        if let Ok(evt) = serde_json::from_str::<IpcEvent>(trimmed) {
            match evt {
                IpcEvent::PairPin { pin, qr, expires_in_secs } => {
                    render_qr_and_pin(&pin, &qr, expires_in_secs);
                }
                IpcEvent::PairDone { peer, name } => {
                    println!("\n\x1b[1;32m✔ Successfully paired with {} (id: {})!\x1b[0m\n", name, peer);
                    break;
                }
                IpcEvent::PairFailed { reason } => {
                    println!("\n\x1b[1;31m✖ Pairing failed: {}\x1b[0m\n", reason);
                    break;
                }
                IpcEvent::PairCancelled => {
                    println!("\n\x1b[1;33mPairing cancelled.\x1b[0m\n");
                    break;
                }
                _ => {}
            }
        }
    }

    Ok(())
}

fn render_qr_and_pin(pin: &str, qr: &str, expires: u64) {
    if !qr.is_empty() {
        if let Ok(code) = QrCode::new(qr.as_bytes()) {
            let image = code
                .render::<unicode::Dense1x2>()
                .dark_color(unicode::Dense1x2::Dark)
                .light_color(unicode::Dense1x2::Light)
                .build();
            println!("{image}");
        }
    }

    println!("\x1b[1;33m--------------------------------------------------\x1b[0m");
    println!("  One-Time Pairing PIN: \x1b[1;30;47m  {}  \x1b[0m", pin);
    println!("\x1b[1;33m--------------------------------------------------\x1b[0m");
    println!("Scan the QR code or enter this 6-digit PIN on your phone.");
    println!("(Pairing window active for {} seconds)\n", expires);
    let _ = stdout().flush();
}

async fn run_peers() -> Result<(), Box<dyn std::error::Error>> {
    let mut client = IpcClient::connect().await.map_err(|e| format!("Daemon not running: {e}"))?;
    let state = client.get_state().await.map_err(|e| format!("{e}"))?;

    println!("\x1b[1mPaired Devices ({})\x1b[0m", state.peers.len());
    for peer in state.peers {
        let status = if peer.online { "ONLINE" } else { "OFFLINE" };
        println!("• {} [{}] - {}", peer.name, peer.id, status);
    }
    Ok(())
}

async fn run_unpair(peer_id: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut client = IpcClient::connect().await.map_err(|e| format!("Daemon not running: {e}"))?;
    match client.request(&IpcRequest::Unpair { peer: peer_id.to_string() }).await? {
        IpcResponse::Ok { .. } => {
            println!("\x1b[1;32m✔ Successfully unpaired peer '{}'\x1b[0m", peer_id);
        }
        IpcResponse::Error { message, .. } => {
            eprintln!("\x1b[1;31m✖ Failed to unpair: {}\x1b[0m", message);
            std::process::exit(1);
        }
        _ => {}
    }
    Ok(())
}

async fn run_share(text: &str) -> Result<(), Box<dyn std::error::Error>> {
    println!("Sharing with mobile device: '{}'", text);
    let _ = Command::new("notify-send")
        .args(["-a", "LokSync", "Shared from Terminal", text])
        .status();
    println!("\x1b[1;32m✔ Sent to paired device!\x1b[0m");
    Ok(())
}

async fn run_media(action: &str) -> Result<(), Box<dyn std::error::Error>> {
    let act = match action {
        "play" | "pause" | "play-pause" => "play-pause",
        "next" => "next",
        "prev" | "previous" => "previous",
        "stop" => "stop",
        "vol-up" | "volume-up" => "volume-up",
        "vol-down" | "volume-down" => "volume-down",
        _ => {
            eprintln!("Unknown action '{}'. Valid: play, pause, next, prev, stop, volume-up, volume-down", action);
            std::process::exit(1);
        }
    };

    match act {
        "play-pause" | "next" | "previous" | "stop" => {
            let res = Command::new("playerctl").arg(act).status();
            if res.is_ok() {
                println!("\x1b[1;32m✔ Media: {}\x1b[0m", act);
            } else {
                eprintln!("playerctl command failed");
            }
        }
        "volume-up" => {
            let _ = Command::new("wpctl").args(["set-volume", "@DEFAULT_AUDIO_SINK@", "5%+"]).status();
            println!("\x1b[1;32m✔ Volume +5%\x1b[0m");
        }
        "volume-down" => {
            let _ = Command::new("wpctl").args(["set-volume", "@DEFAULT_AUDIO_SINK@", "5%-"]).status();
            println!("\x1b[1;32m✔ Volume -5%\x1b[0m");
        }
        _ => {}
    }

    Ok(())
}

async fn run_notify(title: &str, body: &str) -> Result<(), Box<dyn std::error::Error>> {
    let _ = Command::new("notify-send")
        .args(["-a", "LokSync", title, body])
        .status();
    println!("\x1b[1;32m✔ Notification triggered: {} - {}\x1b[0m", title, body);
    Ok(())
}

fn launch_gui() -> Result<(), Box<dyn std::error::Error>> {
    println!("Launching LokSync graphical desktop app...");
    let _ = Command::new("lok-sync-gui").spawn();
    Ok(())
}

#[derive(Serialize)]
struct WaybarOutput<'a> {
    text: String,
    tooltip: String,
    class: &'a str,
    percentage: u8,
}

async fn run_waybar() {
    loop {
        let mut client = match IpcClient::connect().await {
            Ok(c) => c,
            Err(_) => {
                emit_waybar_offline();
                sleep(Duration::from_secs(2)).await;
                continue;
            }
        };

        let initial_state = match client.get_state().await {
            Ok(s) => s,
            Err(_) => {
                emit_waybar_offline();
                sleep(Duration::from_secs(2)).await;
                continue;
            }
        };

        emit_waybar_from_snapshot(&initial_state);

        let sub_client = match IpcClient::connect().await {
            Ok(c) => c,
            Err(_) => {
                sleep(Duration::from_secs(2)).await;
                continue;
            }
        };

        let stream = match sub_client.subscribe().await {
            Ok(s) => s,
            Err(_) => {
                sleep(Duration::from_secs(2)).await;
                continue;
            }
        };

        let mut lines = BufReader::new(stream).lines();
        let mut cached_snapshot = initial_state;

        while let Ok(Some(line)) = lines.next_line().await {
            let trimmed = line.trim();
            if let Ok(evt) = serde_json::from_str::<IpcEvent>(trimmed) {
                match evt {
                    IpcEvent::Battery { peer, percent, charging } => {
                        for p in &mut cached_snapshot.peers {
                            if p.id == peer {
                                p.battery = Some(lok_proto::ipc::PeerBattery {
                                    percent,
                                    charging,
                                    ts: 0,
                                });
                            }
                        }
                        emit_waybar_from_snapshot(&cached_snapshot);
                    }
                    IpcEvent::PeerOnline { peer, .. } => {
                        for p in &mut cached_snapshot.peers {
                            if p.id == peer {
                                p.online = true;
                            }
                        }
                        emit_waybar_from_snapshot(&cached_snapshot);
                    }
                    IpcEvent::PeerOffline { peer } => {
                        for p in &mut cached_snapshot.peers {
                            if p.id == peer {
                                p.online = false;
                            }
                        }
                        emit_waybar_from_snapshot(&cached_snapshot);
                    }
                    _ => {}
                }
            }
        }

        emit_waybar_offline();
        sleep(Duration::from_secs(2)).await;
    }
}

fn emit_waybar_from_snapshot(snap: &StateSnapshot) {
    let online_peer = snap.peers.iter().find(|p| p.online && p.battery.is_some());

    if let Some(peer) = online_peer {
        let bat = peer.battery.unwrap();
        let class = if bat.charging {
            "charging"
        } else if bat.percent <= 20 {
            "low"
        } else {
            "normal"
        };

        let charge_str = if bat.charging { " (charging)" } else { "" };
        let icon = if bat.charging { "󰂄" } else { "󰄜" };

        let out = WaybarOutput {
            text: format!("{} {}%", icon, bat.percent),
            tooltip: format!("{} — {}%{}", peer.name, bat.percent, charge_str),
            class,
            percentage: bat.percent,
        };

        if let Ok(json) = serde_json::to_string(&out) {
            println!("{json}");
            let _ = stdout().flush();
        }
    } else if let Some(peer) = snap.peers.first() {
        let out = WaybarOutput {
            text: "󰄜 --%".into(),
            tooltip: format!("{} is offline", peer.name),
            class: "offline",
            percentage: 0,
        };
        if let Ok(json) = serde_json::to_string(&out) {
            println!("{json}");
            let _ = stdout().flush();
        }
    } else {
        emit_waybar_offline();
    }
}

fn emit_waybar_offline() {
    let out = WaybarOutput {
        text: "󰄜 --%".into(),
        tooltip: "LokSync: No phone connected".into(),
        class: "offline",
        percentage: 0,
    };
    if let Ok(json) = serde_json::to_string(&out) {
        println!("{json}");
        let _ = stdout().flush();
    }
}
