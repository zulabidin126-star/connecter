use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "cmd", rename_all = "snake_case")]
pub enum IpcRequest {
    GetState,
    Subscribe,
    PairStart,
    PairCancel,
    Unpair { peer: String },
    ListPeers,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PeerInfo {
    pub id: String,
    pub name: String,
    pub online: bool,
    pub battery: Option<PeerBattery>,
    pub permissions: PeerPermissions,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct PeerBattery {
    pub percent: u8,
    pub charging: bool,
    pub ts: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct PeerPermissions {
    pub notifications: bool,
    pub battery: bool,
    pub commands: bool,
}

impl Default for PeerPermissions {
    fn default() -> Self {
        Self {
            notifications: true,
            battery: true,
            commands: false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StateSnapshot {
    pub daemon_version: String,
    pub device_id: String,
    pub device_name: String,
    pub local_battery: Option<PeerBattery>,
    pub peers: Vec<PeerInfo>,
    pub pairing_active: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "event", rename_all = "snake_case")]
pub enum IpcEvent {
    PeerOnline {
        peer: String,
        name: String,
    },
    PeerOffline {
        peer: String,
    },
    Battery {
        peer: String,
        percent: u8,
        charging: bool,
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
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum IpcResponse {
    Ok { status: String },
    State(StateSnapshot),
    Peers(Vec<PeerInfo>),
    Error { status: String, message: String },
}

impl IpcResponse {
    pub fn success() -> Self {
        IpcResponse::Ok {
            status: "ok".into(),
        }
    }

    pub fn err(msg: impl Into<String>) -> Self {
        IpcResponse::Error {
            status: "error".into(),
            message: msg.into(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ipc_json_serialization() {
        let req = IpcRequest::Subscribe;
        let json = serde_json::to_string(&req).unwrap();
        assert_eq!(json, r#"{"cmd":"subscribe"}"#);

        let unpair = IpcRequest::Unpair {
            peer: "deadbeef".into(),
        };
        let unpair_json = serde_json::to_string(&unpair).unwrap();
        assert_eq!(unpair_json, r#"{"cmd":"unpair","peer":"deadbeef"}"#);

        let evt = IpcEvent::Battery {
            peer: "a1b2c3d4".into(),
            percent: 82,
            charging: true,
        };
        let evt_json = serde_json::to_string(&evt).unwrap();
        assert_eq!(
            evt_json,
            r#"{"event":"battery","peer":"a1b2c3d4","percent":82,"charging":true}"#
        );
    }
}
