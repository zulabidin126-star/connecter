mod ipc_client;
mod pair;
mod status;
mod tray;
mod waybar;

use clap::Parser;
use ipc_client::IpcClient;
use lok_proto::ipc::{IpcRequest, IpcResponse};

#[derive(Parser, Debug)]
#[command(name = "lok-sync-gui")]
#[command(author = "LokSync Contributors")]
#[command(version = env!("CARGO_PKG_VERSION"))]
#[command(about = "LokSync lightweight GUI & CLI client for Waybar, tray, and device pairing", long_about = None)]
struct Cli {
    #[arg(long, help = "Output continuous JSON lines for Waybar custom module")]
    waybar: bool,

    #[arg(long, help = "Run StatusNotifierItem system tray icon")]
    tray: bool,

    #[arg(long, help = "Start terminal pairing with QR code and PIN")]
    pair: bool,

    #[arg(long, help = "Print current connection status and paired peers")]
    status: bool,

    #[arg(long, value_name = "PEER_ID", help = "Unpair and revoke a peer device")]
    unpair: Option<String>,
}

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    if cli.waybar {
        waybar::run_waybar().await;
        return Ok(());
    }

    if cli.tray {
        tray::run_tray().await?;
        return Ok(());
    }

    if cli.pair {
        pair::run_pairing().await?;
        return Ok(());
    }

    if let Some(peer_id) = cli.unpair {
        let mut client = IpcClient::connect().await.map_err(|e| {
            format!("Cannot connect to lok-sync-d: {e}")
        })?;
        match client.request(&IpcRequest::Unpair { peer: peer_id.clone() }).await? {
            IpcResponse::Ok { .. } => {
                println!("Successfully unpaired peer '{peer_id}'");
            }
            IpcResponse::Error { message, .. } => {
                eprintln!("Failed to unpair: {message}");
                std::process::exit(1);
            }
            _ => {}
        }
        return Ok(());
    }

    // Default or --status
    status::run_status().await?;
    Ok(())
}
