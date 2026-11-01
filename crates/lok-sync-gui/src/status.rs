use crate::ipc_client::IpcClient;

pub async fn run_status() -> Result<(), Box<dyn std::error::Error>> {
    let mut client = IpcClient::connect().await.map_err(|e| {
        format!("Failed to connect to lok-sync-d: {e}")
    })?;

    let state = client.get_state().await.map_err(|e| {
        format!("Failed to retrieve state: {e}")
    })?;

    println!("LokSync Daemon v{}", state.daemon_version);
    println!("Device: {} (id: {})", state.device_name, state.device_id);

    let local_bat = crate::commands::read_host_battery_direct().or(state.local_battery);

    if let Some(bat) = local_bat {
        let charge = if bat.charging { "charging" } else { "discharging" };
        println!("Local Battery: {}% ({})", bat.percent, charge);
    } else {
        println!("Local Battery: None (desktop/server)");
    }

    println!("\nPaired Peers ({})", state.peers.len());
    println!("--------------------------------------------------");
    if state.peers.is_empty() {
        println!("  (No paired devices yet. Run 'lok-sync-gui --pair' to connect your phone)");
    } else {
        for peer in state.peers {
            let status_str = if peer.online {
                if let Some(b) = peer.battery {
                    let c = if b.charging { "charging" } else { "discharging" };
                    format!("ONLINE (Battery: {}% {})", b.percent, c)
                } else {
                    "ONLINE".into()
                }
            } else {
                "OFFLINE".into()
            };

            println!("• {} [{}] - {}", peer.name, peer.id, status_str);
            println!(
                "  Permissions: notifications={}, battery={}, commands={}",
                peer.permissions.notifications, peer.permissions.battery, peer.permissions.commands
            );
        }
    }
    println!("--------------------------------------------------");

    Ok(())
}
