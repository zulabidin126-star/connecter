use serde::{Deserialize, Serialize};
use std::ops::Deref;
use thiserror::Error;

pub const MAGIC: &[u8; 2] = b"LK";
pub const PROTO_VERSION: u8 = 1;

pub const TYPE_PAIR_MSG_A: u8 = 0x80;
pub const TYPE_PAIR_MSG_B: u8 = 0x81;
pub const TYPE_PAIR_CONFIRM_CLIENT: u8 = 0x82;
pub const TYPE_PAIR_CONFIRM_SERVER: u8 = 0x83;

pub const TYPE_SESSION_HELLO_CLIENT: u8 = 0x90;
pub const TYPE_SESSION_HELLO_SERVER: u8 = 0x91;
pub const TYPE_SESSION_AUTH_CLIENT: u8 = 0x92;

/// A 64-byte signature wrapper that works seamlessly with Serde and Postcard.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Sig64(pub [u8; 64]);

impl Deref for Sig64 {
    type Target = [u8; 64];
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl AsRef<[u8; 64]> for Sig64 {
    fn as_ref(&self) -> &[u8; 64] {
        &self.0
    }
}

impl From<[u8; 64]> for Sig64 {
    fn from(arr: [u8; 64]) -> Self {
        Sig64(arr)
    }
}

impl Serialize for Sig64 {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_bytes(&self.0)
    }
}

impl<'de> Deserialize<'de> for Sig64 {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        struct Visitor;
        impl<'de> serde::de::Visitor<'de> for Visitor {
            type Value = Sig64;
            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                formatter.write_str("a 64-byte signature")
            }
            fn visit_bytes<E>(self, v: &[u8]) -> Result<Self::Value, E>
            where
                E: serde::de::Error,
            {
                if v.len() == 64 {
                    let mut arr = [0u8; 64];
                    arr.copy_from_slice(v);
                    Ok(Sig64(arr))
                } else {
                    Err(E::invalid_length(v.len(), &self))
                }
            }
            fn visit_seq<A>(self, mut seq: A) -> Result<Self::Value, A::Error>
            where
                A: serde::de::SeqAccess<'de>,
            {
                let mut arr = [0u8; 64];
                for (i, slot) in arr.iter_mut().enumerate() {
                    *slot = seq
                        .next_element()?
                        .ok_or_else(|| serde::de::Error::invalid_length(i, &self))?;
                }
                Ok(Sig64(arr))
            }
        }
        deserializer.deserialize_bytes(Visitor)
    }
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum HandshakeError {
    #[error("Invalid magic header: expected 'LK'")]
    InvalidMagic,
    #[error("Handshake frame too short")]
    TooShort,
    #[error("Postcard encoding error: {0}")]
    Encoding(String),
    #[error("Postcard decoding error: {0}")]
    Decoding(String),
    #[error("Unsupported protocol version: {0}")]
    UnsupportedVersion(u8),
    #[error("Unknown handshake message type: 0x{0:02X}")]
    UnknownType(u8),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HelloClient {
    pub ver: u8,
    pub id_c: [u8; 8],
    pub eph_pub_c: [u8; 32],
    pub rand_c: [u8; 32],
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HelloServer {
    pub ver: u8,
    pub id_s: [u8; 8],
    pub eph_pub_s: [u8; 32],
    pub rand_s: [u8; 32],
    pub sig_s: Sig64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AuthClient {
    pub sig_c: Sig64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PairConfirmationPayload {
    pub pubkey: [u8; 32],
    pub device_name: String,
    pub sig: Sig64,
}

/// Encloses handshake messages in `[b"LK", type: u8, postcard_payload]`.
pub fn encode_handshake_frame<T: Serialize>(
    msg_type: u8,
    payload: &T,
) -> Result<Vec<u8>, HandshakeError> {
    let bytes = postcard::to_stdvec(payload).map_err(|e| HandshakeError::Encoding(e.to_string()))?;
    let mut out = Vec::with_capacity(3 + bytes.len());
    out.extend_from_slice(MAGIC);
    out.push(msg_type);
    out.extend_from_slice(&bytes);
    Ok(out)
}

/// Decodes the header of a handshake frame and returns `(msg_type, payload_bytes)`.
pub fn decode_handshake_header(raw: &[u8]) -> Result<(u8, &[u8]), HandshakeError> {
    if raw.len() < 3 {
        return Err(HandshakeError::TooShort);
    }
    if &raw[0..2] != MAGIC {
        return Err(HandshakeError::InvalidMagic);
    }
    let msg_type = raw[2];
    Ok((msg_type, &raw[3..]))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_handshake_encoding() {
        let hello = HelloClient {
            ver: 1,
            id_c: [1; 8],
            eph_pub_c: [2; 32],
            rand_c: [3; 32],
        };
        let encoded = encode_handshake_frame(TYPE_SESSION_HELLO_CLIENT, &hello).unwrap();
        assert_eq!(&encoded[0..2], b"LK");
        assert_eq!(encoded[2], TYPE_SESSION_HELLO_CLIENT);

        let (t, payload) = decode_handshake_header(&encoded).unwrap();
        assert_eq!(t, TYPE_SESSION_HELLO_CLIENT);
        let decoded: HelloClient = postcard::from_bytes(payload).unwrap();
        assert_eq!(hello, decoded);
    }

    #[test]
    fn test_sig64_serde() {
        let sig = Sig64([0x42; 64]);
        let bytes = postcard::to_stdvec(&sig).unwrap();
        let decoded: Sig64 = postcard::from_bytes(&bytes).unwrap();
        assert_eq!(sig, decoded);
    }
}
