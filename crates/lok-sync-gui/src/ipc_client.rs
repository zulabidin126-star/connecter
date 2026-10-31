use lok_proto::ipc::{IpcRequest, IpcResponse, StateSnapshot};
use std::path::PathBuf;
use std::time::Duration;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::UnixStream;
use tokio::time::sleep;

pub fn get_socket_path() -> PathBuf {
    if let Ok(runtime_dir) = std::env::var("XDG_RUNTIME_DIR") {
        PathBuf::from(runtime_dir).join("lok-sync/ctl.sock")
    } else {
        PathBuf::from("/tmp/lok-sync/ctl.sock")
    }
}

pub struct IpcClient {
    stream: UnixStream,
}

impl IpcClient {
    /// Attempts to connect to the daemon's Unix socket.
    pub async fn connect() -> Result<Self, std::io::Error> {
        let path = get_socket_path();
        let stream = UnixStream::connect(path).await?;
        Ok(Self { stream })
    }

    /// Connects with retry and backoff until daemon is available.
    #[allow(dead_code)]
    pub async fn connect_with_retry() -> Self {
        loop {
            match Self::connect().await {
                Ok(client) => return client,
                Err(_) => {
                    sleep(Duration::from_secs(2)).await;
                }
            }
        }
    }

    /// Sends an IPC request and reads the single response line.
    pub async fn request(&mut self, req: &IpcRequest) -> Result<IpcResponse, String> {
        let mut json = serde_json::to_string(req).map_err(|e| e.to_string())?;
        json.push('\n');
        self.stream
            .write_all(json.as_bytes())
            .await
            .map_err(|e| format!("Write failed: {e}"))?;

        let mut reader = BufReader::new(&mut self.stream);
        let mut line = String::new();
        reader
            .read_line(&mut line)
            .await
            .map_err(|e| format!("Read response failed: {e}"))?;

        serde_json::from_str(&line).map_err(|e| format!("Decode response failed: {e}"))
    }

    /// Fetches the current state snapshot.
    pub async fn get_state(&mut self) -> Result<StateSnapshot, String> {
        match self.request(&IpcRequest::GetState).await? {
            IpcResponse::State(s) => Ok(s),
            IpcResponse::Error { message, .. } => Err(message),
            _ => Err("Unexpected response type".into()),
        }
    }

    /// Subscribes to daemon events and streams them.
    pub async fn subscribe(mut self) -> Result<tokio::net::unix::OwnedReadHalf, String> {
        let mut json = serde_json::to_string(&IpcRequest::Subscribe).map_err(|e| e.to_string())?;
        json.push('\n');
        self.stream
            .write_all(json.as_bytes())
            .await
            .map_err(|e| format!("Write failed: {e}"))?;

        let (reader, _) = self.stream.into_split();
        Ok(reader)
    }
}
