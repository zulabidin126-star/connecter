use thiserror::Error;

/// Maximum allowed outer frame size on wire (default 65,000 bytes).
pub const MAX_FRAME_SIZE: usize = 65_000;
pub const HARD_MAX_FRAME_SIZE: usize = 65_535;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum FrameError {
    #[error("Frame length exceeds limit: {0} > {1}")]
    FrameTooLarge(usize, usize),
    #[error("Incomplete frame: expected at least {0} bytes, got {1}")]
    Incomplete(usize, usize),
    #[error("Buffer exhausted")]
    BufferExhausted,
}

/// Encodes a raw body into an outer frame prefixed with 2-byte big-endian length.
pub fn encode_frame(body: &[u8], out: &mut Vec<u8>) -> Result<(), FrameError> {
    if body.len() > MAX_FRAME_SIZE {
        return Err(FrameError::FrameTooLarge(body.len(), MAX_FRAME_SIZE));
    }
    let len = body.len() as u16;
    out.reserve(2 + body.len());
    out.extend_from_slice(&len.to_be_bytes());
    out.extend_from_slice(body);
    Ok(())
}

/// Attempts to decode a single outer frame from an input buffer.
/// Returns Ok(Some((frame_body, bytes_consumed))) if a complete frame is present.
/// If more bytes are needed, returns Ok(None).
pub fn decode_frame(buf: &[u8], max_size: usize) -> Result<Option<(&[u8], usize)>, FrameError> {
    if buf.len() < 2 {
        return Ok(None);
    }
    let len = u16::from_be_bytes([buf[0], buf[1]]) as usize;
    if len > max_size {
        return Err(FrameError::FrameTooLarge(len, max_size));
    }
    let total_len = 2 + len;
    if buf.len() < total_len {
        return Ok(None);
    }
    Ok(Some((&buf[2..total_len], total_len)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_decode_roundtrip() {
        let payload = b"hello loksync";
        let mut encoded = Vec::new();
        encode_frame(payload, &mut encoded).unwrap();
        assert_eq!(encoded.len(), 2 + payload.len());

        let decoded = decode_frame(&encoded, MAX_FRAME_SIZE).unwrap();
        assert!(decoded.is_some());
        let (body, consumed) = decoded.unwrap();
        assert_eq!(body, payload);
        assert_eq!(consumed, encoded.len());
    }

    #[test]
    fn test_partial_frame() {
        let mut buf = vec![0x00, 0x05, 0x01, 0x02]; // Length 5, but only 2 body bytes
        assert_eq!(decode_frame(&buf, MAX_FRAME_SIZE), Ok(None));
        buf.extend_from_slice(&[0x03, 0x04, 0x05]);
        let (body, consumed) = decode_frame(&buf, MAX_FRAME_SIZE).unwrap().unwrap();
        assert_eq!(body, &[1, 2, 3, 4, 5]);
        assert_eq!(consumed, 7);
    }

    #[test]
    fn test_oversized_frame_rejected() {
        let buf = vec![0xFF, 0xFF]; // 65535 > 65000 max size
        assert!(matches!(
            decode_frame(&buf, MAX_FRAME_SIZE),
            Err(FrameError::FrameTooLarge(65535, 65000))
        ));
    }
}
