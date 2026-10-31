use crate::state::SharedState;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;
use tokio::sync::broadcast;
use tracing::{debug, info};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BatteryState {
    pub percent: u8,
    pub charging: bool,
}

pub struct BatteryService {
    device_dir: Option<PathBuf>,
    last_state: Option<BatteryState>,
    state: SharedState,
    battery_tx: broadcast::Sender<BatteryState>,
}

impl BatteryService {
    pub fn new(
        state: SharedState,
        preferred_device: &str,
        battery_tx: broadcast::Sender<BatteryState>,
    ) -> Self {
        let device_dir = find_battery_device(preferred_device);
        if let Some(ref d) = device_dir {
            info!("Found battery device at {:?}", d);
        } else {
            info!("No system battery found (/sys/class/power_supply). Laptop battery reporting disabled.");
        }

        Self {
            device_dir,
            last_state: None,
            state,
            battery_tx,
        }
    }

    pub fn read_current(&self) -> Option<BatteryState> {
        let dir = self.device_dir.as_ref()?;
        read_battery_from_sysfs(dir)
    }

    pub async fn poll_and_update(&mut self) -> Option<BatteryState> {
        let current = self.read_current()?;

        let changed = match self.last_state {
            Some(prev) => {
                prev.charging != current.charging
                    || (prev.percent != current.percent && (current.percent.abs_diff(prev.percent) >= 1))
            }
            None => true,
        };

        if changed {
            debug!(
                percent = current.percent,
                charging = current.charging,
                "Battery state changed"
            );
            self.last_state = Some(current);

            // Update app state
            {
                let mut guard = self.state.write().await;
                guard.update_local_battery(current.percent, current.charging);
            }

            // Notify session router & IPC
            let _ = self.battery_tx.send(current);
        }

        Some(current)
    }

    pub async fn run_loop(mut self, poll_secs: u64) {
        if self.device_dir.is_none() {
            return;
        }

        let mut interval = tokio::time::interval(Duration::from_secs(poll_secs.max(5)));

        // Try to initialize netlink uevent socket via rustix if supported
        let mut uevent_fd = setup_uevent_socket();

        loop {
            tokio::select! {
                _ = interval.tick() => {
                    self.poll_and_update().await;
                }
                Some(()) = async {
                    if let Some(ref mut fd) = uevent_fd {
                        wait_for_uevent(fd).await
                    } else {
                        futures_util_never().await
                    }
                } => {
                    self.poll_and_update().await;
                }
            }
        }
    }
}

fn find_battery_device(preferred: &str) -> Option<PathBuf> {
    let power_supply = Path::new("/sys/class/power_supply");
    if !power_supply.is_dir() {
        return None;
    }

    if preferred != "auto" && !preferred.is_empty() {
        let path = power_supply.join(preferred);
        if path.is_dir() {
            return Some(path);
        }
    }

    let mut fallback = None;
    if let Ok(entries) = fs::read_dir(power_supply) {
        for entry in entries.flatten() {
            let path = entry.path();
            let type_path = path.join("type");
            if let Ok(type_str) = fs::read_to_string(type_path) {
                if type_str.trim().eq_ignore_ascii_case("Battery") {
                    let scope_path = path.join("scope");
                    let is_device_scope = fs::read_to_string(scope_path)
                        .map(|s| s.trim().eq_ignore_ascii_case("Device"))
                        .unwrap_or(false);

                    if !is_device_scope {
                        return Some(path);
                    } else if fallback.is_none() {
                        fallback = Some(path);
                    }
                }
            }
        }
    }
    fallback
}

fn read_battery_from_sysfs(dir: &Path) -> Option<BatteryState> {
    let capacity_str = fs::read_to_string(dir.join("capacity")).ok()?;
    let raw_percent: u8 = capacity_str.trim().parse().ok()?;
    let percent = raw_percent.min(100);

    let status = fs::read_to_string(dir.join("status")).unwrap_or_default();
    let status_trim = status.trim();
    let charging = status_trim.eq_ignore_ascii_case("Charging")
        || status_trim.eq_ignore_ascii_case("Full");

    Some(BatteryState { percent, charging })
}

#[cfg(target_os = "linux")]
fn setup_uevent_socket() -> Option<std::os::unix::io::RawFd> {
    unsafe {
        let fd = libc::socket(
            libc::AF_NETLINK,
            libc::SOCK_RAW | libc::SOCK_NONBLOCK | libc::SOCK_CLOEXEC,
            libc::NETLINK_KOBJECT_UEVENT,
        );
        if fd < 0 {
            return None;
        }

        let mut sa: libc::sockaddr_nl = std::mem::zeroed();
        sa.nl_family = libc::AF_NETLINK as u16;
        sa.nl_pid = std::process::id();
        sa.nl_groups = 1; // multicast group 1 (kernel uevents)

        let res = libc::bind(
            fd,
            &sa as *const _ as *const libc::sockaddr,
            std::mem::size_of::<libc::sockaddr_nl>() as libc::socklen_t,
        );
        if res < 0 {
            libc::close(fd);
            return None;
        }

        Some(fd)
    }
}

#[cfg(not(target_os = "linux"))]
fn setup_uevent_socket() -> Option<i32> {
    None
}

#[cfg(target_os = "linux")]
#[allow(deprecated)]
async fn wait_for_uevent(raw_fd: &mut std::os::unix::io::RawFd) -> Option<()> {
    use tokio::io::unix::AsyncFd;
    let async_fd = AsyncFd::new(*raw_fd).ok()?;
    let mut guard = async_fd.readable().await.ok()?;
    guard.clear_ready();
    // Flush pending bytes with libc::recv
    let mut buf = [0u8; 1024];
    unsafe {
        let _ = libc::recv(
            *raw_fd,
            buf.as_mut_ptr() as *mut libc::c_void,
            buf.len(),
            libc::MSG_DONTWAIT,
        );
    }
    Some(())
}

#[cfg(not(target_os = "linux"))]
async fn wait_for_uevent(_fd: &mut i32) -> Option<()> {
    None
}

async fn futures_util_never() -> Option<()> {
    std::future::pending::<()>().await;
    None
}
