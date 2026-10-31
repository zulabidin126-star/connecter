use crate::ipc_client::IpcClient;
use ksni::{menu::*, MenuItem, ToolTip, Tray, TrayService};
use lok_proto::ipc::{IpcEvent, StateSnapshot};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::time::sleep;

struct LokSyncTray {
    snapshot: Arc<Mutex<Option<StateSnapshot>>>,
}

impl Tray for LokSyncTray {
    fn id(&self) -> String {
        "lok-sync".into()
    }

    fn title(&self) -> String {
        "LokSync".into()
    }

    fn icon_name(&self) -> String {
        let guard = self.snapshot.lock().unwrap();
        if let Some(ref snap) = *guard {
            let online_peer = snap.peers.iter().find(|p| p.online && p.battery.is_some());
            if let Some(peer) = online_peer {
                let bat = peer.battery.unwrap();
                if bat.charging {
                    return "battery-charging".into();
                } else if bat.percent <= 20 {
                    return "battery-caution".into();
                } else {
                    return "battery-good".into();
                }
            }
        }
        "network-wireless".into()
    }

    fn tool_tip(&self) -> ToolTip {
        let guard = self.snapshot.lock().unwrap();
        let description = if let Some(ref snap) = *guard {
            let online_peer = snap.peers.iter().find(|p| p.online);
            if let Some(peer) = online_peer {
                if let Some(b) = peer.battery {
                    let c = if b.charging { "charging" } else { "discharging" };
                    format!("{}: {}% ({})", peer.name, b.percent, c)
                } else {
                    format!("{}: connected", peer.name)
                }
            } else {
                "LokSync: No phone connected".into()
            }
        } else {
            "LokSync: Connecting...".into()
        };

        ToolTip {
            title: "LokSync".into(),
            description,
            icon_name: self.icon_name(),
            icon_pixmap: Vec::new(),
        }
    }

    fn menu(&self) -> Vec<MenuItem<Self>> {
        let guard = self.snapshot.lock().unwrap();
        let mut items = Vec::new();

        items.push(
            StandardItem {
                label: "LokSync Bridge".into(),
                enabled: false,
                ..Default::default()
            }
            .into(),
        );
        items.push(MenuItem::Separator);

        if let Some(ref snap) = *guard {
            for peer in &snap.peers {
                let status = if peer.online {
                    if let Some(b) = peer.battery {
                        format!("{}% ({})", b.percent, if b.charging { "charging" } else { "" })
                    } else {
                        "online".into()
                    }
                } else {
                    "offline".into()
                };

                items.push(
                    StandardItem {
                        label: format!("{} ({})", peer.name, status),
                        enabled: false,
                        ..Default::default()
                    }
                    .into(),
                );
            }
        }

        items.push(MenuItem::Separator);
        items.push(
            StandardItem {
                label: "Quit Tray".into(),
                activate: Box::new(|_| std::process::exit(0)),
                ..Default::default()
            }
            .into(),
        );

        items
    }
}

pub async fn run_tray() -> Result<(), Box<dyn std::error::Error>> {
    let snapshot = Arc::new(Mutex::new(None));
    let tray = LokSyncTray {
        snapshot: snapshot.clone(),
    };

    let service = TrayService::new(tray);
    let handle = service.handle();
    service.spawn();

    // Background task to keep snapshot updated via IPC
    tokio::spawn(async move {
        loop {
            if let Ok(mut client) = IpcClient::connect().await {
                if let Ok(initial) = client.get_state().await {
                    {
                        let mut guard = snapshot.lock().unwrap();
                        *guard = Some(initial);
                    }
                    handle.update(|_| {});
                }

                if let Ok(stream) = client.subscribe().await {
                    let mut lines = BufReader::new(stream).lines();
                    while let Ok(Some(line)) = lines.next_line().await {
                        if let Ok(evt) = serde_json::from_str::<IpcEvent>(line.trim()) {
                            let mut changed = false;
                            {
                                let mut guard = snapshot.lock().unwrap();
                                if let Some(ref mut snap) = *guard {
                                    match evt {
                                        IpcEvent::Battery { peer, percent, charging } => {
                                            for p in &mut snap.peers {
                                                if p.id == peer {
                                                    p.battery = Some(lok_proto::ipc::PeerBattery {
                                                        percent,
                                                        charging,
                                                        ts: 0,
                                                    });
                                                    changed = true;
                                                }
                                            }
                                        }
                                        IpcEvent::PeerOnline { peer, .. } => {
                                            for p in &mut snap.peers {
                                                if p.id == peer {
                                                    p.online = true;
                                                    changed = true;
                                                }
                                            }
                                        }
                                        IpcEvent::PeerOffline { peer } => {
                                            for p in &mut snap.peers {
                                                if p.id == peer {
                                                    p.online = false;
                                                    changed = true;
                                                }
                                            }
                                        }
                                        _ => {}
                                    }
                                }
                            }
                            if changed {
                                handle.update(|_| {});
                            }
                        }
                    }
                }
            }

            {
                let mut guard = snapshot.lock().unwrap();
                *guard = None;
            }
            handle.update(|_| {});
            sleep(Duration::from_secs(3)).await;
        }
    });

    // Keep thread alive
    loop {
        sleep(Duration::from_secs(3600)).await;
    }
}
