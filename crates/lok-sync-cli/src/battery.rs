use lok_proto::ipc::PeerBattery;
use std::fs;
use std::path::Path;

pub fn read_host_battery() -> Option<PeerBattery> {
    let power_supply = Path::new("/sys/class/power_supply");
    if !power_supply.is_dir() {
        return None;
    }

    let mut bat_dir = None;
    if let Ok(entries) = fs::read_dir(power_supply) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Ok(type_str) = fs::read_to_string(path.join("type")) {
                if type_str.trim().eq_ignore_ascii_case("Battery") {
                    bat_dir = Some(path);
                    break;
                }
            }
        }
    }

    let dir = bat_dir?;
    let capacity_str = fs::read_to_string(dir.join("capacity")).ok()?;
    let percent: u8 = capacity_str.trim().parse().ok()?;
    let status = fs::read_to_string(dir.join("status")).unwrap_or_default();
    let charging = status.trim().eq_ignore_ascii_case("Charging")
        || status.trim().eq_ignore_ascii_case("Full");

    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    Some(PeerBattery {
        percent: percent.min(100),
        charging,
        ts,
    })
}
