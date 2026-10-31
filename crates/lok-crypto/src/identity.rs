use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use rand::rngs::OsRng;
use sha2::{Digest, Sha256};
use thiserror::Error;
use zeroize::ZeroizeOnDrop;

#[derive(Debug, Error)]
pub enum IdentityError {
    #[error("Invalid public key: {0}")]
    InvalidPublicKey(String),
    #[error("Invalid secret key bytes")]
    InvalidSecretKey,
    #[error("Invalid signature: {0}")]
    InvalidSignature(String),
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Hex decoding error: {0}")]
    Hex(#[from] hex::FromHexError),
}

#[derive(ZeroizeOnDrop)]
pub struct IdentityKey {
    #[zeroize(skip)]
    signing_key: SigningKey,
}

impl IdentityKey {
    /// Generates a fresh Ed25519 identity keypair using OS entropy.
    pub fn generate() -> Self {
        let mut csprng = OsRng;
        let signing_key = SigningKey::generate(&mut csprng);
        Self { signing_key }
    }

    /// Loads an identity key from raw 32 secret key bytes.
    pub fn from_bytes(bytes: &[u8; 32]) -> Self {
        let signing_key = SigningKey::from_bytes(bytes);
        Self { signing_key }
    }

    /// Exports the 32 raw secret key bytes.
    pub fn to_bytes(&self) -> [u8; 32] {
        self.signing_key.to_bytes()
    }

    /// Returns the Ed25519 verifying (public) key.
    pub fn verifying_key(&self) -> VerifyingKey {
        self.signing_key.verifying_key()
    }

    /// Returns the 32-byte public key.
    pub fn public_key_bytes(&self) -> [u8; 32] {
        self.verifying_key().to_bytes()
    }

    /// Returns the 8-byte device ID derived from SHA-256 of the public key.
    pub fn device_id_bytes(&self) -> [u8; 8] {
        derive_device_id_bytes(&self.public_key_bytes())
    }

    /// Returns the 8-character hex ID (e.g. "a1b2c3d4") as specified in §3.2.
    pub fn device_id_hex(&self) -> String {
        derive_device_id_hex(&self.public_key_bytes())
    }

    /// Signs an arbitrary message (e.g. handshake transcript).
    pub fn sign(&self, message: &[u8]) -> [u8; 64] {
        self.signing_key.sign(message).to_bytes()
    }

    /// Saves the secret key to a file with mode 0600.
    #[cfg(unix)]
    pub fn save_to_file<P: AsRef<std::path::Path>>(&self, path: P) -> Result<(), IdentityError> {
        use std::fs::OpenOptions;
        use std::io::Write;
        use std::os::unix::fs::OpenOptionsExt;

        let path = path.as_ref();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .mode(0o600)
            .open(path)?;

        let hex_encoded = hex::encode(self.to_bytes());
        file.write_all(hex_encoded.as_bytes())?;
        file.flush()?;
        Ok(())
    }

    /// Loads the secret key from a hex-encoded file.
    pub fn load_from_file<P: AsRef<std::path::Path>>(path: P) -> Result<Self, IdentityError> {
        let content = std::fs::read_to_string(path)?;
        let bytes = hex::decode(content.trim())?;
        if bytes.len() != 32 {
            return Err(IdentityError::InvalidSecretKey);
        }
        let mut key_bytes = [0u8; 32];
        key_bytes.copy_from_slice(&bytes);
        Ok(Self::from_bytes(&key_bytes))
    }
}

/// Computes the 8-byte device ID from a 32-byte Ed25519 public key.
pub fn derive_device_id_bytes(pubkey: &[u8; 32]) -> [u8; 8] {
    let mut hasher = Sha256::new();
    hasher.update(pubkey);
    let hash = hasher.finalize();
    let mut id = [0u8; 8];
    id.copy_from_slice(&hash[..8]);
    id
}

/// Computes the 8-character hex device ID (first 4 bytes of SHA-256 in hex).
pub fn derive_device_id_hex(pubkey: &[u8; 32]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(pubkey);
    let hash = hasher.finalize();
    hex::encode(&hash[..4])
}

/// Verifies a signature against an Ed25519 public key.
pub fn verify_signature(
    pubkey_bytes: &[u8; 32],
    message: &[u8],
    sig_bytes: &[u8; 64],
) -> Result<(), IdentityError> {
    let verifying_key = VerifyingKey::from_bytes(pubkey_bytes)
        .map_err(|e| IdentityError::InvalidPublicKey(e.to_string()))?;
    let signature = Signature::from_bytes(sig_bytes);
    verifying_key
        .verify(message, &signature)
        .map_err(|e| IdentityError::InvalidSignature(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_identity_sign_verify() {
        let id = IdentityKey::generate();
        let pubkey = id.public_key_bytes();
        let msg = b"transcript-test-123";
        let sig = id.sign(msg);

        assert!(verify_signature(&pubkey, msg, &sig).is_ok());
        assert!(verify_signature(&pubkey, b"wrong-msg", &sig).is_err());
    }

    #[test]
    fn test_device_id_hex() {
        let id = IdentityKey::generate();
        let hex_id = id.device_id_hex();
        assert_eq!(hex_id.len(), 8);
    }
}
