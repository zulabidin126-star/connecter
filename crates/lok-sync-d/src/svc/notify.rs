use crate::config::NotificationsConfig;
use futures_util::StreamExt;
use lok_proto::msg::NotifPost;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{mpsc, Mutex};
use tracing::{error, info, warn};
use zbus::{proxy, zvariant::Value};

pub enum NotifReturnEvent {
    Dismiss {
        peer_id: String,
        phone_id: u32,
    },
    Action {
        peer_id: String,
        phone_id: u32,
        action: String,
        reply: Option<String>,
    },
}

#[proxy(
    interface = "org.freedesktop.Notifications",
    default_service = "org.freedesktop.Notifications",
    default_path = "/org/freedesktop/Notifications"
)]
trait Notifications {
    #[allow(clippy::too_many_arguments)]
    fn notify(
        &self,
        app_name: &str,
        replaces_id: u32,
        app_icon: &str,
        summary: &str,
        body: &str,
        actions: &[&str],
        hints: HashMap<&str, Value<'_>>,
        expire_timeout: i32,
    ) -> zbus::Result<u32>;

    fn close_notification(&self, id: u32) -> zbus::Result<()>;

    #[zbus(signal)]
    fn notification_closed(&self, id: u32, reason: u32) -> zbus::Result<()>;

    #[zbus(signal)]
    fn action_invoked(&self, id: u32, action_key: &str) -> zbus::Result<()>;
}

struct RateLimiter {
    count_limit: u32,
    window: Duration,
    history: HashMap<String, Vec<Instant>>,
}

impl RateLimiter {
    fn new(count_limit: u32, per_seconds: u64) -> Self {
        Self {
            count_limit,
            window: Duration::from_secs(per_seconds),
            history: HashMap::new(),
        }
    }

    fn check_and_record(&mut self, peer_id: &str) -> bool {
        let now = Instant::now();
        let entries = self.history.entry(peer_id.to_string()).or_default();
        entries.retain(|t| now.duration_since(*t) < self.window);
        if entries.len() >= self.count_limit as usize {
            false
        } else {
            entries.push(now);
            true
        }
    }
}

pub struct NotifyService {
    config: NotificationsConfig,
    rate_limiter: Arc<Mutex<RateLimiter>>,
    dbus_to_phone: Arc<Mutex<HashMap<u32, (String, u32)>>>,
    phone_to_dbus: Arc<Mutex<HashMap<(String, u32), u32>>>,
    proxy: Option<NotificationsProxy<'static>>,
}

impl NotifyService {
    pub async fn new(
        config: NotificationsConfig,
        event_tx: mpsc::Sender<NotifReturnEvent>,
    ) -> Self {
        let rate_limiter = Arc::new(Mutex::new(RateLimiter::new(
            config.rate_limit.count,
            config.rate_limit.per_seconds,
        )));
        let dbus_to_phone = Arc::new(Mutex::new(HashMap::new()));
        let phone_to_dbus = Arc::new(Mutex::new(HashMap::new()));

        let mut proxy = None;
        if config.sink == "dbus" {
            match zbus::Connection::session().await {
                Ok(conn) => match NotificationsProxy::new(&conn).await {
                    Ok(p) => {
                        info!("Connected to DBus session bus for notifications");
                        setup_signal_listeners(&p, dbus_to_phone.clone(), event_tx).await;
                        proxy = Some(p);
                    }
                    Err(e) => {
                        warn!("Could not create NotificationsProxy: {e}. Falling back to journal.");
                    }
                },
                Err(e) => {
                    warn!("DBus session bus not available ({e}). Falling back to journal notifications.");
                }
            }
        }

        Self {
            config,
            rate_limiter,
            dbus_to_phone,
            phone_to_dbus,
            proxy,
        }
    }

