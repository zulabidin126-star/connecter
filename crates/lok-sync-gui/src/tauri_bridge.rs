use crate::commands;
use crate::ipc_client::IpcClient;
use lok_proto::ipc::IpcEvent;
use serde_json::json;
use std::time::Duration;
use tauri::Emitter;
use tokio::io::AsyncBufReadExt;

pub fn run_tauri_app() -> Result<(), Box<dyn std::error::Error>> {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::get_daemon_status,
            commands::get_host_battery,
            commands::start_pairing,
            commands::cancel_pairing,
            commands::unpair_peer,
            commands::update_settings,
            commands::get_media_status,
            commands::media_control,
            commands::send_test_notification,
            commands::get_systemd_status,
            commands::manage_systemd_service,
            commands::get_clipboard_content,
            commands::set_clipboard_content,
            commands::discover_network_devices,
            commands::connect_to_network_device,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    if let Ok(client) = IpcClient::connect().await {
                        if let Ok(reader) = client.subscribe().await {
                            let mut lines = tokio::io::BufReader::new(reader).lines();
                            while let Ok(Some(line)) = lines.next_line().await {
                                let trimmed = line.trim();
                                if let Ok(evt) = serde_json::from_str::<IpcEvent>(trimmed) {
                                    let payload = match evt {
                                        IpcEvent::Battery {
                                            peer,
                                            percent,
                                            charging,
                                        } => {
                                            json!({
                                                "type": "Battery",
                                                "data": { "peer": peer, "percent": percent, "charging": charging }
                                            })
                                        }
                                        IpcEvent::PeerOnline { peer, name } => {
                                            json!({
                                                "type": "PeerOnline",
                                                "data": { "peer": peer, "name": name }
                                            })
                                        }
                                        IpcEvent::PeerOffline { peer } => {
                                            json!({
                                                "type": "PeerOffline",
                                                "data": { "peer": peer }
                                            })
                                        }
                                        IpcEvent::PairPin {
                                            pin,
                                            qr,
                                            expires_in_secs,
                                        } => {
                                            json!({
                                                "type": "PairPin",
                                                "data": { "pin": pin, "qr": qr, "expires_in_secs": expires_in_secs }
                                            })
                                        }
                                        IpcEvent::PairDone { peer, name } => {
                                            json!({
                                                "type": "PairDone",
                                                "data": { "peer": peer, "name": name }
                                            })
                                        }
                                        IpcEvent::PairFailed { reason } => {
                                            json!({
                                                "type": "PairFailed",
                                                "data": { "reason": reason }
                                            })
                                        }
                                        IpcEvent::PairCancelled => {
                                            json!({ "type": "PairCancelled" })
                                        }
                                    };
                                    let _ = handle.emit("daemon-event", payload);
                                }
                            }
                        }
                    }
                    tokio::time::sleep(Duration::from_secs(3)).await;
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())?;

    Ok(())
}
