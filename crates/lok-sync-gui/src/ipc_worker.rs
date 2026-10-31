use crate::ipc_client::IpcClient;
use lok_proto::ipc::{IpcEvent, IpcRequest, IpcResponse, StateSnapshot};
use std::time::Duration;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::sync::mpsc;
use tokio::time::sleep;

#[derive(Debug)]
pub enum WorkerCommand {
    PairStart,
    PairCancel,
    Unpair(String),
    Refresh,
}

#[derive(Debug)]
pub enum WorkerEvent {
    Connected,
    Disconnected,
    Snapshot(StateSnapshot),
    Battery {
        peer: String,
        percent: u8,
        charging: bool,
    },
    PeerOnline {
        peer: String,
        name: String,
    },
    PeerOffline {
        peer: String,
    },
    PairPin {
        pin: String,
        qr: String,
        expires_in_secs: u64,
    },
    PairDone {
        peer: String,
        name: String,
    },
    PairFailed {
        reason: String,
    },
    PairCancelled,
    Toast(String),
}

pub struct IpcWorkerHandle {
    pub cmd_tx: mpsc::Sender<WorkerCommand>,
    pub evt_rx: mpsc::Receiver<WorkerEvent>,
}

pub fn spawn_ipc_worker() -> IpcWorkerHandle {
    let (cmd_tx, mut cmd_rx) = mpsc::channel::<WorkerCommand>(32);
    let (evt_tx, evt_rx) = mpsc::channel::<WorkerEvent>(64);

    std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("Failed to create worker runtime");

        rt.block_on(async move {
            loop {
                // Try connecting to daemon socket
                let mut client = match IpcClient::connect().await {
                    Ok(c) => c,
                    Err(_) => {
                        let _ = evt_tx.send(WorkerEvent::Disconnected).await;
                        sleep(Duration::from_millis(1500)).await;
                        continue;
                    }
                };

                let _ = evt_tx.send(WorkerEvent::Connected).await;

                // Fetch initial snapshot
                if let Ok(snap) = client.get_state().await {
                    let _ = evt_tx.send(WorkerEvent::Snapshot(snap)).await;
                }

                // Connect second client for subscription
                let sub_stream = match IpcClient::connect().await {
                    Ok(sub_client) => sub_client.subscribe().await.ok(),
                    Err(_) => None,
                };

                let mut sub_lines = sub_stream.map(|s| BufReader::new(s).lines());

                // Loop processing commands and incoming events
                let mut ticker = tokio::time::interval(Duration::from_secs(3));

                loop {
                    tokio::select! {
                        // Periodic state sync
                        _ = ticker.tick() => {
                            if let Ok(snap) = client.get_state().await {
                                let _ = evt_tx.send(WorkerEvent::Snapshot(snap)).await;
                            }
                        }

                        // Commands from GUI
                        Some(cmd) = cmd_rx.recv() => {
                            match cmd {
                                WorkerCommand::PairStart => {
                                    match client.request(&IpcRequest::PairStart).await {
                                        Ok(_) => {
                                            let _ = evt_tx.send(WorkerEvent::Toast("Pairing initiated".into())).await;
                                        }
                                        Err(e) => {
                                            let _ = evt_tx.send(WorkerEvent::Toast(format!("Pairing error: {e}"))).await;
                                        }
                                    }
                                }
                                WorkerCommand::PairCancel => {
                                    let _ = client.request(&IpcRequest::PairCancel).await;
                                    let _ = evt_tx.send(WorkerEvent::PairCancelled).await;
                                }
                                WorkerCommand::Unpair(peer) => {
                                    match client.request(&IpcRequest::Unpair { peer: peer.clone() }).await {
                                        Ok(IpcResponse::Ok { .. }) => {
                                            let _ = evt_tx.send(WorkerEvent::Toast(format!("Unpaired {peer}"))).await;
                                            if let Ok(snap) = client.get_state().await {
                                                let _ = evt_tx.send(WorkerEvent::Snapshot(snap)).await;
                                            }
                                        }
                                        Ok(IpcResponse::Error { message, .. }) => {
                                            let _ = evt_tx.send(WorkerEvent::Toast(format!("Failed: {message}"))).await;
                                        }
                                        _ => {}
                                    }
                                }
                                WorkerCommand::Refresh => {
                                    if let Ok(snap) = client.get_state().await {
                                        let _ = evt_tx.send(WorkerEvent::Snapshot(snap)).await;
                                        let _ = evt_tx.send(WorkerEvent::Toast("Refreshed daemon status".into())).await;
                                    }
                                }
                            }
                        }

                        // Streamed events from daemon
                        line = async {
                            if let Some(ref mut lines) = sub_lines {
                                lines.next_line().await
                            } else {
                                std::future::pending::<std::io::Result<Option<String>>>().await
                            }
                        } => {
                            match line {
                                Ok(Some(line_str)) => {
                                    let trimmed = line_str.trim();
                                    if let Ok(event) = serde_json::from_str::<IpcEvent>(trimmed) {
                                        match event {
                                            IpcEvent::Battery { peer, percent, charging } => {
                                                let _ = evt_tx.send(WorkerEvent::Battery { peer, percent, charging }).await;
                                            }
                                            IpcEvent::PeerOnline { peer, name } => {
                                                let _ = evt_tx.send(WorkerEvent::PeerOnline { peer, name }).await;
                                            }
                                            IpcEvent::PeerOffline { peer } => {
                                                let _ = evt_tx.send(WorkerEvent::PeerOffline { peer }).await;
                                            }
                                            IpcEvent::PairPin { pin, qr, expires_in_secs } => {
                                                let _ = evt_tx.send(WorkerEvent::PairPin { pin, qr, expires_in_secs }).await;
                                            }
                                            IpcEvent::PairDone { peer, name } => {
                                                let _ = evt_tx.send(WorkerEvent::PairDone { peer, name }).await;
                                            }
                                            IpcEvent::PairFailed { reason } => {
                                                let _ = evt_tx.send(WorkerEvent::PairFailed { reason }).await;
                                            }
                                            IpcEvent::PairCancelled => {
                                                let _ = evt_tx.send(WorkerEvent::PairCancelled).await;
                                            }
                                        }
                                    }
                                }
                                _ => {
                                    // Connection broke
                                    break;
                                }
                            }
                        }
                    }
                }

                // Disconnected, sleep and retry
                let _ = evt_tx.send(WorkerEvent::Disconnected).await;
                sleep(Duration::from_millis(1500)).await;
            }
        });
    });

    IpcWorkerHandle { cmd_tx, evt_rx }
}
