use hkdf::Hkdf;
use lok_proto::handshake::{PairConfirmationPayload, Sig64};
use sha2::Sha256;
use spake2::{Ed25519Group, Identity, Password, Spake2};
use thiserror::Error;

use crate::aead::{open_symmetric, seal_symmetric, AeadError};
use crate::identity::{verify_signature, IdentityError, IdentityKey};

pub const ID_CLIENT: &[u8] = b"loksync-client";
pub const ID_SERVER: &[u8] = b"loksync-server";

#[derive(Debug, Error)]
pub enum SpakeError {
    #[error("SPAKE2 protocol error: {0}")]
    Protocol(String),
    #[error("Key derivation error: {0}")]
    Hkdf(String),
    #[error("AEAD encryption error: {0}")]
    Aead(#[from] AeadError),
    #[error("Postcard error: {0}")]
    Postcard(String),
    #[error("Identity verification error: {0}")]
    Identity(#[from] IdentityError),
}

/// Active SPAKE2 state for initiator (client) or responder (server).
pub enum SpakeState {
    Client(Spake2<Ed25519Group>),
    Server(Spake2<Ed25519Group>),
}

/// Starts the SPAKE2 exchange for the client (initiator).
/// Returns `(SpakeState, msg_a_bytes)`.
pub fn spake_start_client(password: &[u8]) -> (SpakeState, Vec<u8>) {
    let (spake, msg_a) = Spake2::<Ed25519Group>::start_a(
        &Password::new(password),
        &Identity::new(ID_CLIENT),
        &Identity::new(ID_SERVER),
    );
    (SpakeState::Client(spake), msg_a)
}

/// Starts the SPAKE2 exchange for the server (responder).
/// Returns `(SpakeState, msg_b_bytes)`.
pub fn spake_start_server(password: &[u8]) -> (SpakeState, Vec<u8>) {
    let (spake, msg_b) = Spake2::<Ed25519Group>::start_b(
        &Password::new(password),
        &Identity::new(ID_CLIENT),
        &Identity::new(ID_SERVER),
    );
    (SpakeState::Server(spake), msg_b)
}

/// Finishes the SPAKE2 exchange with peer's message and derives `K_pair` (16 bytes).
pub fn spake_finish(state: SpakeState, peer_msg: &[u8]) -> Result<[u8; 16], SpakeError> {
    let raw_key = match state {
        SpakeState::Client(spake) => spake
            .finish(peer_msg)
            .map_err(|e| SpakeError::Protocol(format!("{e:?}")))?,
        SpakeState::Server(spake) => spake
            .finish(peer_msg)
            .map_err(|e| SpakeError::Protocol(format!("{e:?}")))?,
    };

    // Derive 16-byte K_pair via HKDF-SHA256
    let hk = Hkdf::<Sha256>::new(None, &raw_key);
    let mut k_pair = [0u8; 16];
    hk.expand(b"lok pair key", &mut k_pair)
        .map_err(|e| SpakeError::Hkdf(format!("{e:?}")))?;
    Ok(k_pair)
}

/// Seals pairing confirmation: signs `(K_pair || device_name)` with `identity_key`,
/// then encrypts the payload using AES-128-GCM under `K_pair`.
pub fn create_pair_confirmation(
    k_pair: &[u8; 16],
    identity: &IdentityKey,
    device_name: &str,
    is_server: bool,
) -> Result<Vec<u8>, SpakeError> {
    let mut to_sign = Vec::with_capacity(16 + device_name.len());
    to_sign.extend_from_slice(k_pair);
    to_sign.extend_from_slice(device_name.as_bytes());
    let sig = identity.sign(&to_sign);

    let payload = PairConfirmationPayload {
        pubkey: identity.public_key_bytes(),
        device_name: device_name.to_string(),
        sig: Sig64(sig),
    };

    let serialized = postcard::to_stdvec(&payload)
        .map_err(|e| SpakeError::Postcard(e.to_string()))?;

    let nonce = if is_server { [0x02u8; 12] } else { [0x01u8; 12] };
    let aad = if is_server { b"LKPAIR_S" } else { b"LKPAIR_C" };

    let ciphertext = seal_symmetric(k_pair, &nonce, aad, &serialized)?;
    Ok(ciphertext)
}

/// Opens and validates a peer's pairing confirmation.
pub fn verify_pair_confirmation(
    k_pair: &[u8; 16],
    ciphertext: &[u8],
    is_server_verifying_client: bool,
) -> Result<PairConfirmationPayload, SpakeError> {
    let nonce = if is_server_verifying_client {
        [0x01u8; 12]
    } else {
        [0x02u8; 12]
    };
    let aad = if is_server_verifying_client {
        b"LKPAIR_C"
    } else {
        b"LKPAIR_S"
    };

    let plaintext = open_symmetric(k_pair, &nonce, aad, ciphertext)?;
    let payload: PairConfirmationPayload = postcard::from_bytes(&plaintext)
        .map_err(|e| SpakeError::Postcard(e.to_string()))?;

    let mut to_sign = Vec::with_capacity(16 + payload.device_name.len());
    to_sign.extend_from_slice(k_pair);
    to_sign.extend_from_slice(payload.device_name.as_bytes());

    verify_signature(&payload.pubkey, &to_sign, &payload.sig.0)?;
    Ok(payload)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_spake2_pairing_flow() {
        let pin = b"654321";
        let (client_state, msg_a) = spake_start_client(pin);
        let (server_state, msg_b) = spake_start_server(pin);

        let k_pair_client = spake_finish(client_state, &msg_b).unwrap();
        let k_pair_server = spake_finish(server_state, &msg_a).unwrap();
        assert_eq!(k_pair_client, k_pair_server);

        let client_id = IdentityKey::generate();
        let server_id = IdentityKey::generate();

        // Client confirms to server
        let client_conf = create_pair_confirmation(&k_pair_client, &client_id, "Pixel 8", false).unwrap();
        let verified_client = verify_pair_confirmation(&k_pair_server, &client_conf, true).unwrap();
        assert_eq!(verified_client.device_name, "Pixel 8");
        assert_eq!(verified_client.pubkey, client_id.public_key_bytes());

        // Server confirms to client
        let server_conf = create_pair_confirmation(&k_pair_server, &server_id, "ThinkPad", true).unwrap();
        let verified_server = verify_pair_confirmation(&k_pair_client, &server_conf, false).unwrap();
        assert_eq!(verified_server.device_name, "ThinkPad");
        assert_eq!(verified_server.pubkey, server_id.public_key_bytes());
    }
}
