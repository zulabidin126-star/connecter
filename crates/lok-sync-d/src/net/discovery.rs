use mdns_sd::{ServiceDaemon, ServiceInfo};
use std::collections::HashMap;
use tracing::{error, info, warn};

pub struct DiscoveryService {
    daemon: Option<ServiceDaemon>,
    fullname: Option<String>,
}

impl DiscoveryService {
    pub fn new() -> Self {
        match ServiceDaemon::new() {
            Ok(daemon) => Self {
                daemon: Some(daemon),
                fullname: None,
            },
            Err(e) => {
                warn!("Could not start mDNS daemon: {e}. Network discovery may be limited.");
                Self {
                    daemon: None,
                    fullname: None,
                }
            }
        }
    }

    pub fn register(
        &mut self,
        device_name: &str,
        device_id_hex: &str,
        port: u16,
    ) {
        let daemon = match self.daemon.as_ref() {
            Some(d) => d,
            None => return,
        };

        let service_type = "_loksync._tcp.local.";
        let short_id = if device_id_hex.len() >= 8 {
            &device_id_hex[..8]
        } else {
            device_id_hex
        };
        let instance_name = format!("{}-{}", device_name.replace(' ', "-"), short_id);

        let mut properties = HashMap::new();
        properties.insert("v".to_string(), "1".to_string());
        properties.insert("id".to_string(), short_id.to_string());
        properties.insert("name".to_string(), device_name.to_string());

        let host_name = format!("{}.local.", instance_name);

        match ServiceInfo::new(
            service_type,
            &instance_name,
            &host_name,
            "",
            port,
            properties,
        ) {
            Ok(service_info) => {
                let fullname = service_info.get_fullname().to_string();
                if let Err(e) = daemon.register(service_info) {
                    error!("Failed to register mDNS service: {e}");
                } else {
                    info!(
                        service = %fullname,
                        port = port,
                        "Announced LokSync service via mDNS"
                    );
                    self.fullname = Some(fullname);
                }
            }
            Err(e) => {
                error!("Failed to create mDNS ServiceInfo: {e}");
            }
        }
    }

    pub fn unregister(&mut self) {
        if let (Some(daemon), Some(fullname)) = (self.daemon.as_ref(), self.fullname.take()) {
            if let Err(e) = daemon.unregister(&fullname) {
                warn!("Failed to unregister mDNS service: {e}");
            } else {
                info!("Unregistered mDNS service");
            }
        }
    }
}

impl Drop for DiscoveryService {
    fn drop(&mut self) {
        self.unregister();
    }
}
