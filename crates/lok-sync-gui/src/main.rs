mod commands;
mod ipc_client;
mod pair;
mod status;
mod tauri_bridge;
mod tray;
mod waybar;

use clap::Parser;
use ipc_client::IpcClient;
use lok_proto::ipc::{IpcRequest, IpcResponse};

#[derive(Parser, Debug)]
#[command(name = "lok-sync-gui")]
#[command(author = "LokSync Contributors")]
#[command(version = env!("CARGO_PKG_VERSION"))]
#[command(
    about = "LokSync modern GUI & CLI client for desktop dashboard, Waybar, tray, and pairing",
    long_about = None
)]
struct Cli {
    #[arg(long, help = "Launch graphical desktop dashboard")]
    gui: bool,

    #[arg(
        long,
        help = "Output continuous JSON lines for Waybar custom module"
    )]
    waybar: bool,

    #[arg(long, help = "Run StatusNotifierItem system tray icon")]
    tray: bool,

    #[arg(long, help = "Start terminal pairing with QR code and PIN")]
    pair: bool,

    #[arg(long, help = "Print current connection status and paired peers")]
    status: bool,

    #[arg(
        long,
        value_name = "PEER_ID",
        help = "Unpair and revoke a peer device"
    )]
    unpair: Option<String>,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    if cli.waybar {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()?;
        rt.block_on(waybar::run_waybar());
        return Ok(());
    }

    if cli.tray {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()?;
        rt.block_on(tray::run_tray())?;
        return Ok(());
    }

    if cli.pair {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()?;
        rt.block_on(pair::run_pairing())?;
        return Ok(());
    }

    if let Some(peer_id) = cli.unpair {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()?;
        rt.block_on(async {
            let mut client = IpcClient::connect()
                .await
                .map_err(|e| format!("Cannot connect to lok-sync-d: {e}"))?;
            match client
                .request(&IpcRequest::Unpair {
                    peer: peer_id.clone(),
                })
                .await?
            {
                IpcResponse::Ok { .. } => {
                    println!("Successfully unpaired peer '{peer_id}'");
                }
                IpcResponse::Error { message, .. } => {
                    eprintln!("Failed to unpair: {message}");
                    std::process::exit(1);
                }
                _ => {}
            }
            Ok::<(), Box<dyn std::error::Error>>(())
        })?;
        return Ok(());
    }

    if cli.status {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()?;
        rt.block_on(status::run_status())?;
        return Ok(());
    }

    // Default: Launch modern Tauri v2 Desktop GUI
    tauri_bridge::run_tauri_app()
}