    pub async fn handle_notif_post(&self, peer_id: &str, peer_name: &str, notif: NotifPost) {
        if !self.config.enabled {
            return;
        }

        // Rate limit check
        {
            let mut limiter = self.rate_limiter.lock().await;
            if !limiter.check_and_record(peer_id) {
                warn!(peer = %peer_id, "Notification rate limit exceeded, dropping");
                return;
            }
        }

        let app_label = format!("{} ({})", notif.app, peer_name);
        let summary = sanitize_text(&notif.title);
        let body = if self.config.plain_text_only {
            strip_markup(&notif.body)
        } else {
            sanitize_text(&notif.body)
        };

        if let Some(ref proxy) = self.proxy {
            let key = (peer_id.to_string(), notif.id);
            let replaces_id = {
                let map = self.phone_to_dbus.lock().await;
                map.get(&key).copied().unwrap_or(0)
            };

            let mut hints = HashMap::new();
            hints.insert("x-loksync-id", Value::from(notif.id));
            hints.insert("x-loksync-peer", Value::from(peer_id));

            let mut actions_flat = Vec::new();
            for act in &notif.actions {
                actions_flat.push(act.as_str());
                actions_flat.push(act.as_str());
            }

            match proxy
                .notify(
                    &app_label,
                    replaces_id,
                    "",
                    &summary,
                    &body,
                    &actions_flat,
                    hints,
                    -1,
                )
                .await
            {
                Ok(dbus_id) => {
                    let mut p2d = self.phone_to_dbus.lock().await;
                    let mut d2p = self.dbus_to_phone.lock().await;
                    p2d.insert(key, dbus_id);
                    d2p.insert(dbus_id, (peer_id.to_string(), notif.id));

                    if p2d.len() > 64 {
                        p2d.clear();
                        d2p.clear();
                    }
                }
                Err(e) => {
                    error!("Failed to deliver DBus notification: {e}");
                }
            }
        } else {
            info!(
                target: "loksync::notif",
                "[{}] {}: {}",
                app_label, summary, body
            );
        }
    }

    pub async fn handle_notif_dismiss(&self, peer_id: &str, notif_id: u32) {
        let key = (peer_id.to_string(), notif_id);
        let dbus_id = {
            let mut map = self.phone_to_dbus.lock().await;
            map.remove(&key)
        };

        if let (Some(dbus_id), Some(proxy)) = (dbus_id, &self.proxy) {
            let mut d2p = self.dbus_to_phone.lock().await;
            d2p.remove(&dbus_id);
            let _ = proxy.close_notification(dbus_id).await;
        }
    }
}

async fn setup_signal_listeners(
    proxy: &NotificationsProxy<'static>,
    dbus_to_phone: Arc<Mutex<HashMap<u32, (String, u32)>>>,
    event_tx: mpsc::Sender<NotifReturnEvent>,
) {
    let mut closed_stream = match proxy.receive_notification_closed().await {
        Ok(s) => s,
        Err(e) => {
            warn!("Could not listen for NotificationClosed signal: {e}");
            return;
        }
    };

    let mut action_stream = match proxy.receive_action_invoked().await {
        Ok(s) => s,
        Err(e) => {
            warn!("Could not listen for ActionInvoked signal: {e}");
            return;
        }
    };

    tokio::spawn(async move {
        loop {
            tokio::select! {
                Some(signal) = closed_stream.next() => {
                    if let Ok(args) = signal.args() {
                        let id = args.id;
                        let reason = args.reason;
                        if reason == 2 {
                            let mut map = dbus_to_phone.lock().await;
                            if let Some((peer_id, phone_id)) = map.remove(&id) {
                                let _ = event_tx
                                    .send(NotifReturnEvent::Dismiss {
                                        peer_id,
                                        phone_id,
                                    })
                                    .await;
                            }
                        }
                    }
                }
                Some(signal) = action_stream.next() => {
                    if let Ok(args) = signal.args() {
                        let id = args.id;
                        let action_key = args.action_key;
                        let map = dbus_to_phone.lock().await;
                        if let Some((peer_id, phone_id)) = map.get(&id) {
                            let _ = event_tx
                                .send(NotifReturnEvent::Action {
                                    peer_id: peer_id.clone(),
                                    phone_id: *phone_id,
                                    action: action_key.to_string(),
                                    reply: None,
                                })
                                .await;
                        }
                    }
                }
            }
        }
    });
}

fn sanitize_text(text: &str) -> String {
    let mut clean: String = text.chars().take(1024).collect();
    if text.chars().count() > 1024 {
        clean.push('…');
    }
    clean
}

fn strip_markup(text: &str) -> String {
    let mut in_tag = false;
    let mut out = String::with_capacity(text.len());
    for c in text.chars().take(8192) {
        if c == '<' {
            in_tag = true;
        } else if c == '>' {
            in_tag = false;
        } else if !in_tag {
            out.push(c);
        }
    }
    if text.chars().count() > 8192 {
        out.push('…');
    }
    out
}
