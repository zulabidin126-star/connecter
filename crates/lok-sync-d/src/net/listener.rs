use std::net::{IpAddr, SocketAddr};
use tokio::net::{TcpListener, TcpStream};
use tracing::{debug, info, warn};

pub struct NetworkListener {
    listener: TcpListener,
}

impl NetworkListener {
    pub async fn bind(port: u16, _interfaces: &[String]) -> std::io::Result<Self> {
        let addr = SocketAddr::from(([0, 0, 0, 0], port));
        let listener = TcpListener::bind(addr).await?;
        info!(port = port, "TCP listener bound on 0.0.0.0:{}", port);
        Ok(Self { listener })
    }

    pub async fn accept(&self) -> std::io::Result<(TcpStream, SocketAddr)> {
        loop {
            let (stream, peer_addr) = self.listener.accept().await?;
            if !is_private_or_local(peer_addr.ip()) {
                warn!(ip = %peer_addr.ip(), "Rejecting connection from non-private IP address");
                continue;
            }

            // Configure socket options: TCP_NODELAY
            if let Err(e) = stream.set_nodelay(true) {
                debug!("Failed to set TCP_NODELAY: {e}");
            }

            return Ok((stream, peer_addr));
        }
    }

    pub fn local_addr(&self) -> std::io::Result<SocketAddr> {
        self.listener.local_addr()
    }
}

/// Checks whether an IP address belongs to RFC 1918, link-local, loopback, or IPv6 ULA/link-local.
pub fn is_private_or_local(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            v4.is_loopback()
                || v4.is_private()
                || v4.is_link_local()
                || v4.octets()[0] == 100 // CGNAT RFC 6598
        }
        IpAddr::V6(v6) => {
            v6.is_loopback()
                || (v6.segments()[0] & 0xfe00) == 0xfc00 // Unique Local Address (fc00::/7)
                || (v6.segments()[0] & 0xffc0) == 0xfe80 // Link-Local (fe80::/10)
        }
    }
}
