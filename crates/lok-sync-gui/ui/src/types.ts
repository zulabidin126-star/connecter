export interface LocalBattery {
  percent: number;
  charging: boolean;
  plugged: boolean;
  timestamp: number;
}

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
  local_battery: LocalBattery | null;
  peers: PeerInfo[];
  socket_path: string;
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
  device_name: string;
  port: number;
}

export type ActiveTab = 'dashboard' | 'notifications' | 'settings';
