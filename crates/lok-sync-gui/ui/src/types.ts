export interface PeerBattery {
  percent: number;
  charging: boolean;
  ts: number;
}

export interface PeerInfo {
  id: string;
  name: string;
  online: boolean;
  battery: PeerBattery | null;
  last_seen: number;
}

export interface StateSnapshot {
  device_name: string;
  device_id: string;
  daemon_version?: string;
  local_battery: PeerBattery | null;
  peers: PeerInfo[];
  pairing_active?: boolean;
  socket_path?: string;
}

export interface SyncedNotification {
  id: number;
  app: string;
  title: string;
  body: string;
  peer_id: string;
  peer_name: string;
  time_str: string;
  received_at: number;
  direction?: 'phone_to_laptop' | 'laptop_to_phone';
}

export interface PairingState {
  is_open: boolean;
  pin: string;
  qr: string;
  expires_in_secs: number;
  started_at: number;
  status: string;
}

export interface GuiSettings {
  autostart: boolean;
  plain_text_only: boolean;
  hide_body_when_locked: boolean;
  forward_laptop_to_phone: boolean;
  device_name: string;
  port: number;
}

export interface MediaPlayerInfo {
  title: string;
  artist: string;
  album: string;
  status: string; // "Playing" | "Paused" | "Stopped"
  player_name: string;
}

export interface SystemdServiceStatus {
  active: boolean;
  enabled: boolean;
  status_text: string;
}

export type ActiveTab = 'dashboard' | 'notifications' | 'media' | 'clipboard' | 'settings';
