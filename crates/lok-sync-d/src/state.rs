use lok_crypto::IdentityKey;
use lok_proto::ipc::{PeerBattery, PeerInfo, PeerPermissions, StateSnapshot};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;
use tracing::{error, info};

pub const PAIRING_WINDOW_SECS: u64 = 120;
pub const MAX_PAIRING_FAILURES: usize = 3;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairedPeerRecord {
    pub peer_id: String,
    pub name: String,
    pub pubkey: [u8; 32],
    pub permissions: PeerPermissions,
    pub created_at: u64,
}

pub struct ActivePairing {
    pub pin: String,
    pub qr_secret: [u8; 16],
    pub expires_at: Instant,
    pub failed_attempts: usize,
}

pub struct AppState {
    pub identity: IdentityKey,
    pub device_name: String,
    pub peers: HashMap<String, PairedPeerRecord>,
    pub online_peers: HashMap<String, PeerBattery>,
    pub local_battery: Option<PeerBattery>,
    pub pairing: Option<ActivePairing>,
    data_dir: PathBuf,
}

pub type SharedState = Arc<RwLock<AppState>>;

impl AppState {
    pub fn init(device_name: Option<String>) -> Self {
        let data_dir = resolve_data_dir();
        std::fs::create_dir_all(&data_dir).ok();

        let identity = load_or_generate_identity(&data_dir);
        let peers = load_peers(&data_dir);

        let resolved_name = device_name
            .or_else(get_hostname)
            .unwrap_or_else(|| "Linux-Machine".into());

        Self {
            identity,
            device_name: resolved_name,
            peers,
            online_peers: HashMap::new(),
            local_battery: None,
            pairing: None,
            data_dir,
        }
    }

    pub fn device_id_hex(&self) -> String {
        self.identity.device_id_hex()
    }

    pub fn save_peers_to_disk(&self) {
        let path = self.data_dir.join("peers.json");
        let list: Vec<&PairedPeerRecord> = self.peers.values().collect();
        if let Ok(json) = serde_json::to_string_pretty(&list) {
            #[cfg(unix)]
            {
                use std::fs::OpenOptions;
                use std::io::Write;
                use std::os::unix::fs::OpenOptionsExt;
                if let Ok(mut f) = OpenOptions::new()
                    .write(true)
                    .create(true)
                    .truncate(true)
                    .mode(0o600)
                    .open(&path)
                {
                    f.write_all(json.as_bytes()).ok();
                }
            }
            #[cfg(not(unix))]
            {
                std::fs::write(&path, json).ok();
            }
        }
    }

    pub fn add_peer(&mut self, record: PairedPeerRecord) {
        info!(peer_id = %record.peer_id, name = %record.name, "Peer paired and pinned");
        self.peers.insert(record.peer_id.clone(), record);
        self.save_peers_to_disk();
    }

    pub fn remove_peer(&mut self, peer_id: &str) -> bool {
        let removed = self.peers.remove(peer_id).is_some();
        if removed {
            self.online_peers.remove(peer_id);
            self.save_peers_to_disk();
            info!(peer_id = %peer_id, "Peer removed / revoked");
        }
        removed
    }

    pub fn start_pairing(&mut self, ip: &str, port: u16) -> (String, String) {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let pin = format!("{:06}", rng.gen_range(0..1_000_000));
        let mut qr_secret = [0u8; 16];
        rand::RngCore::fill_bytes(&mut rng, &mut qr_secret);

        let qr_secret_hex = hex::encode(qr_secret);
        let my_id = self.device_id_hex();

        // QR format: loksync://pair?id=<id>&ip=<ip>&port=<port>&secret=<qr_secret>&name=<name>
        let qr = format!(
            "loksync://pair?id={my_id}&ip={ip}&port={port}&secret={qr_secret_hex}&pin={pin}&name={}",
            urlencoding::encode(&self.device_name)
        );

        self.pairing = Some(ActivePairing {
            pin: pin.clone(),
            qr_secret,
            expires_at: Instant::now() + Duration::from_secs(PAIRING_WINDOW_SECS),
            failed_attempts: 0,
        });

        (pin, qr)
    }

