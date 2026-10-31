# LokSync — Architecture Specification

> A tiny, secure, local-only bridge between mobile devices and Linux machines.
> Notifications, battery state and fast commands over encrypted TCP on your own Wi-Fi.

| | |
|---|---|
| **Status** | Draft v1.0 |
| **Language** | Rust (stable, edition 2021) |
| **Targets** | `x86_64` and `aarch64` Linux (glibc or musl) |
| **Hard budget** | Daemon + GUI combined: **< 20–25 MB RSS** |
| **Network scope** | Local Wi-Fi / LAN only. No cloud. No relay. |

> **Note on numbers.** Memory figures in this document are *design targets and
> estimates*. Section 8 describes how to measure them in CI. Treat any number
> as unproven until the CI gate passes.

---

## Table of Contents

1. [System Overview & Design Philosophy](#1-system-overview--design-philosophy)
2. [Detailed Architecture & Component Breakdown](#2-detailed-architecture--component-breakdown)
3. [Communication Protocol & Network Layer](#3-communication-protocol--network-layer)
4. [Linux OS Integration Specifications](#4-linux-os-integration-specifications)
5. [Data Flow Diagrams](#5-data-flow-diagrams)
6. [Packaging, Distribution & Deployment](#6-packaging-distribution--deployment)
7. [Security Threat Model & Local Isolation](#7-security-threat-model--local-isolation)
8. [Resource Budget & Verification](#8-resource-budget--verification)
9. [Roadmap & Open Questions](#9-roadmap--open-questions)

---

## 1. System Overview & Design Philosophy

### 1.1 What LokSync is

LokSync connects a phone and one or more Linux machines directly over the local
network. After a one-time pairing, the phone can:

- push its notifications to the Linux desktop (shown by the native notification daemon),
- show its battery level in the Linux tray / Waybar,
- trigger pre-approved commands on the laptop,

and the laptop can send its battery level (and optional events) to the phone.

### 1.2 Goals

| # | Goal | How it is met |
|---|------|---------------|
| G1 | Tiny RAM use | Rust, single-threaded async runtime, no GUI toolkit in the daemon, static buffers |
| G2 | Works everywhere | Daemon talks only to standard interfaces: DBus, sysfs, systemd, TCP |
| G3 | Self-healing | systemd `Type=notify`, watchdog, `Restart=on-failure` |
| G4 | Local and private | LAN-only binding, mDNS discovery, end-to-end encrypted session |
| G5 | Low latency | Persistent TCP connection, binary framing, `TCP_NODELAY` |
| G6 | Easy to package | Static binaries, one config file, Nix module and AUR package |

### 1.3 Non-goals

- No internet relay, cloud account, or remote access outside the LAN.
- No file transfer or screen mirroring in v1 (see [Roadmap](#9-roadmap--open-questions)).
- No arbitrary remote shell. Commands are allow-listed (see §7).

### 1.4 Why Rust?

| Reason | Detail |
|--------|--------|
| **Memory safety** | The daemon parses untrusted network input. Rust removes whole classes of memory bugs (buffer overflows, use-after-free). |
| **No runtime / GC** | Predictable memory. No garbage collector pauses or heap bloat, unlike Python, Node or JVM options. |
| **Small static binaries** | One file, no dependency hell. `musl` static builds work on any distro. |
| **Great async ecosystem** | `tokio` (current-thread) and `zbus` (pure-Rust DBus) give async I/O without C libraries. |
| **Cross-compilation** | Same codebase builds for `x86_64` and `aarch64` (laptops, Raspberry Pi servers). |

A Python daemon would idle at 20–40 MB alone. A Go daemon typically idles
around 8–15 MB and carries a larger runtime. Rust can idle in the low single
digits of MB, which leaves room for the GUI inside the budget.

### 1.5 Why a headless daemon + modular GUI?

```
 ┌────────────────────────┐        ┌──────────────────────────────┐
 │   lok-sync-d (daemon)  │◄──────►│   lok-sync-gui (optional)    │
 │  always on, no UI deps │  IPC   │  waybar / tray / pair window │
 └────────────────────────┘        └──────────────────────────────┘
```

- **Servers and minimal setups** run only the daemon. No GUI libraries are ever loaded.
- **The daemon never crashes because of the GUI.** UI code is the most crash-prone part of most apps; isolating it keeps sync reliable.
- **Many frontends, one backend.** Waybar module, system tray, CLI and (later) GNOME/KDE extensions all use the same local IPC socket.
- **Memory control.** Each piece can be measured and limited on its own.

---

## 2. Detailed Architecture & Component Breakdown

### 2.1 High-level view

```
                 ┌─────────────────────────── Linux machine ───────────────────────────┐
                 │                                                                     │
 ┌────────────┐  │  ┌──────────────────────── lok-sync-d ───────────────────────────┐  │
 │   Phone    │  │  │                                                                │  │
 │ (Android)  │◄─┼─►│  Net layer ─► Session ─► Router ─┬─► Notification service ─────┼──┼─► DBus session bus
 │ LokSync    │TCP│ │  (mDNS,TCP)   (crypto)   (msgs)  ├─► Battery service ◄─────────┼──┼── /sys/class/power_supply
 │ app        │  │  │                                  ├─► Command service           │  │
 └────────────┘  │  │                                  └─► State store + IPC server ─┼──┼─► lok-sync-gui / CLI
                 │  └────────────────────────────────────────────────────────────────┘  │
                 └─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Repository layout (Cargo workspace)

```
loksync/
├── Cargo.toml                 # workspace
├── crates/
│   ├── lok-proto/             # wire types, framing, message enums (no I/O) — shared with tests
│   ├── lok-crypto/            # pairing (SPAKE2), key exchange, AEAD wrapper
│   ├── lok-sync-d/            # the daemon binary
│   └── lok-sync-gui/          # waybar / tray / pairing UI binary
├── dist/
│   ├── systemd/lok-sync.service
│   ├── systemd/lok-sync.slice
│   ├── nix/                   # flake.nix, module.nix
│   └── arch/PKGBUILD
└── docs/architecture.md
```

### 2.3 Headless Core Daemon — `lok-sync-d`

#### 2.3.1 Runtime model

- **One OS thread** for the main loop: `tokio` with the `current_thread` runtime.
  No worker pool. This avoids per-thread stacks (each Linux thread costs
  address space and often 100s of KB of touched memory).
- A small number of helper threads only where a dependency requires one
  (for example the mDNS library). Total thread count target: **≤ 4**.
- All I/O is async. CPU work (AES-GCM on small frames) is trivial and runs inline.

```toml
# crates/lok-sync-d/Cargo.toml (abridged)
[dependencies]
tokio      = { version = "1", default-features = false, features = ["rt", "net", "time", "sync", "macros", "io-util", "signal", "fs"] }
zbus       = { version = "4", default-features = false, features = ["tokio"] }
mdns-sd    = "0.11"                 # pure Rust mDNS / DNS-SD
aes-gcm    = "0.10"                 # Aes128Gcm
x25519-dalek  = "2"
ed25519-dalek = "2"
hkdf       = "0.12"
sha2       = "0.10"
spake2     = "0.4"                  # PIN-authenticated key agreement
zeroize    = "1"
serde      = { version = "1", default-features = false, features = ["derive"] }
postcard   = { version = "1", features = ["use-std"] }   # compact binary encoding
toml       = "0.8"                  # config
sd-notify  = "0.4"                  # READY / WATCHDOG
rustix     = { version = "0.38", features = ["net", "fs"] }  # netlink uevent socket
tracing    = { version = "0.1", default-features = false }
```

> Pin crate versions in `Cargo.lock` and review with `cargo deny` / `cargo audit`
> in CI. Check each crate's current version at implementation time.

#### 2.3.2 Internal modules

| Module | Responsibility | Notes |
|--------|----------------|-------|
| `net::discovery` | Announce and browse `_loksync._tcp.local.` via mDNS | Announce only while the service is running |
| `net::listener` | Accept TCP, enforce limits (max connections, handshake timeout) | Binds only to LAN interfaces |
| `session` | Handshake, key derivation, encrypted frame read/write | One task per paired peer |
| `router` | Dispatch decoded messages to services | Pure function over an enum |
| `svc::notify` | Map phone notifications to DBus `Notify` calls; relay close/action events back | Uses `zbus` |
| `svc::battery` | Watch local battery, publish phone battery to state | sysfs + netlink uevent |
| `svc::command` | Run allow-listed commands | No shell, fixed argv |
| `state` | In-memory snapshot (peers, battery, last notifications) | Bounded sizes |
| `ipc` | Unix socket server for GUI/CLI | JSON lines, `0600` socket |
| `config` | Load `/etc/lok-sync/config.toml` and `~/.config/lok-sync/config.toml` | Hot-reload on `SIGHUP` |
| `supervisor` | sd-notify READY, watchdog pings, graceful shutdown | |

#### 2.3.3 Memory discipline

- **Bounded everything:** max frame 64 KiB, max 8 paired peers, max 32 queued notifications, max 16 KiB per notification body, max icon 32 KiB.
- **Reusable buffers:** one read buffer and one write buffer per session (`Vec<u8>` with a fixed capacity, reused every frame).
- **No logging of payloads.** Only metadata (type, size) at `debug`.
- **Release profile tuned for size** (see §6.1).
- **Icons:** notification icons are passed to DBus as the `image-data` hint only when under the size cap, and are not cached in RAM after delivery.

#### 2.3.4 Lifecycle

```
start ─► load config ─► load keys ─► bind socket ─► register DBus ─► start mDNS
       ─► sd_notify(READY=1) ─► loop { events, watchdog ping } ─► SIGTERM ─► close sessions ─► exit 0
```

### 2.4 Lightweight GUI Client — `lok-sync-gui`

One binary, several **modes**. Only the mode in use is active.

| Mode | Command | Purpose | Target RSS |
|------|---------|---------|-----------|
| Waybar | `lok-sync-gui --waybar` | Prints JSON lines for a Waybar `custom` module | ~1–3 MB |
| Tray | `lok-sync-gui --tray` | StatusNotifierItem tray icon + menu (works on KDE, GNOME with AppIndicator, Waybar `tray`, etc.) | ~5–9 MB |
| Pair | `lok-sync-gui --pair` | Shows QR + PIN in a terminal (default) | ~2 MB |
| Status | `lok-sync-gui --status` | One-shot text status for scripts | <2 MB |

Design rules:

- **No GTK / Qt.** The tray uses `ksni` (pure-Rust StatusNotifierItem over DBus). The pairing view renders the QR as terminal block characters (`qrcode` crate). An optional pixel-window pairing UI can be added behind a Cargo feature, off by default, because toolkits blow the memory budget.
- **Stateless.** The GUI keeps no secrets and no copy of keys. It only talks to the daemon over the local socket.
- **Reconnects automatically** if the daemon restarts.

#### Waybar integration

`~/.config/waybar/config.jsonc`:

```jsonc
"custom/phone": {
  "exec": "lok-sync-gui --waybar",
  "return-type": "json",
  "format": "{}",
  "tooltip": true,
  "on-click": "lok-sync-gui --status | notify-send -a LokSync -",
  "restart-interval": 5
}
```

The process streams one JSON object per change (no polling by Waybar):

```json
{"text":"󰄜 82%","tooltip":"Pixel 8 — 82% (charging)","class":"charging","percentage":82}
```

Style hooks in `style.css`:

```css
#custom-phone.charging { color: #a6e3a1; }
#custom-phone.low      { color: #f38ba8; }
#custom-phone.offline  { opacity: 0.4; }
```

Classes: `normal`, `charging`, `low` (≤ 20 %), `offline`.

#### Local IPC protocol (daemon ⇄ GUI/CLI)

- Unix stream socket: `$XDG_RUNTIME_DIR/lok-sync/ctl.sock`, mode `0600`, owned by the user.
- Newline-delimited JSON. Human-debuggable with `socat`.
- Requests: `get_state`, `subscribe`, `pair_start`, `pair_cancel`, `unpair {peer}`, `list_peers`.
- Events (after `subscribe`): `peer_online`, `peer_offline`, `battery`, `pair_pin`, `pair_done`.

```json
{"cmd":"subscribe"}
{"event":"battery","peer":"a1b2c3d4","percent":82,"charging":true}
```

---

## 3. Communication Protocol & Network Layer

### 3.1 Transport overview

```
 Phone                                                       Laptop
   │                                                           │
   │──── mDNS query: _loksync._tcp.local. ────────────────────►│
   │◄─── mDNS answer: host, port 47100, TXT(v=1,id=…) ─────────│
   │                                                           │
   │═══════════ TCP connect (port 47100, TCP_NODELAY) ═════════│
   │◄══ handshake (clear) ═══►  session keys derived ◄═════════│
   │◄══════════ AES-128-GCM encrypted frames ═════════════════►│
```

- **Default port:** `47100/tcp` (configurable). mDNS uses `5353/udp`.
- **Persistent connection.** One TCP connection per peer pair, kept alive with application heartbeats. This is what gives low latency: no connect or handshake cost per message.
- **Socket options:** `TCP_NODELAY`, `SO_KEEPALIVE` (idle 30 s, interval 10 s, count 3).

### 3.2 mDNS local discovery

| Field | Value |
|-------|-------|
| Service type | `_loksync._tcp.local.` |
| Instance name | `<hostname>-<id4>` |
| TXT `v` | Protocol version, currently `1` |
| TXT `id` | First 8 hex chars of the SHA-256 of the device's public identity key |
| TXT `name` | Human-readable device name (optional, user can hide it) |

Rules:

- **No sensitive data in TXT.** No battery, no usernames, no IPs beyond what mDNS needs. Anyone on the LAN can read mDNS.
- **Discovery is not trust.** A spoofed mDNS answer cannot impersonate a paired device, because identity is verified in the handshake (§3.5).
- **Fallback:** the phone can store the last-known IP and try it first. If mDNS is blocked (some routers filter multicast, or "AP isolation" is on), the QR code also contains `ip:port` hints.
- **Interface filter:** announce only on interfaces listed in `config.toml` (`interfaces = ["wlan0"]`) or, by default, all non-loopback, non-VPN, non-container private interfaces.

### 3.3 Frame format

All integers are big-endian. The stream is a sequence of frames.

#### Outer frame (on the wire)

```
 0               2                                   2+N
 ┌───────────────┬───────────────────────────────────┐
 │ length: u16   │ body: N bytes                     │
 └───────────────┴───────────────────────────────────┘
```

- `length` = byte count of `body` (max **65 535**; the daemon enforces a stricter limit, default **65 000**).
- Frames larger than the limit cause the connection to be closed.
- Larger payloads (future file transfer) must be chunked by the application layer.

#### Handshake frames (clear text body)

```
 ┌────────┬────────┬─────────────────────┐
 │ magic  │ type   │ payload             │
 │ "LK"   │ u8     │ postcard-encoded    │
 └────────┴────────┴─────────────────────┘
```

#### Encrypted frames (after handshake)

```
 ┌──────────────────────────────────────────────────────────┐
 │ ciphertext (plaintext_len bytes)  │  GCM tag (16 bytes)  │
 └──────────────────────────────────────────────────────────┘
```

- **Nonce (96-bit)** = `dir (4 bytes) || counter (8 bytes, big-endian)`.
  - `dir` is `0x00000001` for client→server and `0x00000002` for server→client.
  - `counter` starts at 0 for each session and increments by 1 per frame. It is **not sent on the wire**; both sides count. TCP guarantees ordering, so a mismatch means tampering or loss and the session is closed.
- **AAD** = `"LK1" || dir (1 byte)`.
- **Key rotation:** a fresh key pair is derived on every TCP connection (see §3.5), so counters never repeat under the same key. A session also re-keys (reconnects) before the counter reaches `2^32`.

#### Plaintext message (inside the ciphertext)

```
 ┌────────┬─────────┬────────────────────────────┐
 │ type   │ flags   │ payload (postcard)         │
 │ u8     │ u8      │ variable                   │
 └────────┴─────────┴────────────────────────────┘
```

#### Message types

| ID | Name | Direction | Payload |
|----|------|-----------|---------|
| `0x01` | `Ping` | both | `u64 nonce` |
| `0x02` | `Pong` | both | `u64 nonce` |
| `0x10` | `BatteryUpdate` | both | `{percent: u8, charging: bool, ts: u64}` |
| `0x20` | `NotifPost` | phone→laptop | `{id: u32, app: str, title: str, body: str, icon: bytes?, actions: [str], ts: u64}` |
| `0x21` | `NotifDismiss` | both | `{id: u32}` |
| `0x22` | `NotifAction` | laptop→phone | `{id: u32, action: str, reply: str?}` |
| `0x30` | `CmdRun` | phone→laptop | `{req_id: u32, name: str, args: [str]}` |
| `0x31` | `CmdResult` | laptop→phone | `{req_id: u32, code: i32, out: bytes (≤ 4 KiB)}` |
| `0x7F` | `Error` | both | `{code: u16, msg: str}` |

Rust definition (shared `lok-proto` crate):

```rust
#[derive(Serialize, Deserialize)]
pub enum Msg {
    Ping(u64),
    Pong(u64),
    BatteryUpdate { percent: u8, charging: bool, ts: u64 },
    NotifPost(NotifPost),
    NotifDismiss { id: u32 },
    NotifAction { id: u32, action: String, reply: Option<String> },
    CmdRun { req_id: u32, name: String, args: Vec<String> },
    CmdResult { req_id: u32, code: i32, out: Vec<u8> },
    Error { code: u16, msg: String },
}
```

Validation rules (reject and close on violation): string lengths capped, `percent ≤ 100`, `args` count ≤ 8, each arg ≤ 256 bytes, unknown `type` ignored only if `flags & 0x01` (optional) is set, else fatal.

#### Timing

| Item | Value |
|------|-------|
| Heartbeat | `Ping` every 15 s when idle |
| Dead peer timeout | 45 s without any frame |
| Handshake timeout | 5 s |
| Reconnect backoff (client) | 1, 2, 4, 8 … max 30 s, with jitter |

### 3.4 Pairing mechanism (first time only)

Goal: two devices that share only a short PIN (or QR secret) end up with
**authenticated, pinned identities** and no one on the LAN can learn the PIN by
listening, nor guess it offline.

**Method:** SPAKE2 (a password-authenticated key exchange, PAKE) over the PIN.
It gives a strong shared key even from a 6-digit PIN, and an attacker gets only
**one guess per pairing attempt**.

```
 Laptop (lok-sync-d)                                   Phone
   │  user runs: lok-sync-gui --pair                      │
   │  daemon opens pairing window (120 s),                │
   │  generates 6-digit PIN + 128-bit QR secret           │
   │  shows QR = {ip, port, id, qr_secret} and PIN        │
   │                                                      │
   │◄──────── user scans QR (or types PIN) ───────────────│
   │                                                      │
   │◄──────────── SPAKE2 msg A ───────────────────────────│   password = PIN || qr_secret
   │───────────── SPAKE2 msg B ──────────────────────────►│   (QR path: high entropy; PIN-only path: 6 digits)
   │   both derive K_pair; each proves key knowledge      │
   │◄── Enc_Kpair(Ed25519 pubkey + device name + sig) ────│
   │─── Enc_Kpair(Ed25519 pubkey + device name + sig) ───►│
   │                                                      │
   │  both store peer pubkey ("pinned") ─► paired         │
```

Details:

- **Pairing window:** closed by default. Opens only on explicit user action, lasts **120 s**, accepts **one** pairing session at a time, and allows **3 failed attempts** before it closes itself.
- **QR path (recommended):** the QR contains a 128-bit random secret, so there is nothing to brute-force. PIN-only entry is the fallback when a camera is not available.
- **Confirmation:** the PIN is also shown on the phone; the user confirms it matches before the identity keys are stored.
- **Stored per peer:** `peer_id`, name, Ed25519 public key, permissions (`notifications`, `battery`, `commands`), creation time.
- **Revocation:** `lok-sync-gui --unpair <id>` deletes the record; the daemon closes any live session immediately.

### 3.5 Session handshake (every connection)

After pairing, each connection runs an authenticated ephemeral key exchange
(SIGMA-style). This gives **forward secrecy**: stealing today's stored keys does
not decrypt yesterday's captured traffic.

```
 Client (phone)                                         Server (laptop)
   │── Hello{ver, id_c, eph_pub_c (X25519), rand_c} ───────────►│
   │◄── Hello{ver, id_s, eph_pub_s (X25519), rand_s,            │
   │          sig_s = Ed25519(id_key_s, transcript)} ───────────│
   │── Auth{ sig_c = Ed25519(id_key_c, transcript) } ──────────►│
   │                                                            │
   │  shared = X25519(eph_priv, eph_pub_peer)                   │
   │  PRK = HKDF-Extract(salt = rand_c||rand_s, shared)         │
   │  k_c2s = HKDF-Expand(PRK, "lok c2s", 16 bytes)             │
   │  k_s2c = HKDF-Expand(PRK, "lok s2c", 16 bytes)             │
   │                                                            │
   │◄═════════ AES-128-GCM frames (counters from 0) ═══════════►│
```

- `transcript` = SHA-256 over all handshake bytes so far (prevents downgrade and splicing).
- The server looks up `id_c` in its paired list. **Unknown id → close the connection silently** (no error detail, to avoid probing).
- Two directional keys avoid nonce collisions between directions.
- Ephemeral private keys and derived keys are held in `zeroize`-wrapped memory and wiped on drop.

> **Why AES-128-GCM?** It is hardware-accelerated (AES-NI / ARMv8 crypto), fast,
> and 128-bit keys are sufficient against all known practical attacks. If AES
> hardware is missing on a target, ChaCha20-Poly1305 is a drop-in alternative
> (feature flag `chacha`), with the same framing.

---

## 4. Linux OS Integration Specifications

### 4.1 Systemd service

LokSync needs the user's **DBus session bus** (for notifications), so the
primary deployment is a **systemd user service**. A system-level variant is
provided for headless servers (no notifications, battery + commands only).

#### 4.1.1 User service — `lok-sync.service`

`/usr/lib/systemd/user/lok-sync.service`:

```ini
[Unit]
Description=LokSync daemon (local phone <-> Linux bridge)
Documentation=https://example.invalid/loksync
After=network-online.target dbus.socket
Wants=network-online.target
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
Type=notify
NotifyAccess=main
ExecStart=/usr/bin/lok-sync-d --config %E/lok-sync/config.toml
ExecReload=/bin/kill -HUP $MAINPID

# --- Self-healing ---
Restart=on-failure
RestartSec=2
WatchdogSec=30

# --- Resource throttling ---
Slice=lok-sync.slice
MemoryHigh=20M
MemoryMax=25M
MemorySwapMax=0
CPUQuota=10%
TasksMax=32
LimitNOFILE=256
Nice=10
IOWeight=20

# --- Hardening ---
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=%S/lok-sync %t/lok-sync
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectKernelLogs=yes
ProtectControlGroups=yes
ProtectClock=yes
ProtectHostname=yes
RestrictNamespaces=yes
RestrictRealtime=yes
RestrictSUIDSGID=yes
LockPersonality=yes
MemoryDenyWriteExecute=yes
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6 AF_NETLINK
SystemCallArchitectures=native
SystemCallFilter=@system-service
SystemCallFilter=~@privileged @resources @mount @swap @reboot @debug
CapabilityBoundingSet=
UMask=0077

[Install]
WantedBy=default.target
```

#### 4.1.2 Shared slice — enforces the **combined** budget

The daemon and the tray GUI run inside one slice so the 25 MB limit covers both.

`/usr/lib/systemd/user/lok-sync.slice`:

```ini
[Unit]
Description=LokSync resource slice (daemon + GUI combined)

[Slice]
MemoryHigh=22M
MemoryMax=25M
MemorySwapMax=0
TasksMax=48
```

Tray GUI unit (optional) `/usr/lib/systemd/user/lok-sync-gui.service`:

```ini
[Unit]
Description=LokSync tray
After=lok-sync.service graphical-session.target
PartOf=graphical-session.target
Requires=lok-sync.service

[Service]
ExecStart=/usr/bin/lok-sync-gui --tray
Slice=lok-sync.slice
Restart=on-failure
RestartSec=3
NoNewPrivileges=yes
ProtectSystem=strict
PrivateTmp=yes

[Install]
WantedBy=graphical-session.target
```

Enable:

```bash
systemctl --user daemon-reload
systemctl --user enable --now lok-sync.service
systemctl --user enable --now lok-sync-gui.service   # optional tray
```

#### 4.1.3 Notes on limits

- `MemoryHigh` is a **soft** limit: the kernel throttles and reclaims memory above it (slows the service). `MemoryMax` is a **hard** limit: the cgroup is OOM-killed above it, and `Restart=on-failure` brings it back. Setting both gives a graceful warning zone before a kill.
- cgroup memory counts **page cache** used by the service's own file reads, not only heap. The daemon reads very little, so this is small, but measure with `systemd-cgtop` and `memory.stat`, not only `ps`.
- User units can only set cgroup limits if the memory controller is delegated to the user manager. Modern systemd (cgroup v2) delegates `memory`, `cpu` and `pids` to `user@.service` by default. Verify with `cat /sys/fs/cgroup/user.slice/user-$UID.slice/user@$UID.service/cgroup.controllers`.
- A Waybar `custom` module's `exec` process is started by Waybar, outside this slice. It is tiny (~1–3 MB) and is counted separately in the budget table (§8). To include it, wrap it: `systemd-run --user --scope --slice=lok-sync.slice lok-sync-gui --waybar`.
- `MemoryDenyWriteExecute=yes` is compatible with the daemon because it has no JIT. If a future dependency needs W+X memory, drop this line deliberately, not silently.

#### 4.1.4 System service variant (headless servers)

For a server with no login session:

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin loksync
sudo systemctl enable --now lok-sync@system.service
```

Same unit, run as `User=loksync` with `StateDirectory=lok-sync` and
`RuntimeDirectory=lok-sync`; the notification service is disabled automatically
when no session bus is available, and incoming notifications are written to the
journal instead (`notifications.sink = "journal"`).
For per-user headless use, `loginctl enable-linger $USER` keeps the user
service running without a login.

### 4.2 DBus notifications (`org.freedesktop.Notifications`)

All mainstream Linux notification daemons implement the same freedesktop
interface: **GNOME Shell, KDE Plasma, dunst, mako, swaync, fnott**. Because
LokSync talks to the interface rather than to any one daemon, it works the same
on Hyprland, Sway, GNOME and KDE.

#### 4.2.1 Injection (phone → laptop)

The daemon calls `Notify` on the session bus:

```
Destination: org.freedesktop.Notifications
Path:        /org/freedesktop/Notifications
Interface:   org.freedesktop.Notifications
Method:      Notify(
               app_name:       s,   // e.g. "WhatsApp (Pixel 8)"
               replaces_id:    u,   // DBus id from a previous Notify, 0 for new
               app_icon:       s,   // theme icon name, or ""
               summary:        s,   // title
               body:           s,   // text
               actions:        as,  // ["reply","Reply","open","Open on phone"]
               hints:          a{sv}, // urgency, category, image-data, desktop-entry, x-loksync-id
               expire_timeout: i    // -1 = server default
             ) -> u
```

Rust sketch:

```rust
use std::collections::HashMap;
use zbus::{proxy, zvariant::Value};

#[proxy(
    interface = "org.freedesktop.Notifications",
    default_service = "org.freedesktop.Notifications",
    default_path = "/org/freedesktop/Notifications"
)]
trait Notifications {
    #[allow(clippy::too_many_arguments)]
    fn notify(
        &self, app_name: &str, replaces_id: u32, app_icon: &str,
        summary: &str, body: &str, actions: &[&str],
        hints: HashMap<&str, Value<'_>>, expire_timeout: i32,
    ) -> zbus::Result<u32>;

    fn close_notification(&self, id: u32) -> zbus::Result<()>;

    #[zbus(signal)]
    fn notification_closed(&self, id: u32, reason: u32) -> zbus::Result<()>;

    #[zbus(signal)]
    fn action_invoked(&self, id: u32, action_key: &str) -> zbus::Result<()>;
}
```

Mapping rules:

| Phone event | Linux call |
|-------------|-----------|
| New notification | `Notify(replaces_id=0)`; store `phone_id → dbus_id` |
| Updated notification (same phone id) | `Notify(replaces_id=dbus_id)` |
| Dismissed on phone | `CloseNotification(dbus_id)` |
| Dismissed on laptop (`NotificationClosed`, reason 2) | send `NotifDismiss` to phone |
| Action clicked (`ActionInvoked`) | send `NotifAction` to phone |

Only notifications whose `x-loksync-id` hint belongs to LokSync are forwarded
back, so the daemon never leaks unrelated desktop notifications to the phone.

**Sanitizing** (phone content is untrusted):

- Strip or escape markup in `summary`/`body` (many daemons render a subset of HTML-like markup, including links). Default: send plain text only.
- Cap lengths (title 256 B, body 16 KiB). Truncate with `…`.
- Decode icons only if `≤ 32 KiB` and a valid PNG/JPEG header; otherwise omit.
- Per-app allow/deny lists and a rate limit (default 10 notifications / 10 s per peer) to prevent notification floods.
- Privacy mode: `hide_body_when_locked = true` shows title only.

#### 4.2.2 Interception (laptop → phone), optional

Forwarding **laptop** notifications to the phone is off by default. When
enabled, the daemon uses the DBus **monitoring** interface on the user's own
session bus (`org.freedesktop.DBus.Monitoring.BecomeMonitor` with a match rule
for `member='Notify'`). It reads only; it never blocks or alters messages.

Privacy rules: opt-in per app, never forward notifications carrying the
`x-loksync-id` hint (prevents loops), and honor `urgency`/`category` filters.

#### 4.2.3 Environments without a notification server

| Environment | Behavior |
|-------------|----------|
| Hyprland / Sway with mako, dunst or swaync | Works. Make sure one of them is running (it normally owns the DBus name). |
| GNOME, KDE | Works out of the box. |
| Headless / no session bus | `notifications.sink = "journal"` or `"none"`. |
| Notification daemon starts later than LokSync | Daemon waits for the bus name with `NameOwnerChanged` and flushes a small bounded queue. |

### 4.3 Kernel battery monitoring (`/sys/class/power_supply/`)

#### 4.3.1 Discovery

At startup and on hot-plug, scan `/sys/class/power_supply/*`:

- Read `type`. Keep entries where `type == "Battery"`.
- Prefer a device whose `scope` is not `Device` (`scope=Device` is usually a peripheral like a mouse or headset, not the system battery). Allow the user to pin one in config (`battery.device = "BAT0"`).
- If no battery exists (desktop, server), the battery service reports `None` and the laptop→phone direction is silently disabled. Phone→laptop still works.

#### 4.3.2 Files read

| File | Meaning | Example |
|------|---------|---------|
| `capacity` | Percent 0–100 | `82` |
| `status` | `Charging`, `Discharging`, `Full`, `Not charging`, `Unknown` | `Discharging` |
| `energy_now` / `energy_full` (or `charge_*`) | Fallback if `capacity` is missing | µWh / µAh |

#### 4.3.3 Change detection (no busy polling)

sysfs files do not trigger `inotify` on value changes, so LokSync uses two
mechanisms:

1. **Kernel uevents (primary):** open a `NETLINK_KOBJECT_UEVENT` socket (multicast group 1) via `rustix`, filter for `SUBSYSTEM=power_supply`, and re-read `capacity`/`status` when an event arrives. Zero cost while idle.
2. **Slow poll (safety net):** every 60 s, re-read the two files. Some drivers update `capacity` without emitting uevents.

Only send `BatteryUpdate` when `percent` or `charging` actually changed (with a
1 % hysteresis when discharging to avoid jitter), and always send one on
(re)connect so the phone has fresh data immediately.

```rust
fn read_battery(dir: &Path) -> Option<Battery> {
    let percent: u8 = fs::read_to_string(dir.join("capacity")).ok()?.trim().parse().ok()?;
    let status = fs::read_to_string(dir.join("status")).ok()?;
    let charging = matches!(status.trim(), "Charging" | "Full");
    Some(Battery { percent: percent.min(100), charging })
}
```

#### 4.3.4 Phone battery on Linux

The daemon stores the latest phone `BatteryUpdate` in `state`, publishes it to
IPC subscribers, and the GUI renders it (Waybar JSON, tray tooltip). If no frame
has arrived for 45 s, the peer is marked `offline` and the value is shown as stale.

---

## 5. Data Flow Diagrams

### 5.1 Phone → Laptop notification flow

```
 PHONE (Android)                          LAPTOP (lok-sync-d)                         DESKTOP
 ───────────────                          ───────────────────                         ───────

 NotificationListenerService
   onNotificationPosted(sbn)
        │
        ▼
 filter (app allow-list, ongoing?)
        │
        ▼
 build NotifPost{id,app,title,body,..}
        │
        ▼
 postcard encode ──► AES-128-GCM seal
        │            (key k_c2s, nonce=dir||ctr)
        ▼
 ┌──────────────┐   TCP :47100
 │ len | cipher │ ────────────────────────►  read frame (≤ 64 KiB)
 └──────────────┘                                   │
                                                    ▼
                                           AES-GCM open (verify tag, ctr)
                                                    │  fail ─► close session
                                                    ▼
                                           decode + validate (caps, utf-8)
                                                    │
                                                    ▼
                                           permission check (peer may post notifs?)
                                                    │
                                                    ▼
                                           sanitize + rate-limit
                                                    │
                                                    ▼
                                           zbus: Notifications.Notify(...) ───────────► mako / dunst /
                                                    │                                    swaync / GNOME / KDE
                                                    ▼                                           │
                                           store phone_id → dbus_id                             ▼
                                                    ▲                                    popup on screen
                                                    │                                           │
                                           NotificationClosed / ActionInvoked ◄─────────────────┘
                                                    │
                                                    ▼
 NotifDismiss / NotifAction ◄───────────── seal + send
        │
        ▼
 cancel / reply on phone
```

### 5.2 Laptop ↔ Phone battery sync flow

```
 LAPTOP (lok-sync-d)                                                    PHONE
 ───────────────────                                                    ─────

 kernel power_supply ──uevent──►  netlink socket ──┐
 (BAT0 change)                                     │
 60 s timer ───────────────────────────────────────┤
                                                   ▼
                                     read capacity + status (sysfs)
                                                   │
                                      changed? ── no ─► drop
                                                   │ yes
                                                   ▼
                                     BatteryUpdate{82, discharging}
                                                   │
                                                   ▼
                                     seal ──────── TCP ───────────────►  open ─► show in app
                                                                         "Laptop 82 %"

 ┌──────────────────────────────── reverse direction ───────────────────────────────┐

 BatteryManager (Android)  ──battery changed──►  BatteryUpdate{67, charging}
                                                          │
 LAPTOP                                                   ▼ seal ─► TCP
   open ─► validate (0..100) ─► state.update(peer.battery)
                                          │
                       ┌──────────────────┼──────────────────────┐
                       ▼                  ▼                      ▼
              IPC "battery" event   tray tooltip/icon     Waybar JSON line
                                    (lok-sync-gui --tray) (lok-sync-gui --waybar)
                                                                 │
                                                                 ▼
                                                   {"text":"󰄜 67%","class":"charging"}
```

### 5.3 Pairing and first connection (summary)

```
 user: lok-sync-gui --pair ─► daemon opens 120 s window ─► QR + PIN shown
 phone scans QR ─► SPAKE2 ─► keys exchanged under K_pair ─► peers pinned
 later: phone joins Wi-Fi ─► mDNS finds laptop ─► TCP ─► SIGMA handshake ─► encrypted session
```

---

## 6. Packaging, Distribution & Deployment

### 6.1 Static binary compilation

Targets: `x86_64-unknown-linux-musl` and `aarch64-unknown-linux-musl`.

```toml
# Cargo.toml (workspace root)
[profile.release]
opt-level     = "s"        # "z" for smallest; measure both
lto           = "fat"
codegen-units = 1
panic         = "abort"    # smaller binary; systemd restarts on abort
strip         = true
debug         = false
```

```bash
rustup target add x86_64-unknown-linux-musl aarch64-unknown-linux-musl
cargo build --release --target x86_64-unknown-linux-musl -p lok-sync-d -p lok-sync-gui
# optional:  upx --best target/.../lok-sync-d   (upx can slow startup and raise RSS; measure first)
```

Notes:

- **Allocator:** musl's default `malloc` is slower and can fragment under some patterns. Because LokSync allocates little, it is usually fine; if measurements show fragmentation, switch to `mimalloc` (small footprint, `MIMALLOC_ARENA_EAGER_COMMIT=0`) or `tikv-jemallocator` with tuned decay. Decide from the §8 benchmark, not by guess.
- **Expected binary sizes:** daemon roughly 1.5–3 MB, GUI roughly 2–4 MB after strip (estimates).
- **Reproducible builds:** pin the toolchain with `rust-toolchain.toml`, use `--locked`, set `SOURCE_DATE_EPOCH`.
- **glibc build** is also provided (needed by some distros' policies); the `ksni` tray and DBus code are pure Rust, so musl works fine.

### 6.2 Default config

`/etc/lok-sync/config.toml` (system defaults) and `~/.config/lok-sync/config.toml` (user overrides):

```toml
[network]
port = 47100
interfaces = []                 # empty = auto (private LAN interfaces only)
max_peers = 8

[notifications]
enabled = true
sink = "dbus"                   # "dbus" | "journal" | "none"
plain_text_only = true
hide_body_when_locked = true
rate_limit = { count = 10, per_seconds = 10 }
forward_laptop_to_phone = false # optional DBus monitor feature

[battery]
device = "auto"                 # or "BAT0"
poll_seconds = 60

[commands]                      # allow-list. Names are what the phone may request.
lock-screen = { argv = ["loginctl", "lock-session"] }
suspend     = { argv = ["systemctl", "suspend"], require_confirm = true }
volume-up   = { argv = ["wpctl", "set-volume", "@DEFAULT_AUDIO_SINK@", "5%+"] }
play-pause  = { argv = ["playerctl", "play-pause"] }
```

### 6.3 NixOS (flake + module)

`flake.nix`:

```nix
{
  description = "LokSync — local phone <-> Linux bridge";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    (flake-utils.lib.eachSystem [ "x86_64-linux" "aarch64-linux" ] (system:
      let pkgs = nixpkgs.legacyPackages.${system}; in {
        packages.default = pkgs.rustPlatform.buildRustPackage {
          pname = "lok-sync";
          version = "0.1.0";
          src = self;
          cargoLock.lockFile = ./Cargo.lock;
          cargoBuildFlags = [ "-p" "lok-sync-d" "-p" "lok-sync-gui" ];
          postInstall = ''
            install -Dm644 dist/systemd/lok-sync.service     $out/lib/systemd/user/lok-sync.service
            install -Dm644 dist/systemd/lok-sync.slice       $out/lib/systemd/user/lok-sync.slice
            install -Dm644 dist/systemd/lok-sync-gui.service $out/lib/systemd/user/lok-sync-gui.service
          '';
          meta = {
            description = "Ultra-lightweight local phone <-> Linux sync daemon";
            mainProgram = "lok-sync-d";
            platforms = [ "x86_64-linux" "aarch64-linux" ];
          };
        };
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [ cargo rustc clippy rustfmt cargo-deny cargo-audit ];
        };
      })) // {
      nixosModules.default = import ./dist/nix/module.nix self;
    };
}
```

`dist/nix/module.nix`:

```nix
self: { config, lib, pkgs, ... }:
let
  cfg = config.services.lok-sync;
  tomlFormat = pkgs.formats.toml { };
in {
  options.services.lok-sync = {
    enable   = lib.mkEnableOption "LokSync daemon";
    package  = lib.mkOption {
      type = lib.types.package;
      default = self.packages.${pkgs.system}.default;
    };
    gui.tray = lib.mkEnableOption "LokSync tray icon";
    openFirewall = lib.mkOption { type = lib.types.bool; default = true; };
    port = lib.mkOption { type = lib.types.port; default = 47100; };
    settings = lib.mkOption {
      type = tomlFormat.type;
      default = { };
      description = "Contents of config.toml";
    };
  };

  config = lib.mkIf cfg.enable {
    environment.systemPackages = [ cfg.package ];
    environment.etc."lok-sync/config.toml".source =
      tomlFormat.generate "lok-sync.toml" (lib.recursiveUpdate { network.port = cfg.port; } cfg.settings);

    # Ship the user units and start them for every user session.
    systemd.packages = [ cfg.package ];
    systemd.user.services.lok-sync.wantedBy = [ "default.target" ];
    systemd.user.services.lok-sync-gui.wantedBy =
      lib.mkIf cfg.gui.tray [ "graphical-session.target" ];

    networking.firewall = lib.mkIf cfg.openFirewall {
      allowedTCPPorts = [ cfg.port ];
      allowedUDPPorts = [ 5353 ];   # mDNS
    };
  };
}
```

Usage:

```nix
# flake inputs: loksync.url = "github:you/loksync";
{
  imports = [ loksync.nixosModules.default ];
  services.lok-sync = {
    enable = true;
    gui.tray = true;
    settings.battery.device = "BAT0";
  };
}
```

> Restrict the firewall rule to the LAN interface where possible, for example
> `networking.firewall.interfaces.wlan0.allowedTCPPorts = [ 47100 ];`.
> Test the module with `nixos-rebuild build-vm` before publishing.

### 6.4 Arch Linux (AUR)

Two packages: `lok-sync` (tagged releases) and `lok-sync-git` (latest main).

`PKGBUILD` (`lok-sync`):

```bash
# Maintainer: Your Name <you@example.com>
pkgname=lok-sync
pkgver=0.1.0
pkgrel=1
pkgdesc="Ultra-lightweight local phone <-> Linux sync daemon (notifications, battery, commands)"
arch=('x86_64' 'aarch64')
url="https://example.invalid/loksync"
license=('MIT')
depends=('systemd')                  # static build: no other runtime deps
optdepends=('mako: notification daemon for Wayland'
            'dunst: notification daemon'
            'waybar: battery module in the status bar')
makedepends=('cargo')
source=("$pkgname-$pkgver.tar.gz::$url/archive/v$pkgver.tar.gz")
sha256sums=('SKIP')                  # replace with the real checksum (updpkgsums)
options=('!lto')                     # the project sets its own LTO

prepare() {
  cd "$pkgname-$pkgver"
  export RUSTUP_TOOLCHAIN=stable
  cargo fetch --locked --target "$CARCH-unknown-linux-gnu"
}

build() {
  cd "$pkgname-$pkgver"
  export RUSTUP_TOOLCHAIN=stable CARGO_TARGET_DIR=target
  cargo build --frozen --release -p lok-sync-d -p lok-sync-gui
}

check() {
  cd "$pkgname-$pkgver"
  export RUSTUP_TOOLCHAIN=stable
  cargo test --frozen --workspace
}

package() {
  cd "$pkgname-$pkgver"
  install -Dm755 target/release/lok-sync-d   "$pkgdir/usr/bin/lok-sync-d"
  install -Dm755 target/release/lok-sync-gui "$pkgdir/usr/bin/lok-sync-gui"
  install -Dm644 dist/systemd/lok-sync.service     "$pkgdir/usr/lib/systemd/user/lok-sync.service"
  install -Dm644 dist/systemd/lok-sync.slice       "$pkgdir/usr/lib/systemd/user/lok-sync.slice"
  install -Dm644 dist/systemd/lok-sync-gui.service "$pkgdir/usr/lib/systemd/user/lok-sync-gui.service"
  install -Dm644 dist/config.toml "$pkgdir/etc/lok-sync/config.toml"
  install -Dm644 LICENSE "$pkgdir/usr/share/licenses/$pkgname/LICENSE"
}
```

Install and run:

```bash
yay -S lok-sync
systemctl --user enable --now lok-sync.service
```

Firewall (nftables, LAN only):

```nft
table inet filter {
  chain input {
    iifname "wlan0" tcp dport 47100 ct state new accept
    iifname "wlan0" udp dport 5353 accept
  }
}
```

### 6.5 Other distribution channels

| Channel | Notes |
|---------|-------|
| GitHub Releases | Static `musl` tarballs for x86_64 and aarch64 + SHA-256 sums + signatures |
| `.deb` / `.rpm` | Built with `cargo-deb` / `cargo-generate-rpm`; install the same unit files |
| Flatpak | Not recommended for the daemon (sandbox blocks sysfs/DBus-monitor access); fine for a GUI-only tool later |

---

## 7. Security Threat Model & Local Isolation

### 7.1 Assets

| Asset | Why it matters |
|-------|----------------|
| Notification content | Often contains OTP codes, private messages |
| Device identity keys | Allow impersonation of a paired device |
| Command execution ability | Direct control of the laptop |
| Battery / presence info | Low sensitivity, but reveals when a person is home |

### 7.2 Trust boundaries

```
 [Phone app] ═══ untrusted LAN (Wi-Fi) ═══ [lok-sync-d] ─── local user session ─── [DBus, sysfs, commands]
     ▲ trusted after pairing only                 ▲ semi-trusted: other local processes of the same user
```

### 7.3 Threats and mitigations

| # | Threat | Mitigation |
|---|--------|-----------|
| T1 | **Eavesdropping** on Wi-Fi | AES-128-GCM on every frame; no plaintext after the handshake |
| T2 | **MITM during pairing** | SPAKE2 over PIN/QR secret; attacker gets one guess per attempt; 120 s window; 3 failures close it; user confirms PIN on both screens |
| T3 | **MITM / spoofing after pairing** (rogue mDNS, ARP spoof) | Identity keys pinned at pairing; handshake signatures over a transcript hash; unknown or bad identity → silent close |
| T4 | **Replay** of captured frames | Implicit per-direction counters in the nonce; fresh ephemeral keys per connection |
| T5 | **Tampering / bit-flipping** | GCM authentication tag; any failure closes the session |
| T6 | **Past traffic decryption** after key theft | Ephemeral X25519 per session (forward secrecy) |
| T7 | **PIN brute force** | PAKE (no offline attack), attempt limits, short window, QR secret path with 128-bit entropy |
| T8 | **DoS: connection flood / slowloris** | Handshake timeout 5 s, max pending connections 16, per-IP limit, frame size cap, rate limit. `MemoryMax` prevents runaway growth |
| T9 | **Malicious notification content** (markup, huge images, link tricks, phishing look-alikes) | Plain-text default, size caps, image validation, rate limit, app label always prefixed with phone name so a fake "Bank" popup is visibly from the phone |
| T10 | **Malicious or stolen phone runs commands** | Commands are an **allow-list in config** (no shell, fixed `argv`, validated args); `commands` permission is off by default per peer; `require_confirm` shows a local approval prompt for risky ones; every run is logged |
| T11 | **Compromised phone app** | Per-peer permission scopes (`notifications`, `battery`, `commands`); instant revoke with `--unpair` |
| T12 | **Local unprivileged process abuses the daemon** | IPC socket `0600` under `$XDG_RUNTIME_DIR`; no TCP control port; keys readable only by the user |
| T13 | **Key theft from disk** | Keys at `$XDG_DATA_HOME/lok-sync/keys` mode `0600`; optional encryption with `systemd-creds` (TPM-bound) or the Secret Service; `zeroize` in memory; full-disk encryption recommended |
| T14 | **Memory-safety exploit in parser** | Rust; bounded decoders; fuzzing of `lok-proto` (`cargo-fuzz`); `panic=abort` limits undefined states |
| T15 | **Supply-chain attack on a crate** | `Cargo.lock` committed, `cargo deny` + `cargo audit` in CI, minimal dependency set, vendoring for release builds |
| T16 | **Traffic analysis** (timing, sizes) | Accepted risk in v1. Optional padding to 64-byte buckets is on the roadmap |
| T17 | **Lost / stolen laptop** | Paired phones can remove it; user can rotate by unpairing. Note: a thief with disk access and no disk encryption gets the keys, which is why T13 matters |

### 7.4 Local isolation summary

- **systemd sandbox:** `NoNewPrivileges`, `ProtectSystem=strict`, `PrivateTmp`, empty `CapabilityBoundingSet`, `SystemCallFilter=@system-service`, `RestrictAddressFamilies`, `MemoryDenyWriteExecute` (see §4.1.1).
- **Least privilege:** the daemon runs as the user, never root. It needs only: read `/sys/class/power_supply`, the session bus, a listening socket above port 1024, and its own state directory.
- **Network exposure:** bind only to private LAN interfaces; never `0.0.0.0` on a public interface. Refuse non-private source addresses (RFC 1918, link-local, ULA) by default (`network.allow_public = false`).
- **Command execution sandbox (recommended):** run commands through `systemd-run --user --scope` with a tight property set, or via a helper with its own seccomp filter, so an allow-listed command can be limited further.
- **Logging:** no payloads or secrets in logs; pairing events and command runs are logged with peer id and timestamp.
- **Update path:** signed releases; the daemon never auto-updates itself.

### 7.5 Known limits (be honest with users)

- Anyone with **access to your unlocked user account** on the laptop can use LokSync's stored keys.
- On a Wi-Fi with **client isolation**, discovery and connection will not work (by design of that network).
- AES-128-GCM requires nonce uniqueness. The design guarantees it through per-connection keys and counters, and any future change to framing must preserve that invariant (covered by a unit test).

---

## 8. Resource Budget & Verification

### 8.1 Target budget (RSS, steady state)

| Component | Target | Notes |
|-----------|--------|-------|
| `lok-sync-d` | **6–9 MB** | 1–4 threads, bounded buffers, 1–2 paired peers connected |
| `lok-sync-gui --tray` | **5–9 MB** | `ksni`, no toolkit |
| `lok-sync-gui --waybar` | **1–3 MB** | text only (use instead of tray, or both) |
| **Typical total** | **≈ 12–18 MB** | within the 20–25 MB ceiling, with headroom |

These are estimates. The CI gate below turns them into facts.

### 8.2 How to measure

```bash
# Per-process (PSS is fairer than RSS with shared libs)
smem -k -P 'lok-sync'
grep -E 'VmRSS|VmHWM|Threads' /proc/$(pidof lok-sync-d)/status

# Per-cgroup (what MemoryMax actually enforces, includes page cache)
systemd-cgtop --user -m
cat /sys/fs/cgroup/user.slice/user-$UID.slice/user@$UID.service/app.slice/lok-sync.slice/memory.current
```

### 8.3 CI regression gate

1. Start the daemon in a container with a **fake peer** that sends 10 000 notifications and battery updates at a realistic rate.
2. Sample `VmHWM` (peak RSS) at the end.
3. **Fail the build** if peak RSS of daemon > 12 MB or daemon + tray > 22 MB.
4. Also run: `cargo clippy -- -D warnings`, `cargo test`, `cargo deny check`, `cargo audit`, and a short `cargo fuzz` run on the frame decoder.

### 8.4 Latency targets

| Path | Target (same Wi-Fi) |
|------|---------------------|
| Phone notification → popup on Linux | < 100 ms typical (radio and Wi-Fi power-save dominate) |
| Command request → execution start | < 50 ms |
| Battery change → Waybar update | < 1 s |

Wi-Fi power-save on the phone can add delay. The Android client should hold a
high-performance Wi-Fi lock only while actively syncing and use a foreground
service so the OS does not kill the connection.

---

## 9. Roadmap & Open Questions

**Planned (post v1):**

- File and clipboard transfer (chunked, with progress)
- GNOME Shell and KDE Plasma widgets using the same IPC socket
- Optional frame padding against traffic analysis
- Multiple laptops per phone with per-device routing rules
- Shared-clipboard with explicit user confirmation

**Open questions to settle before implementation:**

1. **Phone platform order.** Android is the straightforward first target (NotificationListenerService, background services). iOS restricts notification access and background networking heavily; full feature parity is unlikely.
2. **Notification mirroring UX.** Should the phone keep its own notification when the laptop is the active device? (Suggested default: yes, with a "mark as read on both" option.)
3. **Allocator choice** (`musl` default vs `mimalloc`) — decide from the §8 benchmark.
4. **Secret storage default** — plain `0600` file vs `systemd-creds` vs Secret Service. Suggested default: `0600` file, with `systemd-creds` documented as a hardening step.
5. **mDNS library thread footprint** — confirm `mdns-sd` thread count and memory in the §8 test, else write a minimal responder.

---

*End of document.*
