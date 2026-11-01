import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { NotificationsHub } from './components/NotificationsHub';
import { MediaController } from './components/MediaController';
import { ClipboardView } from './components/ClipboardView';
import { SettingsView } from './components/SettingsView';
import { PairingModal } from './components/PairingModal';
import type {
  ActiveTab,
  StateSnapshot,
  SyncedNotification,
  PairingState,
  GuiSettings,
  MediaPlayerInfo,
  SystemdServiceStatus,
} from './types';

// Tauri invoke and listen helpers (safe fallback if opened in browser)
let tauriInvoke: (<T>(cmd: string, args?: Record<string, unknown>) => Promise<T>) | null = null;
let tauriListen: (<T>(event: string, handler: (e: { payload: T }) => void) => Promise<() => void>) | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const core = (window as any).__TAURI__?.core;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const event = (window as any).__TAURI__?.event;
  if (core?.invoke) {
    tauriInvoke = core.invoke;
  }
  if (event?.listen) {
    tauriListen = event.listen;
  }
} catch {
  // running in browser / mock mode
}

const DEFAULT_SNAPSHOT: StateSnapshot = {
  device_name: 'Linux-Machine',
  device_id: '3eae2431',
  local_battery: {
    percent: 88,
    charging: true,
    plugged: true,
    timestamp: Date.now(),
  },
  peers: [],
  socket_path: '/run/user/1000/lok-sync/ctl.sock',
};

const DEFAULT_SETTINGS: GuiSettings = {
  autostart: true,
  plain_text_only: true,
  hide_body_when_locked: true,
  forward_laptop_to_phone: true,
  device_name: 'Linux-Machine',
  port: 47100,
};

const DEFAULT_MEDIA: MediaPlayerInfo = {
  title: 'No Media Playing',
  artist: 'None',
  album: '',
  status: 'Stopped',
  player_name: 'MPRIS',
};

