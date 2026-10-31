mod gui_app;
mod gui_state;
mod ipc_client;
mod ipc_worker;
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
#[command(about = "LokSync modern GUI & CLI client for desktop dashboard, Waybar, tray, and pairing", long_about = None)]
struct Cli {
    #[arg(long, help = "Launch graphical desktop dashboard")]
    gui: bool,

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

    // Default: Launch the modern graphical user interface!
    let native_options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([820.0, 580.0])
            .with_min_inner_size([640.0, 480.0])
            .with_title("LokSync — Local Device Bridge"),
        ..Default::default()
    };

    eframe::run_native(
        "LokSync",
        native_options,
        Box::new(|cc| Ok(Box::new(gui_app::LokSyncGuiApp::new(cc)))),
    )
    .map_err(|e| format!("GUI launch failed: {e}").into())
}
