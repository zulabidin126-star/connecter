use crate::config::Config;
use crate::state::{PairedPeerRecord, SharedState};
use crate::svc::battery::BatteryState;
use crate::svc::command::execute_command;
use crate::svc::notify::{NotifReturnEvent, NotifyService};
use lok_crypto::{
    create_pair_confirmation, derive_session_keys, spake_finish, spake_start_server,
    verify_pair_confirmation, verify_signature, AeadChannel, EphemeralKey, TranscriptHasher,
};
use lok_proto::frame::{decode_frame, encode_frame, MAX_FRAME_SIZE};
use lok_proto::handshake::*;
use lok_proto::ipc::IpcEvent;
use lok_proto::msg::Msg;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::sync::{broadcast, mpsc};
use tokio::time::{interval, timeout, Instant};
use tracing::{debug, error, info, warn};

pub const HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(5);
pub const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(15);
pub const DEAD_PEER_TIMEOUT: Duration = Duration::from_secs(45);

#[allow(clippy::too_many_arguments)]
pub async fn handle_peer_connection(
    mut stream: TcpStream,
    peer_addr: SocketAddr,
    state: SharedState,
    config: Arc<Config>,
    notify_svc: Arc<NotifyService>,
    ipc_event_tx: broadcast::Sender<IpcEvent>,
    mut battery_rx: broadcast::Receiver<BatteryState>,
    mut notif_return_rx: mpsc::Receiver<NotifReturnEvent>,
) {
    debug!(addr = %peer_addr, "New TCP connection, initiating handshake");

    // Perform Handshake under 5s timeout
    let handshake_res = timeout(
        HANDSHAKE_TIMEOUT,
        perform_handshake(&mut stream, &state, &ipc_event_tx),
    )
    .await;

    let (peer_id, peer_name, mut aead_channel) = match handshake_res {
        Ok(Ok(Some(res))) => res,
        Ok(Ok(None)) => {
            // Pairing completed or connection gracefully closed
            return;
        }
        Ok(Err(e)) => {
            warn!(addr = %peer_addr, "Handshake failed: {e}");
            return;
        }
        Err(_) => {
            warn!(addr = %peer_addr, "Handshake timed out");
            return;
        }
    };

    info!(peer = %peer_id, name = %peer_name, "Encrypted session established");

    // Mark online
    {
        let mut guard = state.write().await;
        guard.set_peer_online(&peer_id, true);
    }
    let _ = ipc_event_tx.send(IpcEvent::PeerOnline {
        peer: peer_id.clone(),
        name: peer_name.clone(),
    });

    // Send initial local battery status if available
    {
        let guard = state.read().await;
        if let Some(b) = guard.local_battery {
            let msg = Msg::BatteryUpdate {
                percent: b.percent,
                charging: b.charging,
                ts: b.ts,
            };
            if let Ok(enc) = aead_channel.encrypt(&msg.encode(0).unwrap_or_default()) {
                let mut frame = Vec::new();
                if encode_frame(&enc, &mut frame).is_ok() {
                    let _ = stream.write_all(&frame).await;
                }
            }
        }
    }

    // Run session loop
    let mut read_buf = Vec::with_capacity(MAX_FRAME_SIZE * 2);
    let mut stream_buf = [0u8; 8192];
    let mut last_activity = Instant::now();
    let mut heartbeat_tick = interval(HEARTBEAT_INTERVAL);

    loop {
        tokio::select! {
            // Read from socket
            read_res = stream.read(&mut stream_buf) => {
                match read_res {
                    Ok(0) => {
                        debug!(peer = %peer_id, "TCP stream closed by remote");
                        break;
                    }
                    Ok(n) => {
                        read_buf.extend_from_slice(&stream_buf[..n]);
                        last_activity = Instant::now();

                        // Drain full frames
                        while let Ok(Some((frame_body, consumed))) = decode_frame(&read_buf, MAX_FRAME_SIZE) {
                            let frame_copy = frame_body.to_vec();
                            read_buf.drain(..consumed);

                            match aead_channel.decrypt(&frame_copy) {
                                Ok(plain) => {
                                    match Msg::decode(&plain) {
                                        Ok(msg) => {
                                            if let Some(reply) = dispatch_incoming_msg(
                                                msg,
                                                &peer_id,
                                                &peer_name,
                                                &state,
                                                &config,
                                                &notify_svc,
                                                &ipc_event_tx,
                                            ).await {
                                                if let Ok(encoded) = reply.encode(0) {
                                                    if let Ok(cipher) = aead_channel.encrypt(&encoded) {
                                                        let mut out_frame = Vec::new();
                                                        if encode_frame(&cipher, &mut out_frame).is_ok() {
                                                            let _ = stream.write_all(&out_frame).await;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        Err(e) => {
                                            warn!(peer = %peer_id, "Failed to decode plaintext msg: {e}");
                                            break;
                                        }
                                    }
                                }
                                Err(e) => {
                                    error!(peer = %peer_id, "AEAD decryption failed: {e}. Terminating session.");
                                    return;
                                }
                            }
                        }
                    }
                    Err(e) => {
                        warn!(peer = %peer_id, "Socket read error: {e}");
                        break;
                    }
                }
            }

            // Periodic heartbeat
            _ = heartbeat_tick.tick() => {
                if Instant::now().duration_since(last_activity) >= DEAD_PEER_TIMEOUT {
                    warn!(peer = %peer_id, "Peer timed out (dead peer)");
                    break;
                }
                // Send Ping
                let ping = Msg::Ping(rand::random());
                if let Ok(encoded) = ping.encode(0) {
                    if let Ok(cipher) = aead_channel.encrypt(&encoded) {
                        let mut out_frame = Vec::new();
                        if encode_frame(&cipher, &mut out_frame).is_ok() {
                            let _ = stream.write_all(&out_frame).await;
                        }
                    }
                }
            }

            // Local battery updates -> forward to phone
            Ok(bat) = battery_rx.recv() => {
                let msg = Msg::BatteryUpdate {
                    percent: bat.percent,
                    charging: bat.charging,
                    ts: 0,
                };
                if let Ok(encoded) = msg.encode(0) {
                    if let Ok(cipher) = aead_channel.encrypt(&encoded) {
                        let mut out_frame = Vec::new();
                        if encode_frame(&cipher, &mut out_frame).is_ok() {
                            let _ = stream.write_all(&out_frame).await;
                        }
                    }
                }
            }

            // Return notification events from Linux desktop (actions / dismiss)
            Some(ret_event) = notif_return_rx.recv() => {
                let maybe_msg = match ret_event {
                    NotifReturnEvent::Dismiss { peer_id: target_peer, phone_id } => {
                        if target_peer == peer_id {
                            Some(Msg::NotifDismiss { id: phone_id })
                        } else {
                            None
                        }
                    }
                    NotifReturnEvent::Action { peer_id: target_peer, phone_id, action, reply } => {
                        if target_peer == peer_id {
                            Some(Msg::NotifAction { id: phone_id, action, reply })
                        } else {
                            None
                        }
                    }
                };

                if let Some(msg) = maybe_msg {
                    if let Ok(encoded) = msg.encode(0) {
                        if let Ok(cipher) = aead_channel.encrypt(&encoded) {
                            let mut out_frame = Vec::new();
                            if encode_frame(&cipher, &mut out_frame).is_ok() {
                                let _ = stream.write_all(&out_frame).await;
                            }
                        }
                    }
                }
            }
        }
    }

    // Mark offline
    {
        let mut guard = state.write().await;
        guard.set_peer_online(&peer_id, false);
    }
    let _ = ipc_event_tx.send(IpcEvent::PeerOffline {
        peer: peer_id.clone(),
    });
    info!(peer = %peer_id, "Session terminated");
}

async fn perform_handshake(
    stream: &mut TcpStream,
    state: &SharedState,
    ipc_event_tx: &broadcast::Sender<IpcEvent>,
) -> Result<Option<(String, String, AeadChannel)>, String> {
    // Read the first outer frame
    let first_frame = read_one_frame(stream).await?;
    let (msg_type, payload) =
        decode_handshake_header(&first_frame).map_err(|e| format!("Header error: {e}"))?;

    match msg_type {
        TYPE_PAIR_MSG_A => {
            // Handle pairing initiation
            handle_pairing_handshake(stream, payload, state, ipc_event_tx).await?;
            Ok(None)
        }
        TYPE_SESSION_HELLO_CLIENT => {
            // Handle session authentication
            let hello_c: HelloClient =
                postcard::from_bytes(payload).map_err(|e| format!("Decode HelloClient: {e}"))?;

            let id_hex = hex::encode(hello_c.id_c);
            let peer_record = {
                let guard = state.read().await;
                guard.peers.get(&id_hex).cloned()
            };

            let peer = match peer_record {
                Some(p) => p,
                None => {
                    // Unknown id -> silent close per §3.5
                    debug!(id = %id_hex, "Unknown peer id, closing silently");
                    return Ok(None);
                }
            };

            // Start transcript
            let mut transcript = TranscriptHasher::new();
            transcript.update(&first_frame);

            // Generate ephemeral key
            let eph_server = EphemeralKey::generate();
            let rand_server = lok_crypto::generate_random_32();
            let (my_id, my_sig) = {
                let guard = state.read().await;
                let id_bytes = guard.identity.device_id_bytes();
                // We will sign the transcript after appending HelloServer prelude
                (id_bytes, guard.identity.sign(&transcript.current_hash()))
            };

            let hello_s = HelloServer {
                ver: 1,
                id_s: my_id,
                eph_pub_s: eph_server.public_key_bytes(),
                rand_s: rand_server,
                sig_s: Sig64(my_sig),
            };

            let hello_s_raw = encode_handshake_frame(TYPE_SESSION_HELLO_SERVER, &hello_s)
                .map_err(|e| format!("{e}"))?;
            let mut wire = Vec::new();
            encode_frame(&hello_s_raw, &mut wire).map_err(|e| format!("{e}"))?;
            stream
                .write_all(&wire)
                .await
                .map_err(|e| format!("Write HelloServer: {e}"))?;

            transcript.update(&hello_s_raw);

            // Read AuthClient frame
            let auth_frame = read_one_frame(stream).await?;
            let (auth_type, auth_payload) =
                decode_handshake_header(&auth_frame).map_err(|e| format!("{e}"))?;
            if auth_type != TYPE_SESSION_AUTH_CLIENT {
                return Err(format!("Expected AuthClient, got 0x{auth_type:02X}"));
            }

            let auth_c: AuthClient =
                postcard::from_bytes(auth_payload).map_err(|e| format!("Decode AuthClient: {e}"))?;

            // Verify client signature
            verify_signature(
                &peer.pubkey,
                &transcript.current_hash(),
                &auth_c.sig_c.0,
            )
            .map_err(|e| format!("Client auth signature invalid: {e}"))?;

            // Diffie-Hellman & session key derivation
            let shared_dh = eph_server.diffie_hellman(&hello_c.eph_pub_c);
            let (k_c2s, k_s2c) =
                derive_session_keys(&shared_dh, &hello_c.rand_c, &rand_server)
                    .map_err(|e| format!("{e}"))?;

            let channel = AeadChannel::new(k_s2c, k_c2s, true);
            Ok(Some((peer.peer_id, peer.name, channel)))
        }
        _ => Err(format!("Unexpected handshake message type: 0x{msg_type:02X}")),
    }
}

async fn handle_pairing_handshake(
    stream: &mut TcpStream,
    msg_a_payload: &[u8],
    state: &SharedState,
    ipc_event_tx: &broadcast::Sender<IpcEvent>,
) -> Result<(), String> {
    let (pin, qr_secret, my_name) = {
        let mut guard = state.write().await;
        if !guard.is_pairing_open() {
            return Err("Pairing window is not open".into());
        }
        let pairing = guard.pairing.as_ref().unwrap();
        (
            pairing.pin.clone(),
            pairing.qr_secret,
            guard.device_name.clone(),
        )
    };

    // Password = PIN || qr_secret (or PIN for fallback)
    let mut password = pin.as_bytes().to_vec();
    password.extend_from_slice(&qr_secret);

    let (spake_state, msg_b) = spake_start_server(&password);
    let msg_b_raw = encode_handshake_frame(TYPE_PAIR_MSG_B, &msg_b).map_err(|e| format!("{e}"))?;
    let mut wire = Vec::new();
    encode_frame(&msg_b_raw, &mut wire).map_err(|e| format!("{e}"))?;
    stream
        .write_all(&wire)
        .await
        .map_err(|e| format!("Write SPAKE2 msg B: {e}"))?;

    let k_pair = match spake_finish(spake_state, msg_a_payload) {
        Ok(k) => k,
        Err(e) => {
            let mut guard = state.write().await;
            guard.record_pairing_failure();
            let _ = ipc_event_tx.send(IpcEvent::PairFailed {
                reason: format!("{e}"),
            });
            return Err(format!("SPAKE2 derivation failed: {e}"));
        }
    };

    // Read PairConfirmationClient
    let conf_frame = read_one_frame(stream).await?;
    let (conf_type, conf_payload) =
        decode_handshake_header(&conf_frame).map_err(|e| format!("{e}"))?;
    if conf_type != TYPE_PAIR_CONFIRM_CLIENT {
        return Err("Expected PairConfirmationClient".into());
    }

    let client_payload = match verify_pair_confirmation(&k_pair, conf_payload, true) {
        Ok(p) => p,
        Err(e) => {
            let mut guard = state.write().await;
            guard.record_pairing_failure();
            return Err(format!("Pair confirmation failed: {e}"));
        }
    };

    // Send PairConfirmationServer
    let server_conf_cipher = {
        let guard = state.read().await;
        create_pair_confirmation(&k_pair, &guard.identity, &my_name, true)
            .map_err(|e| format!("{e}"))?
    };
    let s_conf_raw = encode_handshake_frame(TYPE_PAIR_CONFIRM_SERVER, &server_conf_cipher)
        .map_err(|e| format!("{e}"))?;
    let mut s_wire = Vec::new();
    encode_frame(&s_conf_raw, &mut s_wire).map_err(|e| format!("{e}"))?;
    stream
        .write_all(&s_wire)
        .await
        .map_err(|e| format!("Write confirmation server: {e}"))?;

    // Store pinned peer
    let client_id_hex = hex::encode(client_payload.pubkey);
    {
        let mut guard = state.write().await;
        guard.add_peer(PairedPeerRecord {
            peer_id: client_id_hex.clone(),
            name: client_payload.device_name.clone(),
            pubkey: client_payload.pubkey,
            permissions: Default::default(),
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0),
        });
        guard.cancel_pairing();
    }

    let _ = ipc_event_tx.send(IpcEvent::PairDone {
        peer: client_id_hex,
        name: client_payload.device_name,
    });

    info!("Pairing completed successfully!");
    Ok(())
}

async fn read_one_frame(stream: &mut TcpStream) -> Result<Vec<u8>, String> {
    let mut len_buf = [0u8; 2];
    stream
        .read_exact(&mut len_buf)
        .await
        .map_err(|e| format!("Read frame length: {e}"))?;
    let len = u16::from_be_bytes(len_buf) as usize;
    if len > MAX_FRAME_SIZE {
        return Err(format!("Oversized frame: {len} > {MAX_FRAME_SIZE}"));
    }
    let mut body = vec![0u8; len];
    stream
        .read_exact(&mut body)
        .await
        .map_err(|e| format!("Read frame body: {e}"))?;
    Ok(body)
}

async fn dispatch_incoming_msg(
    msg: Msg,
    peer_id: &str,
    peer_name: &str,
    state: &SharedState,
    config: &Config,
    notify_svc: &NotifyService,
    ipc_event_tx: &broadcast::Sender<IpcEvent>,
) -> Option<Msg> {
    match msg {
        Msg::Ping(nonce) => Some(Msg::Pong(nonce)),
        Msg::Pong(_) => None,
        Msg::BatteryUpdate { percent, charging, ts } => {
            {
                let mut guard = state.write().await;
                guard.update_peer_battery(peer_id, percent, charging, ts);
            }
            let _ = ipc_event_tx.send(IpcEvent::Battery {
                peer: peer_id.to_string(),
                percent,
                charging,
            });
            None
        }
        Msg::NotifPost(notif) => {
            notify_svc.handle_notif_post(peer_id, peer_name, notif).await;
            None
        }
        Msg::NotifDismiss { id } => {
            notify_svc.handle_notif_dismiss(peer_id, id).await;
            None
        }
        Msg::CmdRun { req_id, name, args } => {
            let may_run = {
                let guard = state.read().await;
                guard
                    .peers
                    .get(peer_id)
                    .is_some_and(|p| p.permissions.commands)
            };
            if !may_run {
                warn!(peer = %peer_id, "Peer lacks command permission");
                return Some(Msg::CmdResult {
                    req_id,
                    code: 1,
                    out: b"Command execution not permitted for this peer".to_vec(),
                });
            }
            Some(execute_command(config, req_id, &name, &args, peer_id).await)
        }
        _ => None,
    }
}
