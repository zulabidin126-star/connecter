use crate::ipc_client::IpcClient;
use lok_proto::ipc::{IpcEvent, StateSnapshot};
use serde::Serialize;
use std::io::{stdout, Write};
use std::time::Duration;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::time::sleep;

#[derive(Serialize)]
struct WaybarOutput<'a> {
    text: String,
    tooltip: String,
    class: &'a str,
    percentage: u8,
}

pub async fn run_waybar() {
    loop {
        let mut client = match IpcClient::connect().await {
            Ok(c) => c,
            Err(_) => {
                emit_offline();
                sleep(Duration::from_secs(2)).await;
                continue;
            }
        };

        let initial_state = match client.get_state().await {
            Ok(s) => s,
            Err(_) => {
                emit_offline();
                sleep(Duration::from_secs(2)).await;
                continue;
            }
        };

        // Render initial state
        emit_from_snapshot(&initial_state);

        // Reconnect and subscribe
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
                        emit_from_snapshot(&cached_snapshot);
                    }
                    IpcEvent::PeerOnline { peer, .. } => {
                        for p in &mut cached_snapshot.peers {
                            if p.id == peer {
                                p.online = true;
                            }
                        }
                        emit_from_snapshot(&cached_snapshot);
                    }
                    IpcEvent::PeerOffline { peer } => {
                        for p in &mut cached_snapshot.peers {
                            if p.id == peer {
                                p.online = false;
                            }
                        }
                        emit_from_snapshot(&cached_snapshot);
                    }
                    _ => {}
                }
            }
        }

        // Connection dropped, output offline and retry
        emit_offline();
        sleep(Duration::from_secs(2)).await;
    }
}

fn emit_from_snapshot(snap: &StateSnapshot) {
    // Find first online peer with battery info
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
        // Known peer but offline
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
        emit_offline();
    }
}

fn emit_offline() {
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
