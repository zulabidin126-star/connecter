use crate::ipc_client::IpcClient;
use lok_proto::ipc::{IpcEvent, IpcRequest};
use qrcode::render::unicode;
use qrcode::QrCode;
use std::io::{stdout, Write};
use tokio::io::{AsyncBufReadExt, BufReader};

pub async fn run_pairing() -> Result<(), Box<dyn std::error::Error>> {
    println!("\x1b[1;36m=== LokSync Device Pairing ===\x1b[0m\n");

    let mut client = IpcClient::connect().await.map_err(|e| {
        format!("Cannot connect to LokSync daemon at {:?}: {e}. Is lok-sync-d running?", crate::ipc_client::get_socket_path())
    })?;

    // Subscribe first so we don't miss the PairPin event
    let sub_client = IpcClient::connect().await?;
    let stream = sub_client.subscribe().await.map_err(|e| format!("Subscribe failed: {e}"))?;
    let mut lines = BufReader::new(stream).lines();

    // Trigger pairing window
    client.request(&IpcRequest::PairStart).await.map_err(|e| format!("PairStart failed: {e}"))?;

    println!("Pairing window opened. Waiting for PIN & QR data from daemon...\n");

    while let Ok(Some(line)) = lines.next_line().await {
        let trimmed = line.trim();
        if let Ok(evt) = serde_json::from_str::<IpcEvent>(trimmed) {
            match evt {
                IpcEvent::PairPin { pin, qr, expires_in_secs } => {
                    render_terminal_qr(&qr);
                    println!("\n\x1b[1;33m--------------------------------------------------\x1b[0m");
                    println!("\x1b[1;32m  Pairing PIN: \x1b[1;37;44m  {}  \x1b[0m", pin);
                    println!("\x1b[1;33m--------------------------------------------------\x1b[0m");
                    println!("Open the LokSync app on your phone, scan the QR code");
                    println!("or enter the 6-digit PIN above.");
                    println!("(Window expires in {} seconds)\n", expires_in_secs);
                    let _ = stdout().flush();
                }
                IpcEvent::PairDone { peer, name } => {
                    println!("\n\x1b[1;32m✔ Successfully paired with {} (id: {})!\x1b[0m", name, peer);
                    break;
                }
                IpcEvent::PairFailed { reason } => {
                    println!("\n\x1b[1;31m✖ Pairing failed: {}\x1b[0m", reason);
                    break;
                }
                IpcEvent::PairCancelled => {
                    println!("\n\x1b[1;33mPairing cancelled.\x1b[0m");
                    break;
                }
                _ => {}
            }
        }
    }

    Ok(())
}

fn render_terminal_qr(content: &str) {
    match QrCode::new(content.as_bytes()) {
        Ok(code) => {
            let image = code
                .render::<unicode::Dense1x2>()
                .dark_color(unicode::Dense1x2::Dark)
                .light_color(unicode::Dense1x2::Light)
                .build();
            println!("{image}");
        }
        Err(e) => {
            println!("(Could not render QR code: {e})");
            println!("Data: {content}");
        }
    }
}
