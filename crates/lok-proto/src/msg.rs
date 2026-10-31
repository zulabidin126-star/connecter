use serde::{Deserialize, Serialize};
use thiserror::Error;

pub const TYPE_PING: u8 = 0x01;
pub const TYPE_PONG: u8 = 0x02;
pub const TYPE_BATTERY_UPDATE: u8 = 0x10;
pub const TYPE_NOTIF_POST: u8 = 0x20;
pub const TYPE_NOTIF_DISMISS: u8 = 0x21;
pub const TYPE_NOTIF_ACTION: u8 = 0x22;
pub const TYPE_CMD_RUN: u8 = 0x30;
pub const TYPE_CMD_RESULT: u8 = 0x31;
pub const TYPE_ERROR: u8 = 0x7F;

pub const FLAG_OPTIONAL: u8 = 0x01;

pub const MAX_APP_NAME_LEN: usize = 128;
pub const MAX_TITLE_LEN: usize = 256;
pub const MAX_BODY_LEN: usize = 16 * 1024; // 16 KiB
pub const MAX_ICON_LEN: usize = 32 * 1024; // 32 KiB
pub const MAX_CMD_ARGS: usize = 8;
pub const MAX_CMD_ARG_LEN: usize = 256;
pub const MAX_CMD_OUT_LEN: usize = 4 * 1024; // 4 KiB

