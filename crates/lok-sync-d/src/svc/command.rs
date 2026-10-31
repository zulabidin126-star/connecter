use crate::config::Config;
use lok_proto::msg::Msg;
use std::time::Duration;
use tokio::process::Command;
use tokio::time::timeout;
use tracing::{error, info, warn};

pub const COMMAND_TIMEOUT: Duration = Duration::from_secs(10);
pub const MAX_OUTPUT_BYTES: usize = 4096;

pub async fn execute_command(
    config: &Config,
    req_id: u32,
    cmd_name: &str,
    args: &[String],
    peer_id: &str,
) -> Msg {
    info!(peer = %peer_id, cmd = %cmd_name, req_id = %req_id, "Executing allow-listed command");

    let cmd_spec = match config.commands.get(cmd_name) {
        Some(spec) => spec,
        None => {
            warn!(cmd = %cmd_name, "Rejecting command not in allow-list");
            return Msg::CmdResult {
                req_id,
                code: 127,
                out: format!("Command '{cmd_name}' is not allow-listed").into_bytes(),
            };
        }
    };

    if cmd_spec.argv.is_empty() {
        return Msg::CmdResult {
            req_id,
            code: 1,
            out: b"Command spec has empty argv".to_vec(),
        };
    }

    let program = &cmd_spec.argv[0];
    let base_args = &cmd_spec.argv[1..];

    let mut cmd = Command::new(program);
    cmd.args(base_args);
    // Append client-provided arguments (capped & validated by lok-proto)
    cmd.args(args);

    let child = cmd.output();
    match timeout(COMMAND_TIMEOUT, child).await {
        Ok(Ok(output)) => {
            let code = output.status.code().unwrap_or(-1);
            let mut out = output.stdout;
            if !output.stderr.is_empty() {
                if !out.is_empty() {
                    out.push(b'\n');
                }
                out.extend_from_slice(&output.stderr);
            }
            if out.len() > MAX_OUTPUT_BYTES {
                out.truncate(MAX_OUTPUT_BYTES);
            }
            Msg::CmdResult { req_id, code, out }
        }
        Ok(Err(e)) => {
            error!(cmd = %cmd_name, "Failed to spawn command: {e}");
            Msg::CmdResult {
                req_id,
                code: -1,
                out: format!("Failed to spawn command: {e}").into_bytes(),
            }
        }
        Err(_) => {
            warn!(cmd = %cmd_name, "Command execution timed out after 10 seconds");
            Msg::CmdResult {
                req_id,
                code: 124,
                out: b"Command timed out".to_vec(),
            }
        }
    }
}
