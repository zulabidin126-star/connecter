use crate::ipc_client::IpcClient;
use lok_proto::ipc::{IpcRequest, IpcResponse, StateSnapshot};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct GuiSettingsPayload {
    pub autostart: bool,
    pub plain_text_only: bool,
    pub hide_body_when_locked: bool,
    pub device_name: String,
    pub port: u16,
}

#[tauri::command]
pub async fn get_daemon_status() -> Result<StateSnapshot, String> {
    let mut client = IpcClient::connect()
        .await
        .map_err(|e| format!("Daemon socket connection failed: {e}"))?;

    client
        .get_state()
        .await
        .map_err(|e| format!("Failed to read state from daemon: {e}"))
}

#[tauri::command]
pub async fn start_pairing() -> Result<(), String> {
    let mut client = IpcClient::connect()
        .await
        .map_err(|e| format!("Daemon socket connection failed: {e}"))?;

    match client.request(&IpcRequest::PairStart).await {
        Ok(IpcResponse::Ok { .. }) => Ok(()),
        Ok(IpcResponse::Error { message, .. }) => Err(message),
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Pairing command error: {e}")),
    }
}

#[tauri::command]
pub async fn cancel_pairing() -> Result<(), String> {
    let mut client = IpcClient::connect()
        .await
        .map_err(|e| format!("Daemon socket connection failed: {e}"))?;

    let _ = client.request(&IpcRequest::PairCancel).await;
    Ok(())
}

#[tauri::command]
pub async fn unpair_peer(peer_id: String) -> Result<(), String> {
    let mut client = IpcClient::connect()
        .await
        .map_err(|e| format!("Daemon socket connection failed: {e}"))?;

    match client.request(&IpcRequest::Unpair { peer: peer_id }).await {
        Ok(IpcResponse::Ok { .. }) => Ok(()),
        Ok(IpcResponse::Error { message, .. }) => Err(message),
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Unpair command error: {e}")),
    }
}

#[tauri::command]
pub async fn update_settings(settings: GuiSettingsPayload) -> Result<(), String> {
    // Placeholder to persist GUI settings into XDG config
    println!("Updated GUI settings: {:?}", settings);
    Ok(())
}
