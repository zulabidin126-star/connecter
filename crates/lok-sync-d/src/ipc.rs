use crate::state::SharedState;
use lok_proto::ipc::*;
use std::path::PathBuf;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{UnixListener, UnixStream};
use tokio::sync::broadcast;
use tracing::{error, info};

pub struct IpcServer {
    listener: UnixListener,
    socket_path: PathBuf,
}

impl IpcServer {
    pub fn bind() -> std::io::Result<Self> {
        let socket_path = get_socket_path();
        if let Some(parent) = socket_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }
        if socket_path.exists() {
            let _ = std::fs::remove_file(&socket_path);
        }

        let listener = UnixListener::bind(&socket_path)?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&socket_path, std::fs::Permissions::from_mode(0o600));
        }

        info!(path = ?socket_path, "IPC Unix domain socket bound");
        Ok(Self {
            listener,
            socket_path,
        })
    }

    pub async fn run(
        self,
        state: SharedState,
        ipc_event_tx: broadcast::Sender<IpcEvent>,
        default_ip: String,
        port: u16,
    ) {
        loop {
            match self.listener.accept().await {
                Ok((stream, _)) => {
                    let state_cloned = state.clone();
                    let tx_cloned = ipc_event_tx.clone();
                    let rx = ipc_event_tx.subscribe();
                    let ip = default_ip.clone();

                    tokio::spawn(async move {
                        handle_ipc_client(stream, state_cloned, tx_cloned, rx, &ip, port).await;
                    });
                }
                Err(e) => {
                    error!("IPC accept error: {e}");
                    break;
                }
            }
        }
    }
}

impl Drop for IpcServer {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.socket_path);
    }
}

pub fn get_socket_path() -> PathBuf {
    if let Ok(runtime_dir) = std::env::var("XDG_RUNTIME_DIR") {
        PathBuf::from(runtime_dir).join("lok-sync/ctl.sock")
    } else {
        PathBuf::from("/tmp/lok-sync/ctl.sock")
    }
}

async fn handle_ipc_client(
    stream: UnixStream,
    state: SharedState,
    event_tx: broadcast::Sender<IpcEvent>,
    mut event_rx: broadcast::Receiver<IpcEvent>,
    default_ip: &str,
    port: u16,
) {
    let (reader, mut writer) = stream.into_split();
    let mut lines = BufReader::new(reader).lines();
    let mut subscribed = false;

    loop {
        tokio::select! {
            line_res = lines.next_line() => {
                match line_res {
                    Ok(Some(line)) => {
                        let trimmed = line.trim();
                        if trimmed.is_empty() {
                            continue;
                        }

                        let req: Result<IpcRequest, _> = serde_json::from_str(trimmed);
                        match req {
                            Ok(IpcRequest::GetState) => {
                                let snap = {
                                    let guard = state.read().await;
                                    guard.snapshot()
                                };
                                let resp = IpcResponse::State(snap);
                                send_json_line(&mut writer, &resp).await;
                            }
                            Ok(IpcRequest::ListPeers) => {
                                let peers = {
                                    let guard = state.read().await;
                                    guard.snapshot().peers
                                };
                                let resp = IpcResponse::Peers(peers);
                                send_json_line(&mut writer, &resp).await;
                            }
                            Ok(IpcRequest::Subscribe) => {
                                subscribed = true;
                                send_json_line(&mut writer, &IpcResponse::success()).await;
                            }
                            Ok(IpcRequest::PairStart) => {
                                let (pin, qr) = {
                                    let mut guard = state.write().await;
                                    guard.start_pairing(default_ip, port)
                                };
                                let event = IpcEvent::PairPin {
                                    pin: pin.clone(),
                                    qr: qr.clone(),
                                    expires_in_secs: 120,
                                };
                                let _ = event_tx.send(event);
                                send_json_line(&mut writer, &IpcResponse::PairPin {
                                    status: "ok".into(),
                                    pin,
                                    qr,
                                    expires_in_secs: 120,
                                }).await;
                            }
                            Ok(IpcRequest::PairCancel) => {
                                {
                                    let mut guard = state.write().await;
                                    guard.cancel_pairing();
                                }
                                let _ = event_tx.send(IpcEvent::PairCancelled);
                                send_json_line(&mut writer, &IpcResponse::success()).await;
                            }
                            Ok(IpcRequest::Unpair { peer }) => {
                                let removed = {
                                    let mut guard = state.write().await;
                                    guard.remove_peer(&peer)
                                };
                                if removed {
                                    send_json_line(&mut writer, &IpcResponse::success()).await;
                                } else {
                                    send_json_line(&mut writer, &IpcResponse::err("Peer not found")).await;
                                }
                            }
                            Err(e) => {
                                send_json_line(&mut writer, &IpcResponse::err(format!("Invalid JSON request: {e}"))).await;
                            }
                        }
                    }
                    Ok(None) => break,
                    Err(_) => break,
                }
            }

            // Stream events to subscriber
            Ok(evt) = event_rx.recv(), if subscribed => {
                send_json_line(&mut writer, &evt).await;
            }
        }
    }
}

async fn send_json_line<T: serde::Serialize>(writer: &mut tokio::net::unix::OwnedWriteHalf, val: &T) {
    if let Ok(mut json) = serde_json::to_string(val) {
        json.push('\n');
        let _ = writer.write_all(json.as_bytes()).await;
    }
}
