use std::time::Duration;
use tokio::signal::unix::{signal, SignalKind};
use tokio::time::interval;
use tracing::{info, warn};

pub struct Supervisor;

impl Supervisor {
    pub fn notify_ready() {
        if let Err(e) = sd_notify::notify(true, &[sd_notify::NotifyState::Ready]) {
            warn!("Failed to send sd_notify READY: {e}");
        } else {
            info!("Sent sd_notify READY=1");
        }
    }

    pub fn notify_stopping() {
        let _ = sd_notify::notify(true, &[sd_notify::NotifyState::Stopping]);
    }

    pub fn start_watchdog_task() {
        tokio::spawn(async move {
            let mut tick = interval(Duration::from_secs(15));
            loop {
                tick.tick().await;
                let _ = sd_notify::notify(false, &[sd_notify::NotifyState::Watchdog]);
            }
        });
    }

    pub async fn wait_for_shutdown_or_reload() -> ShutdownSignal {
        let mut sigterm = signal(SignalKind::terminate()).expect("Failed to bind SIGTERM");
        let mut sigint = signal(SignalKind::interrupt()).expect("Failed to bind SIGINT");
        let mut sighup = signal(SignalKind::hangup()).expect("Failed to bind SIGHUP");

        tokio::select! {
            _ = sigterm.recv() => {
                info!("Received SIGTERM");
                ShutdownSignal::Terminate
            }
            _ = sigint.recv() => {
                info!("Received SIGINT");
                ShutdownSignal::Terminate
            }
            _ = sighup.recv() => {
                info!("Received SIGHUP (reload config)");
                ShutdownSignal::Reload
            }
        }
    }
}

pub enum ShutdownSignal {
    Terminate,
    Reload,
}
