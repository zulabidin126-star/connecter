use lok_proto::ipc::{PeerInfo, StateSnapshot};
use std::time::Instant;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Tab {
    Dashboard,
    Notifications,
    Settings,
}

#[derive(Debug, Clone)]
pub struct GuiNotification {
    #[allow(dead_code)]
    pub id: u32,
    pub app: String,
    pub title: String,
    pub body: String,
    #[allow(dead_code)]
    pub peer_id: String,
    pub peer_name: String,
    pub time_str: String,
}

#[derive(Debug, Clone)]
pub struct PairingDialogState {
    pub is_open: bool,
    pub pin: String,
    pub qr_data: String,
    pub started_at: Instant,
    pub total_seconds: u64,
    pub status_message: String,
}

impl Default for PairingDialogState {
    fn default() -> Self {
        Self {
            is_open: false,
            pin: String::new(),
            qr_data: String::new(),
            started_at: Instant::now(),
            total_seconds: 120,
            status_message: "Waiting for device to connect...".into(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct GuiSettings {
    pub autostart: bool,
    pub plain_text_only: bool,
    pub hide_body_when_locked: bool,
    pub device_name: String,
    pub port: u16,
}

impl Default for GuiSettings {
    fn default() -> Self {
        Self {
            autostart: true,
            plain_text_only: true,
            hide_body_when_locked: true,
            device_name: "Linux-Machine".into(),
            port: 47100,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConnectionStatus {
    Connected,
    Connecting,
    Disconnected,
}

pub struct AppViewModel {
    pub current_tab: Tab,
    pub connection_status: ConnectionStatus,
    pub snapshot: Option<StateSnapshot>,
    pub notifications: Vec<GuiNotification>,
    pub pairing_dialog: PairingDialogState,
    pub settings: GuiSettings,
    pub search_query: String,
    pub toast_message: Option<(String, Instant)>,
}

impl Default for AppViewModel {
    fn default() -> Self {
        Self {
            current_tab: Tab::Dashboard,
            connection_status: ConnectionStatus::Connecting,
            snapshot: None,
            notifications: Vec::new(),
            pairing_dialog: PairingDialogState::default(),
            settings: GuiSettings::default(),
            search_query: String::new(),
            toast_message: None,
        }
    }
}

impl AppViewModel {
    pub fn set_toast(&mut self, msg: impl Into<String>) {
        self.toast_message = Some((msg.into(), Instant::now()));
    }

    #[allow(dead_code)]
    pub fn active_peers(&self) -> Vec<&PeerInfo> {
        if let Some(ref s) = self.snapshot {
            s.peers.iter().filter(|p| p.online).collect()
        } else {
            Vec::new()
        }
    }

    pub fn all_peers(&self) -> &[PeerInfo] {
        if let Some(ref s) = self.snapshot {
            &s.peers
        } else {
            &[]
        }
    }
}