    pub fn is_pairing_open(&mut self) -> bool {
        if let Some(ref p) = self.pairing {
            if Instant::now() > p.expires_at || p.failed_attempts >= MAX_PAIRING_FAILURES {
                self.pairing = None;
                return false;
            }
            true
        } else {
            false
        }
    }

    pub fn record_pairing_failure(&mut self) {
        if let Some(ref mut p) = self.pairing {
            p.failed_attempts += 1;
            if p.failed_attempts >= MAX_PAIRING_FAILURES {
                info!("Pairing window closed: max failures reached");
                self.pairing = None;
            }
        }
    }

    pub fn cancel_pairing(&mut self) {
        self.pairing = None;
    }

    pub fn set_peer_online(&mut self, peer_id: &str, online: bool) {
        if !online {
            self.online_peers.remove(peer_id);
        } else if let Some(rec) = self.peers.get(peer_id) {
            self.online_peers.entry(rec.peer_id.clone()).or_insert(PeerBattery {
                percent: 0,
                charging: false,
                ts: 0,
            });
        }
    }

    pub fn update_peer_battery(&mut self, peer_id: &str, percent: u8, charging: bool, ts: u64) {
        self.online_peers.insert(
            peer_id.to_string(),
            PeerBattery {
                percent,
                charging,
                ts,
            },
        );
    }

    pub fn update_local_battery(&mut self, percent: u8, charging: bool) {
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        self.local_battery = Some(PeerBattery {
            percent,
            charging,
            ts,
        });
    }

    pub fn snapshot(&self) -> StateSnapshot {
        let mut peers = Vec::new();
        for peer in self.peers.values() {
            let online = self.online_peers.contains_key(&peer.peer_id);
            let battery = self.online_peers.get(&peer.peer_id).copied();
            peers.push(PeerInfo {
                id: peer.peer_id.clone(),
                name: peer.name.clone(),
                online,
                battery,
                permissions: peer.permissions,
            });
        }

        StateSnapshot {
            daemon_version: env!("CARGO_PKG_VERSION").into(),
            device_id: self.device_id_hex(),
            device_name: self.device_name.clone(),
            local_battery: self.local_battery,
            peers,
            pairing_active: self.pairing.as_ref().is_some_and(|p| Instant::now() < p.expires_at),
        }
    }
}

fn resolve_data_dir() -> PathBuf {
    if let Ok(xdg) = std::env::var("XDG_DATA_HOME") {
        PathBuf::from(xdg).join("lok-sync")
    } else if let Ok(home) = std::env::var("HOME") {
        PathBuf::from(home).join(".local/share/lok-sync")
    } else {
        PathBuf::from("./lok-sync-data")
    }
}

fn load_or_generate_identity(data_dir: &std::path::Path) -> IdentityKey {
    let key_path = data_dir.join("identity.key");
    if key_path.exists() {
        match IdentityKey::load_from_file(&key_path) {
            Ok(k) => return k,
            Err(e) => error!("Failed to load existing identity key from {:?}: {e}", key_path),
        }
    }
    let key = IdentityKey::generate();
    if let Err(e) = key.save_to_file(&key_path) {
        error!("Failed to save new identity key to {:?}: {e}", key_path);
    }
    key
}

fn load_peers(data_dir: &std::path::Path) -> HashMap<String, PairedPeerRecord> {
    let mut map = HashMap::new();
    let peers_path = data_dir.join("peers.json");
    if peers_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&peers_path) {
            if let Ok(list) = serde_json::from_str::<Vec<PairedPeerRecord>>(&content) {
                for rec in list {
                    map.insert(rec.peer_id.clone(), rec);
                }
            }
        }
    }
    map
}

fn get_hostname() -> Option<String> {
    std::fs::read_to_string("/etc/hostname")
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

mod urlencoding {
    pub fn encode(s: &str) -> String {
        let mut out = String::new();
        for b in s.bytes() {
            if b.is_ascii_alphanumeric() || b == b'-' || b == b'_' || b == b'.' || b == b'~' {
                out.push(b as char);
            } else {
                out.push_str(&format!("%{:02X}", b));
            }
        }
        out
    }
}
