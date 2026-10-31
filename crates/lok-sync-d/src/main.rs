mod config;
mod ipc;
mod net;
mod session;
mod state;
mod supervisor;
mod svc;

use clap::Parser;
use config::Config;
use ipc::IpcServer;
use net::{DiscoveryService, NetworkListener};
use session::handle_peer_connection;
use state::AppState;
use supervisor::{ShutdownSignal, Supervisor};
use svc::{BatteryService, NotifyService};

use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{broadcast, mpsc, RwLock};
use tracing::{error, info, Level};
use tracing_subscriber::FmtSubscriber;

#[derive(Parser, Debug)]
#[command(name = "lok-sync-d")]
#[command(author = "LokSync Contributors")]
#[command(version = env!("CARGO_PKG_VERSION"))]
#[command(about = "Ultra-lightweight local phone <-> Linux sync daemon", long_about = None)]
struct Cli {
    #[arg(short, long, help = "Path to custom config.toml")]
    config: Option<PathBuf>,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Single OS thread for the main loop: tokio current_thread runtime as specified in §2.3.1
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;

    rt.block_on(async_main())
}

async fn async_main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize compact tracing subscriber
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .with_target(false)
        .without_time()
        .finish();
    tracing::subscriber::set_global_default(subscriber).ok();

    let cli = Cli::parse();
    let config = Arc::new(Config::load(cli.config.as_deref()));

    info!(
        version = env!("CARGO_PKG_VERSION"),
        port = config.network.port,
        "Starting LokSync daemon"
    );

    // Initialize Shared App State
    let app_state = Arc::new(RwLock::new(AppState::init(None)));
    let device_id = {
        let guard = app_state.read().await;
        info!(
            id = %guard.device_id_hex(),
            name = %guard.device_name,
            peers = guard.peers.len(),
            "State initialized"
        );
        guard.device_id_hex()
    };

    let device_name = {
        let guard = app_state.read().await;
        guard.device_name.clone()
    };

    // Broadcast channels for events
    let (ipc_event_tx, _) = broadcast::channel(128);
    let (battery_tx, _) = broadcast::channel(32);
    let (notif_return_tx, notif_return_rx) = mpsc::channel(32);

    // Bind TCP Listener
    let listener = NetworkListener::bind(config.network.port, &config.network.interfaces).await?;
    let local_port = listener.local_addr()?.port();

    // Bind Unix Domain Socket IPC Server
    let ipc_server = match IpcServer::bind() {
        Ok(s) => Some(s),
        Err(e) => {
            error!("Failed to bind IPC socket: {e}");
            None
        }
    };

    if let Some(server) = ipc_server {
        let state_cloned = app_state.clone();
        let tx_cloned = ipc_event_tx.clone();
        tokio::spawn(async move {
            server.run(state_cloned, tx_cloned, "127.0.0.1".into(), local_port).await;
        });
    }

    // Start mDNS local announcement
    let mut discovery = DiscoveryService::new();
    discovery.register(&device_name, &device_id, local_port);

    // Initialize Notification Service
    let notify_svc = Arc::new(NotifyService::new(config.notifications.clone(), notif_return_tx).await);

    // Initialize Battery Service
    let battery_svc = BatteryService::new(
        app_state.clone(),
        &config.battery.device,
        battery_tx.clone(),
    );
    let poll_secs = config.battery.poll_seconds;
    tokio::spawn(async move {
        battery_svc.run_loop(poll_secs).await;
    });

    // Notify systemd ready and start watchdog
    Supervisor::notify_ready();
    Supervisor::start_watchdog_task();

    // Accept loop & signal handling
    let notif_rx_mutex = Arc::new(tokio::sync::Mutex::new(notif_return_rx));

    loop {
        tokio::select! {
            accept_res = listener.accept() => {
                match accept_res {
                    Ok((stream, peer_addr)) => {
                        let state = app_state.clone();
                        let cfg = config.clone();
                        let n_svc = notify_svc.clone();
                        let ipc_tx = ipc_event_tx.clone();
                        let bat_rx = battery_tx.subscribe();
                        let (local_return_tx, local_return_rx) = mpsc::channel(16);

                        // Route return notifications
                        let global_notif_rx = notif_rx_mutex.clone();
                        tokio::spawn(async move {
                            let mut rx = global_notif_rx.lock().await;
                            while let Some(evt) = rx.recv().await {
                                if local_return_tx.send(evt).await.is_err() {
                                    break;
                                }
                            }
                        });

                        tokio::spawn(async move {
                            handle_peer_connection(
                                stream,
                                peer_addr,
                                state,
                                cfg,
                                n_svc,
                                ipc_tx,
                                bat_rx,
                                local_return_rx,
                            ).await;
                        });
                    }
                    Err(e) => {
                        error!("TCP accept error: {e}");
                    }
                }
            }

            sig = Supervisor::wait_for_shutdown_or_reload() => {
                match sig {
                    ShutdownSignal::Terminate => {
                        info!("Shutting down gracefully...");
                        Supervisor::notify_stopping();
                        discovery.unregister();
                        break;
                    }
                    ShutdownSignal::Reload => {
                        info!("Reloading configuration (SIGHUP)...");
                    }
                }
            }
        }
    }

    Ok(())
}