const DEFAULT_SYSTEMD: SystemdServiceStatus = {
  active: false,
  enabled: true,
  status_text: 'Inactive',
};

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [snapshot, setSnapshot] = useState<StateSnapshot | null>(DEFAULT_SNAPSHOT);
  const [mediaInfo, setMediaInfo] = useState<MediaPlayerInfo | null>(DEFAULT_MEDIA);
  const [systemdStatus, setSystemdStatus] = useState<SystemdServiceStatus | null>(DEFAULT_SYSTEMD);
  const [clipboardContent, setClipboardContent] = useState<string>('');
  const [isConnected, setIsConnected] = useState(true);
  const [notifications, setNotifications] = useState<SyncedNotification[]>([]);
  const [settings, setSettings] = useState<GuiSettings>(DEFAULT_SETTINGS);
  const [toast, setToast] = useState<string | null>(null);

  const [pairingState, setPairingState] = useState<PairingState>({
    is_open: false,
    pin: '',
    qr: '',
    expires_in_secs: 120,
    started_at: Date.now(),
    status: 'Waiting for device to enter PIN...',
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Fetch status snapshot from daemon
  const refreshStatus = useCallback(async () => {
    if (!tauriInvoke) return;
    try {
      const snap = await tauriInvoke<StateSnapshot>('get_daemon_status');
      setSnapshot(snap);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    }
  }, []);

  // Fetch media status via MPRIS
  const refreshMedia = useCallback(async () => {
    if (!tauriInvoke) return;
    try {
      const media = await tauriInvoke<MediaPlayerInfo>('get_media_status');
      setMediaInfo(media);
    } catch {
      // ignore
    }
  }, []);

  // Fetch systemd user service status
  const refreshSystemd = useCallback(async () => {
    if (!tauriInvoke) return;
    try {
      const status = await tauriInvoke<SystemdServiceStatus>('get_systemd_status');
      setSystemdStatus(status);
    } catch {
      // ignore
    }
  }, []);

  // Fetch current Linux clipboard content
  const refreshClipboard = useCallback(async () => {
    if (!tauriInvoke) return;
    try {
      const text = await tauriInvoke<string>('get_clipboard_content');
      setClipboardContent(text);
    } catch {
      // ignore
    }
  }, []);

  // Initial load and periodic polling
  useEffect(() => {
    refreshStatus();
    refreshMedia();
    refreshSystemd();
    refreshClipboard();

    const interval = setInterval(() => {
      refreshStatus();
      refreshMedia();
      refreshSystemd();
    }, 2500);

    return () => clearInterval(interval);
  }, [refreshStatus, refreshMedia, refreshSystemd, refreshClipboard]);

  // Real-time Tauri event listener from IPC Unix socket
  useEffect(() => {
    if (!tauriListen) return;

    let unlisten: (() => void) | undefined;
    tauriListen<{ type: string; data?: unknown }>('daemon-event', (event) => {
      const payload = event.payload;
      if (payload.type === 'Battery') {
        refreshStatus();
      } else if (payload.type === 'PeerOnline') {
        refreshStatus();
        showToast('New peer mobile device connected');
      } else if (payload.type === 'PeerOffline') {
        refreshStatus();
      } else if (payload.type === 'PairPin') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = payload.data as any;
        setPairingState({
          is_open: true,
          pin: data.pin || '492815',
          qr: data.qr || '',
          expires_in_secs: data.expires_in_secs || 120,
          started_at: Date.now(),
          status: 'Waiting for phone to confirm PIN...',
        });
      } else if (payload.type === 'PairDone') {
        setPairingState((prev) => ({ ...prev, is_open: false }));
        refreshStatus();
        showToast('Successfully paired with mobile device!');
      } else if (payload.type === 'Notification') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const notif = payload.data as any;
        setNotifications((prev) => [
          {
            id: Date.now(),
            app: notif.app || 'App',
            title: notif.title || 'Notification',
            body: notif.body || '',
            peer_id: notif.peer || 'phone',
            peer_name: notif.peer_name || 'Phone',
            time_str: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            received_at: Date.now(),
            direction: 'phone_to_laptop',
          },
          ...prev,
        ]);
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [refreshStatus, showToast]);

  // Media controls handler
  const handleMediaControl = async (action: string) => {
    if (tauriInvoke) {
      try {
        await tauriInvoke('media_control', { action });
        setTimeout(refreshMedia, 200);
      } catch (e) {
        showToast(`Media error: ${e}`);
      }
    } else {
      showToast(`Media action: ${action}`);
    }
  };

  // Systemd service manager handler
  const handleManageSystemd = async (action: string) => {
    if (tauriInvoke) {
      try {
        const msg = await tauriInvoke<string>('manage_systemd_service', { action });
        showToast(msg);
        setTimeout(() => {
          refreshSystemd();
          refreshStatus();
        }, 600);
      } catch (e) {
        showToast(`Service error: ${e}`);
      }
    } else {
      showToast(`Systemd action: ${action}`);
    }
  };

  // Clipboard handler
  const handleSetClipboard = async (text: string) => {
    if (tauriInvoke) {
      try {
        await tauriInvoke('set_clipboard_content', { text });
        setClipboardContent(text);
        showToast('Copied to system clipboard');
      } catch (e) {
        showToast(`Clipboard error: ${e}`);
      }
    } else {
      setClipboardContent(text);
      showToast('Copied to system clipboard');
    }
  };

  // Push note / link to mobile device
  const handleSendToPhone = async (text: string) => {
    if (tauriInvoke) {
      try {
        await tauriInvoke('send_test_notification', {
          title: 'Clipboard from Laptop',
          body: text,
        });
        showToast('Shared with mobile device!');
      } catch (e) {
        showToast(`Send error: ${e}`);
      }
    } else {
      showToast('Shared with mobile device!');
    }
  };

  // Send test desktop notification
  const handleSendTestNotification = async (title: string, body: string) => {
    if (tauriInvoke) {
      try {
        await tauriInvoke('send_test_notification', { title, body });
        showToast('Test notification triggered!');
      } catch (e) {
        showToast(`Notification error: ${e}`);
      }
    } else {
      showToast(`Notification sent: ${title}`);
    }
  };

  // Pairing Handlers
  const handleOpenPairing = async () => {
    if (tauriInvoke) {
      try {
        await tauriInvoke('start_pairing');
      } catch (e) {
        showToast(`Pairing error: ${e}`);
      }
    } else {
      setPairingState({
        is_open: true,
        pin: '739214',
        qr: '',
        expires_in_secs: 120,
        started_at: Date.now(),
        status: 'Waiting for device to enter PIN...',
      });
    }
  };

  const handleCancelPairing = async () => {
    if (tauriInvoke) {
      await tauriInvoke('cancel_pairing');
    }
    setPairingState((prev) => ({ ...prev, is_open: false }));
  };

  const handleUnpair = async (peerId: string) => {
    if (tauriInvoke) {
      try {
        await tauriInvoke('unpair_peer', { peerId });
        showToast(`Unpaired device ${peerId}`);
        refreshStatus();
      } catch (e) {
        showToast(`Failed to unpair: ${e}`);
      }
    } else {
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              peers: prev.peers.filter((p) => p.id !== peerId),
            }
          : null
      );
      showToast('Device unpaired');
    }
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    showToast('Notification feed cleared');
  };

  const handleUpdateSettings = (partial: Partial<GuiSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    if (tauriInvoke) {
      tauriInvoke('update_settings', { settings: updated }).catch(() => {});
    }
    showToast('Settings saved');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0c0d17] text-slate-100 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-indigo-600/90 text-white text-xs font-semibold shadow-xl shadow-indigo-600/30 backdrop-blur-md border border-indigo-400/30 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {toast}
        </div>
      )}

      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isConnected={isConnected}
        systemdStatus={systemdStatus}
        notificationCount={notifications.length}
        pairedCount={snapshot?.peers.length || 0}
      />

      {/* Main View Area */}
      <main className="flex-1 h-screen overflow-y-auto p-8 relative">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard
              snapshot={snapshot}
              mediaInfo={mediaInfo}
              systemdStatus={systemdStatus}
              onOpenPairing={handleOpenPairing}
              onUnpair={handleUnpair}
              onMediaControl={handleMediaControl}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsHub
              notifications={notifications}
              settings={settings}
              onClear={handleClearNotifications}
              onUpdateSettings={handleUpdateSettings}
              onSendTestNotification={handleSendTestNotification}
            />
          )}

          {activeTab === 'media' && (
            <MediaController
              mediaInfo={mediaInfo}
              onControl={handleMediaControl}
              onRefresh={refreshMedia}
            />
          )}

          {activeTab === 'clipboard' && (
            <ClipboardView
              currentClipboard={clipboardContent}
              peers={snapshot?.peers || []}
              onRefreshClipboard={refreshClipboard}
              onSetClipboard={handleSetClipboard}
              onSendToPhone={handleSendToPhone}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              systemdStatus={systemdStatus}
              onUpdateSettings={handleUpdateSettings}
              onManageSystemd={handleManageSystemd}
            />
          )}
        </div>
      </main>

      {/* Pairing Modal */}
      {pairingState.is_open && (
        <PairingModal
          pairingState={pairingState}
          onCancel={handleCancelPairing}
        />
      )}
    </div>
  );
}

export default App;
