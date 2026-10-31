use aes_gcm::{
    aead::{Aead, KeyInit, Payload},
    Aes128Gcm, Key, Nonce,
};
use thiserror::Error;
use zeroize::{Zeroize, ZeroizeOnDrop};

pub const DIR_CLIENT_TO_SERVER: u32 = 0x00000001;
pub const DIR_SERVER_TO_CLIENT: u32 = 0x00000002;
pub const MAX_NONCE_COUNTER: u64 = 0xFFFF_FFFF; // 2^32 limit for re-keying

#[derive(Debug, Error, PartialEq, Eq)]
pub enum AeadError {
    #[error("AES-128-GCM authentication failure or decryption error")]
    DecryptionFailed,
    #[error("Maximum nonce counter exceeded (requires re-keying)")]
    CounterExhausted,
    #[error("Ciphertext too short to contain 16-byte authentication tag")]
    CiphertextTooShort,
}

/// Computes the 12-byte (96-bit) nonce: dir (4 bytes BE) || counter (8 bytes BE).
pub fn build_nonce(dir: u32, counter: u64) -> [u8; 12] {
    let mut nonce = [0u8; 12];
    nonce[0..4].copy_from_slice(&dir.to_be_bytes());
    nonce[4..12].copy_from_slice(&counter.to_be_bytes());
    nonce
}

/// Computes the Associated Authenticated Data (AAD): b"LK1" || dir (1 byte).
pub fn build_aad(dir: u32) -> [u8; 4] {
    [b'L', b'K', b'1', dir as u8]
}

/// Bidirectional AEAD channel maintaining send and receive counters.
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct AeadChannel {
    key_send: [u8; 16],
    key_recv: [u8; 16],
    send_dir: u32,
    recv_dir: u32,
    send_counter: u64,
    recv_counter: u64,
}

impl AeadChannel {
    /// Creates a new AeadChannel with dedicated directional keys.
    /// - For Server: send_dir = DIR_SERVER_TO_CLIENT, recv_dir = DIR_CLIENT_TO_SERVER.
    /// - For Client: send_dir = DIR_CLIENT_TO_SERVER, recv_dir = DIR_SERVER_TO_CLIENT.
    pub fn new(key_send: [u8; 16], key_recv: [u8; 16], is_server: bool) -> Self {
        let (send_dir, recv_dir) = if is_server {
            (DIR_SERVER_TO_CLIENT, DIR_CLIENT_TO_SERVER)
        } else {
            (DIR_CLIENT_TO_SERVER, DIR_SERVER_TO_CLIENT)
        };
        Self {
            key_send,
            key_recv,
            send_dir,
            recv_dir,
            send_counter: 0,
            recv_counter: 0,
        }
    }

    /// Encrypts plaintext and appends the 16-byte GCM authentication tag.
    /// Increments the send counter.
    pub fn encrypt(&mut self, plaintext: &[u8]) -> Result<Vec<u8>, AeadError> {
        if self.send_counter >= MAX_NONCE_COUNTER {
            return Err(AeadError::CounterExhausted);
        }
        let nonce_bytes = build_nonce(self.send_dir, self.send_counter);
        let aad = build_aad(self.send_dir);

        let cipher = Aes128Gcm::new(Key::<Aes128Gcm>::from_slice(&self.key_send));
        let nonce = Nonce::from_slice(&nonce_bytes);
        let payload = Payload {
            msg: plaintext,
            aad: &aad,
        };

        let ciphertext = cipher
            .encrypt(nonce, payload)
            .map_err(|_| AeadError::DecryptionFailed)?;

        self.send_counter += 1;
        Ok(ciphertext)
    }

    /// Decrypts ciphertext (including 16-byte tag) and verifies authentication.
    /// Increments the receive counter.
    pub fn decrypt(&mut self, ciphertext: &[u8]) -> Result<Vec<u8>, AeadError> {
        if ciphertext.len() < 16 {
            return Err(AeadError::CiphertextTooShort);
        }
        if self.recv_counter >= MAX_NONCE_COUNTER {
            return Err(AeadError::CounterExhausted);
        }
        let nonce_bytes = build_nonce(self.recv_dir, self.recv_counter);
        let aad = build_aad(self.recv_dir);

        let cipher = Aes128Gcm::new(Key::<Aes128Gcm>::from_slice(&self.key_recv));
        let nonce = Nonce::from_slice(&nonce_bytes);
        let payload = Payload {
            msg: ciphertext,
            aad: &aad,
        };

        let plaintext = cipher
            .decrypt(nonce, payload)
            .map_err(|_| AeadError::DecryptionFailed)?;

        self.recv_counter += 1;
        Ok(plaintext)
    }

    pub fn send_counter(&self) -> u64 {
        self.send_counter
    }

    pub fn recv_counter(&self) -> u64 {
        self.recv_counter
    }
}

/// Standalone encryption with a 16-byte key and explicit 12-byte nonce/aad (used in pairing confirmation).
pub fn seal_symmetric(
    key: &[u8; 16],
    nonce: &[u8; 12],
    aad: &[u8],
    plaintext: &[u8],
) -> Result<Vec<u8>, AeadError> {
    let cipher = Aes128Gcm::new(Key::<Aes128Gcm>::from_slice(key));
    let n = Nonce::from_slice(nonce);
    let payload = Payload {
        msg: plaintext,
        aad,
    };
    cipher
        .encrypt(n, payload)
        .map_err(|_| AeadError::DecryptionFailed)
}

/// Standalone decryption with a 16-byte key and explicit 12-byte nonce/aad.
pub fn open_symmetric(
    key: &[u8; 16],
    nonce: &[u8; 12],
    aad: &[u8],
    ciphertext: &[u8],
) -> Result<Vec<u8>, AeadError> {
    if ciphertext.len() < 16 {
        return Err(AeadError::CiphertextTooShort);
    }
    let cipher = Aes128Gcm::new(Key::<Aes128Gcm>::from_slice(key));
    let n = Nonce::from_slice(nonce);
    let payload = Payload {
        msg: ciphertext,
        aad,
    };
    cipher
        .decrypt(n, payload)
        .map_err(|_| AeadError::DecryptionFailed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_aead_channel_bidirectional() {
        let key_c2s = [0x42u8; 16];
        let key_s2c = [0x99u8; 16];

        let mut client = AeadChannel::new(key_c2s, key_s2c, false);
        let mut server = AeadChannel::new(key_s2c, key_c2s, true);

        // Client -> Server
        let plain1 = b"Hello from phone!";
        let cipher1 = client.encrypt(plain1).unwrap();
        let decrypted1 = server.decrypt(&cipher1).unwrap();
        assert_eq!(plain1.as_slice(), decrypted1.as_slice());

        // Server -> Client
        let plain2 = b"Hello from laptop!";
        let cipher2 = server.encrypt(plain2).unwrap();
        let decrypted2 = client.decrypt(&cipher2).unwrap();
        assert_eq!(plain2.as_slice(), decrypted2.as_slice());

        // Counter tampering / out-of-order must fail
        assert!(server.decrypt(&cipher1).is_err());
    }
}
