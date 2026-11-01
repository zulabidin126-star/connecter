use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    #[serde(default)]
    pub network: NetworkConfig,
    #[serde(default)]
    pub notifications: NotificationsConfig,
    #[serde(default)]
    pub battery: BatteryConfig,
    #[serde(default)]
    pub commands: HashMap<String, CommandConfig>,
}

impl Default for Config {
    fn default() -> Self {
        let mut commands = HashMap::new();
        commands.insert(
            "lock-screen".into(),
            CommandConfig {
                argv: vec!["loginctl".into(), "lock-session".into()],
                require_confirm: false,
            },
        );
        commands.insert(
            "suspend".into(),
            CommandConfig {
                argv: vec!["systemctl".into(), "suspend".into()],
                require_confirm: true,
            },
        );
        commands.insert(
            "volume-up".into(),
            CommandConfig {
                argv: vec![
                    "wpctl".into(),
                    "set-volume".into(),
                    "@DEFAULT_AUDIO_SINK@".into(),
                    "5%+".into(),
                ],
                require_confirm: false,
            },
        );
        commands.insert(
            "play-pause".into(),
            CommandConfig {
                argv: vec!["playerctl".into(), "play-pause".into()],
                require_confirm: false,
            },
        );

        Self {
            network: NetworkConfig::default(),
            notifications: NotificationsConfig::default(),
            battery: BatteryConfig::default(),
            commands,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    #[serde(default = "default_port")]
    pub port: u16,
    #[serde(default)]
    pub interfaces: Vec<String>,
    #[serde(default = "default_max_peers")]
    pub max_peers: usize,
}

fn default_port() -> u16 {
    47100
}
fn default_max_peers() -> usize {
    8
}

impl Default for NetworkConfig {
    fn default() -> Self {
        Self {
            port: default_port(),
            interfaces: Vec::new(),
            max_peers: default_max_peers(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitConfig {
    #[serde(default = "default_rate_limit_count")]
    pub count: u32,
    #[serde(default = "default_rate_limit_secs")]
    pub per_seconds: u64,
}

fn default_rate_limit_count() -> u32 {
    10
}
fn default_rate_limit_secs() -> u64 {
    10
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            count: default_rate_limit_count(),
            per_seconds: default_rate_limit_secs(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationsConfig {
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default = "default_sink")]
    pub sink: String,
    #[serde(default = "default_true")]
    pub plain_text_only: bool,
    #[serde(default = "default_true")]
    pub hide_body_when_locked: bool,
    #[serde(default)]
    pub rate_limit: RateLimitConfig,
    #[serde(default)]
    pub forward_laptop_to_phone: bool,
}

fn default_true() -> bool {
    true
}
fn default_sink() -> String {
    "dbus".into()
}

impl Default for NotificationsConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            sink: default_sink(),
            plain_text_only: true,
            hide_body_when_locked: true,
            rate_limit: RateLimitConfig::default(),
            forward_laptop_to_phone: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatteryConfig {
    #[serde(default = "default_device")]
    pub device: String,
    #[serde(default = "default_poll_seconds")]
    pub poll_seconds: u64,
}

fn default_device() -> String {
    "auto".into()
}
fn default_poll_seconds() -> u64 {
    10
}

impl Default for BatteryConfig {
    fn default() -> Self {
        Self {
            device: default_device(),
            poll_seconds: default_poll_seconds(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandConfig {
    pub argv: Vec<String>,
    #[serde(default)]
    pub require_confirm: bool,
}

impl Config {
    /// Loads configuration with cascading priority:
    /// 1. Built-in defaults
    /// 2. /etc/lok-sync/config.toml
    /// 3. ~/.config/lok-sync/config.toml
    /// 4. Explicit CLI path (if provided)
    pub fn load(cli_path: Option<&Path>) -> Self {
        let mut config = Config::default();

        let system_path = Path::new("/etc/lok-sync/config.toml");
        if system_path.is_file() {
            if let Ok(content) = std::fs::read_to_string(system_path) {
                if let Ok(parsed) = toml::from_str::<Config>(&content) {
                    config = parsed;
                }
            }
        }

        if let Some(user_config) = user_config_path() {
            if user_config.is_file() {
                if let Ok(content) = std::fs::read_to_string(user_config) {
                    if let Ok(parsed) = toml::from_str::<Config>(&content) {
                        config = parsed;
                    }
                }
            }
        }

        if let Some(path) = cli_path {
            if path.is_file() {
                if let Ok(content) = std::fs::read_to_string(path) {
                    if let Ok(parsed) = toml::from_str::<Config>(&content) {
                        config = parsed;
                    }
                }
            }
        }

        config
    }
}

pub fn user_config_path() -> Option<PathBuf> {
    if let Ok(xdg) = std::env::var("XDG_CONFIG_HOME") {
        Some(PathBuf::from(xdg).join("lok-sync/config.toml"))
    } else if let Ok(home) = std::env::var("HOME") {
        Some(PathBuf::from(home).join(".config/lok-sync/config.toml"))
    } else {
        None
    }
}
