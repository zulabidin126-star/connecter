use hkdf::Hkdf;
use rand::rngs::OsRng;
use sha2::{Digest, Sha256};
use thiserror::Error;
use x25519_dalek::{PublicKey as XPublicKey, StaticSecret};
use zeroize::ZeroizeOnDrop;

#[derive(Debug, Error)]
pub enum SessionKeyError {
    #[error("HKDF key derivation error")]
    Hkdf(String),
}

/// Holds an ephemeral X25519 keypair for forward-secret session establishment.
#[derive(ZeroizeOnDrop)]
pub struct EphemeralKey {
    secret: StaticSecret,
}

impl EphemeralKey {
    /// Generates a fresh ephemeral X25519 secret key.
    pub fn generate() -> Self {
        let rng = OsRng;
        let secret = StaticSecret::random_from_rng(rng);
        Self { secret }
    }

    /// Returns the public key bytes for this ephemeral secret.
    pub fn public_key_bytes(&self) -> [u8; 32] {
        XPublicKey::from(&self.secret).to_bytes()
    }

    /// Performs Diffie-Hellman with peer's ephemeral public key.
    pub fn diffie_hellman(self, peer_pubkey: &[u8; 32]) -> [u8; 32] {
        let peer_x = XPublicKey::from(*peer_pubkey);
        self.secret.diffie_hellman(&peer_x).to_bytes()
    }
}

/// Generates 32 bytes of cryptographic randomness for session nonces.
pub fn generate_random_32() -> [u8; 32] {
    use rand::RngCore;
    let mut rand = [0u8; 32];
    OsRng.fill_bytes(&mut rand);
    rand
}

/// Accumulates handshake transcript bytes and computes SHA-256 hashes.
#[derive(Clone, Default)]
pub struct TranscriptHasher {
    hasher: Sha256,
}

impl TranscriptHasher {
    pub fn new() -> Self {
        Self {
            hasher: Sha256::new(),
        }
    }

    pub fn update(&mut self, data: &[u8]) {
        self.hasher.update(data);
    }

    pub fn current_hash(&self) -> [u8; 32] {
        let cloned = self.hasher.clone();
        let result = cloned.finalize();
        let mut out = [0u8; 32];
        out.copy_from_slice(&result);
        out
    }
}

/// Derives `(k_c2s, k_s2c)` session keys using HKDF (SHA-256) per §3.5:
/// PRK = HKDF-Extract(salt = rand_c || rand_s, shared_dh)
/// k_c2s = HKDF-Expand(PRK, "lok c2s", 16)
/// k_s2c = HKDF-Expand(PRK, "lok s2c", 16)
pub fn derive_session_keys(
    shared_dh: &[u8; 32],
    rand_c: &[u8; 32],
    rand_s: &[u8; 32],
) -> Result<([u8; 16], [u8; 16]), SessionKeyError> {
    let mut salt = [0u8; 64];
    salt[0..32].copy_from_slice(rand_c);
    salt[32..64].copy_from_slice(rand_s);

    let hk = Hkdf::<Sha256>::new(Some(&salt), shared_dh);

    let mut k_c2s = [0u8; 16];
    let mut k_s2c = [0u8; 16];

    hk.expand(b"lok c2s", &mut k_c2s)
        .map_err(|e| SessionKeyError::Hkdf(format!("{e:?}")))?;

    hk.expand(b"lok s2c", &mut k_s2c)
        .map_err(|e| SessionKeyError::Hkdf(format!("{e:?}")))?;

    Ok((k_c2s, k_s2c))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ephemeral_dh_and_key_derivation() {
        let client_eph = EphemeralKey::generate();
        let server_eph = EphemeralKey::generate();

        let client_pub = client_eph.public_key_bytes();
        let server_pub = server_eph.public_key_bytes();

        let rand_c = generate_random_32();
        let rand_s = generate_random_32();

        let shared_client = client_eph.diffie_hellman(&server_pub);
        let shared_server = server_eph.diffie_hellman(&client_pub);
        assert_eq!(shared_client, shared_server);

        let (c_c2s, c_s2c) = derive_session_keys(&shared_client, &rand_c, &rand_s).unwrap();
        let (s_c2s, s_s2c) = derive_session_keys(&shared_server, &rand_c, &rand_s).unwrap();

        assert_eq!(c_c2s, s_c2s);
        assert_eq!(c_s2c, s_s2c);
        assert_ne!(c_c2s, c_s2c);
    }
}