#[derive(Debug, Error, PartialEq, Eq)]
pub enum MsgError {
    #[error("Postcard encoding error: {0}")]
    Encoding(String),
    #[error("Postcard decoding error: {0}")]
    Decoding(String),
    #[error("Frame too short for message header")]
    TruncatedHeader,
    #[error("Unknown message type: 0x{0:02X}")]
    UnknownType(u8),
    #[error("Validation failed: {0}")]
    Validation(String),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NotifPost {
    pub id: u32,
    pub app: String,
    pub title: String,
    pub body: String,
    pub icon: Option<Vec<u8>>,
    pub actions: Vec<String>,
    pub ts: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Msg {
    Ping(u64),
    Pong(u64),
    BatteryUpdate {
        percent: u8,
        charging: bool,
        ts: u64,
    },
    NotifPost(NotifPost),
    NotifDismiss {
        id: u32,
    },
    NotifAction {
        id: u32,
        action: String,
        reply: Option<String>,
    },
    CmdRun {
        req_id: u32,
        name: String,
        args: Vec<String>,
    },
    CmdResult {
        req_id: u32,
        code: i32,
        out: Vec<u8>,
    },
    Error {
        code: u16,
        msg: String,
    },
}

impl Msg {
    pub fn msg_type(&self) -> u8 {
        match self {
            Msg::Ping(_) => TYPE_PING,
            Msg::Pong(_) => TYPE_PONG,
            Msg::BatteryUpdate { .. } => TYPE_BATTERY_UPDATE,
            Msg::NotifPost(_) => TYPE_NOTIF_POST,
            Msg::NotifDismiss { .. } => TYPE_NOTIF_DISMISS,
            Msg::NotifAction { .. } => TYPE_NOTIF_ACTION,
            Msg::CmdRun { .. } => TYPE_CMD_RUN,
            Msg::CmdResult { .. } => TYPE_CMD_RESULT,
            Msg::Error { .. } => TYPE_ERROR,
        }
    }

    pub fn validate(&self) -> Result<(), MsgError> {
        match self {
            Msg::BatteryUpdate { percent, .. } => {
                if *percent > 100 {
                    return Err(MsgError::Validation(format!(
                        "Battery percent {percent} > 100"
                    )));
                }
            }
            Msg::NotifPost(notif) => {
                if notif.app.len() > MAX_APP_NAME_LEN {
                    return Err(MsgError::Validation("App name exceeds limit".into()));
                }
                if notif.title.len() > MAX_TITLE_LEN {
                    return Err(MsgError::Validation("Title exceeds limit".into()));
                }
                if notif.body.len() > MAX_BODY_LEN {
                    return Err(MsgError::Validation("Body exceeds limit".into()));
                }
                if let Some(ref icon) = notif.icon {
                    if icon.len() > MAX_ICON_LEN {
                        return Err(MsgError::Validation("Icon exceeds limit".into()));
                    }
                }
                if notif.actions.len() > 10 {
                    return Err(MsgError::Validation("Too many actions".into()));
                }
                for act in &notif.actions {
                    if act.len() > 128 {
                        return Err(MsgError::Validation("Action name exceeds limit".into()));
                    }
                }
            }
            Msg::CmdRun { args, name, .. } => {
                if name.len() > 64 {
                    return Err(MsgError::Validation("Command name exceeds limit".into()));
                }
                if args.len() > MAX_CMD_ARGS {
                    return Err(MsgError::Validation(format!(
                        "Command arguments count {} > {MAX_CMD_ARGS}",
                        args.len()
                    )));
                }
                for arg in args {
                    if arg.len() > MAX_CMD_ARG_LEN {
                        return Err(MsgError::Validation("Command argument exceeds 256 bytes".into()));
                    }
                }
            }
            Msg::CmdResult { out, .. } if out.len() > MAX_CMD_OUT_LEN => {
                return Err(MsgError::Validation("Command output exceeds 4 KiB".into()));
            }
            _ => {}
        }
        Ok(())
    }

    /// Encodes this message into `[type: u8, flags: u8, postcard_payload]`.
    pub fn encode(&self, flags: u8) -> Result<Vec<u8>, MsgError> {
        self.validate()?;
        let type_byte = self.msg_type();
        let payload = match self {
            Msg::Ping(nonce) => postcard::to_stdvec(nonce),
            Msg::Pong(nonce) => postcard::to_stdvec(nonce),
            Msg::BatteryUpdate { percent, charging, ts } => {
                postcard::to_stdvec(&(percent, charging, ts))
            }
            Msg::NotifPost(notif) => postcard::to_stdvec(notif),
            Msg::NotifDismiss { id } => postcard::to_stdvec(id),
            Msg::NotifAction { id, action, reply } => postcard::to_stdvec(&(id, action, reply)),
            Msg::CmdRun { req_id, name, args } => postcard::to_stdvec(&(req_id, name, args)),
            Msg::CmdResult { req_id, code, out } => postcard::to_stdvec(&(req_id, code, out)),
            Msg::Error { code, msg } => postcard::to_stdvec(&(code, msg)),
        }
        .map_err(|e| MsgError::Encoding(e.to_string()))?;

        let mut buf = Vec::with_capacity(2 + payload.len());
        buf.push(type_byte);
        buf.push(flags);
        buf.extend_from_slice(&payload);
        Ok(buf)
    }

    /// Decodes a plaintext message from `[type: u8, flags: u8, postcard_payload]`.
    pub fn decode(bytes: &[u8]) -> Result<Self, MsgError> {
        if bytes.len() < 2 {
            return Err(MsgError::TruncatedHeader);
        }
        let type_byte = bytes[0];
        let flags = bytes[1];
        let payload = &bytes[2..];

        let msg = match type_byte {
            TYPE_PING => {
                let nonce: u64 = postcard::from_bytes(payload)
                    .map_err(|e| MsgError::Decoding(e.to_string()))?;
                Msg::Ping(nonce)
            }
            TYPE_PONG => {
                let nonce: u64 = postcard::from_bytes(payload)
                    .map_err(|e| MsgError::Decoding(e.to_string()))?;
                Msg::Pong(nonce)
            }
            TYPE_BATTERY_UPDATE => {
                let (percent, charging, ts): (u8, bool, u64) = postcard::from_bytes(payload)
                    .map_err(|e| MsgError::Decoding(e.to_string()))?;
                Msg::BatteryUpdate { percent, charging, ts }
            }
            TYPE_NOTIF_POST => {
                let notif: NotifPost = postcard::from_bytes(payload)
                    .map_err(|e| MsgError::Decoding(e.to_string()))?;
                Msg::NotifPost(notif)
            }
            TYPE_NOTIF_DISMISS => {
                let id: u32 = postcard::from_bytes(payload)
                    .map_err(|e| MsgError::Decoding(e.to_string()))?;
                Msg::NotifDismiss { id }
            }
            TYPE_NOTIF_ACTION => {
                let (id, action, reply): (u32, String, Option<String>) =
                    postcard::from_bytes(payload)
                        .map_err(|e| MsgError::Decoding(e.to_string()))?;
                Msg::NotifAction { id, action, reply }
            }
            TYPE_CMD_RUN => {
                let (req_id, name, args): (u32, String, Vec<String>) =
                    postcard::from_bytes(payload)
                        .map_err(|e| MsgError::Decoding(e.to_string()))?;
                Msg::CmdRun { req_id, name, args }
            }
            TYPE_CMD_RESULT => {
                let (req_id, code, out): (u32, i32, Vec<u8>) = postcard::from_bytes(payload)
                    .map_err(|e| MsgError::Decoding(e.to_string()))?;
                Msg::CmdResult { req_id, code, out }
            }
            TYPE_ERROR => {
                let (code, msg): (u16, String) = postcard::from_bytes(payload)
                    .map_err(|e| MsgError::Decoding(e.to_string()))?;
                Msg::Error { code, msg }
            }
            unknown => {
                if flags & FLAG_OPTIONAL != 0 {
                    // Ignored optional extension message
                    return Err(MsgError::UnknownType(unknown));
                }
                return Err(MsgError::UnknownType(unknown));
            }
        };

        msg.validate()?;
        Ok(msg)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_battery_roundtrip() {
        let msg = Msg::BatteryUpdate {
            percent: 85,
            charging: true,
            ts: 1698765432,
        };
        let encoded = msg.encode(0).unwrap();
        let decoded = Msg::decode(&encoded).unwrap();
        assert_eq!(msg, decoded);
    }

    #[test]
    fn test_notif_roundtrip() {
        let notif = NotifPost {
            id: 42,
            app: "Signal".into(),
            title: "Alice".into(),
            body: "Hey there!".into(),
            icon: Some(vec![1, 2, 3, 4]),
            actions: vec!["reply".into(), "mark_read".into()],
            ts: 123456,
        };
        let msg = Msg::NotifPost(notif);
        let encoded = msg.encode(0).unwrap();
        let decoded = Msg::decode(&encoded).unwrap();
        assert_eq!(msg, decoded);
    }

    #[test]
    fn test_validation_rejects_oversized() {
        let msg = Msg::BatteryUpdate {
            percent: 101, // invalid
            charging: false,
            ts: 0,
        };
        assert!(msg.encode(0).is_err());
    }
}
