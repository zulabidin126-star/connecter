import { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
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
  PeerBattery,
} from './types';

const DEFAULT_SETTINGS: GuiSettings = {
  autostart: true,
  plain_text_only: true,
  hide_body_when_locked: true,
  forward_laptop_to_phone: true,
  device_name: 'Linux-Host',
  port: 47100,
  theme: 'dark',
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

// Safe invoke wrapper
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (err) {
    throw err;
  }
}

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [snapshot, setSnapshot] = useState<StateSnapshot | null>(null);
  const [mediaInfo, setMediaInfo] = useState<MediaPlayerInfo | null>(DEFAULT_MEDIA);
  const [systemdStatus, setSystemdStatus] = useState<SystemdServiceStatus | null>(DEFAULT_SYSTEMD);
  const [clipboardContent, setClipboardContent] = useState<string>('');
  const [isConnected, setIsConnected] = useState(true);
  const [notifications, setNotifications] = useState<SyncedNotification[]>([]);
  const [settings, setSettings] = useState<GuiSettings>(DEFAULT_SETTINGS);
  const [toast, setToast] = useState<string | null>(null);

  // Theme state: dark | light (persisted in localStorage)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('lok-sync-theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('lok-sync-theme', next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

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

  // Fetch status snapshot from daemon & direct battery fallback
  const refreshStatus = useCallback(async () => {
    try {
      const snap = await safeInvoke<StateSnapshot>('get_daemon_status');
      setSnapshot(snap);
      setIsConnected(true);
    } catch {
      // Fallback: try getting host battery directly
      try {
        const bat = await safeInvoke<PeerBattery | null>('get_host_battery');
        setSnapshot((prev) => ({
          device_name: prev?.device_name || 'Linux-Host',
          device_id: prev?.device_id || 'local',
          local_battery: bat,
          peers: prev?.peers || [],
        }));
      } catch {
        setIsConnected(false);
      }
    }
  }, []);

  // Fetch media status via MPRIS
  const refreshMedia = useCallback(async () => {
    try {
      const media = await safeInvoke<MediaPlayerInfo>('get_media_status');
      setMediaInfo(media);
    } catch {
      // ignore
    }
  }, []);

  // Fetch systemd user service status
  const refreshSystemd = useCallback(async () => {
    try {
      const status = await safeInvoke<SystemdServiceStatus>('get_systemd_status');
      setSystemdStatus(status);
    } catch {
      // ignore
    }
  }, []);

  // Fetch current Linux clipboard content
  const refreshClipboard = useCallback(async () => {
    try {
      const text = await safeInvoke<string>('get_clipboard_content');
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
    }, 2000);

    return () => clearInterval(interval);
  }, [refreshStatus, refreshMedia, refreshSystemd, refreshClipboard]);

  // Real-time Tauri event listener from IPC Unix socket
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<{ type: string; data?: unknown }>('daemon-event', (event) => {
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
    }).catch(() => {});

    return () => {
      if (unlisten) unlisten();
    };
  }, [refreshStatus, showToast]);

  // Media controls handler
  const handleMediaControl = async (action: string) => {
    try {
      await safeInvoke('media_control', { action });
      setTimeout(refreshMedia, 150);
    } catch (e) {
      showToast(`Media error: ${e}`);
    }
  };

  // Systemd service manager handler
  const handleManageSystemd = async (action: string) => {
    try {
      const msg = await safeInvoke<string>('manage_systemd_service', { action });
      showToast(msg);
      setTimeout(() => {
        refreshSystemd();
        refreshStatus();
      }, 500);
    } catch (e) {
      showToast(`Service error: ${e}`);
    }
  };

  // Clipboard handler
  const handleSetClipboard = async (text: string) => {
    try {
      await safeInvoke('set_clipboard_content', { text });
      setClipboardContent(text);
      showToast('Copied to system clipboard');
    } catch (e) {
      showToast(`Clipboard error: ${e}`);
    }
  };

  // Push note / link to mobile device
  const handleSendToPhone = async (text: string) => {
    try {
      await safeInvoke('send_test_notification', {
        title: 'Clipboard from Laptop',
        body: text,
      });
      showToast('Shared with mobile device!');
    } catch (e) {
      showToast(`Send error: ${e}`);
    }
  };

  // Send test desktop notification
  const handleSendTestNotification = async (title: string, body: string) => {
    try {
      await safeInvoke('send_test_notification', { title, body });
      showToast('Test notification triggered!');
    } catch (e) {
      showToast(`Notification error: ${e}`);
    }
  };

  // Pairing Handlers
  const handleOpenPairing = async () => {
    try {
      await safeInvoke('start_pairing');
    } catch (e) {
      showToast(`Pairing error: ${e}`);
    }
  };

  const handleCancelPairing = async () => {
    try {
      await safeInvoke('cancel_pairing');
    } catch {
      // ignore
    }
    setPairingState((prev) => ({ ...prev, is_open: false }));
  };

  const handleUnpair = async (peerId: string) => {
    try {
      await safeInvoke('unpair_peer', { peerId });
      showToast(`Unpaired device ${peerId}`);
      refreshStatus();
    } catch (e) {
      showToast(`Failed to unpair: ${e}`);
    }
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    showToast('Notification feed cleared');
  };

  const handleUpdateSettings = (partial: Partial<GuiSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    safeInvoke('update_settings', { settings: updated }).catch(() => {});
    showToast('Settings saved');
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden font-sans transition-colors duration-300 ${
        isDark ? 'ambient-bg-dark text-slate-100' : 'ambient-bg-light text-slate-800'
      }`}
    >
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-600 text-white text-xs font-bold shadow-2xl shadow-indigo-600/40 backdrop-blur-xl border border-white/20 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}

      {/* Navigation Sidebar with Theme Switcher */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isConnected={isConnected}
        systemdStatus={systemdStatus}
        notificationCount={notifications.length}
        pairedCount={snapshot?.peers.length || 0}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main View Area */}
      <main className="flex-1 h-screen overflow-y-auto p-6 sm:p-10 relative">
        <div className="max-w-5xl mx-auto space-y-8">
          {activeTab === 'dashboard' && (
            <Dashboard
              snapshot={snapshot}
              mediaInfo={mediaInfo}
              systemdStatus={systemdStatus}
              theme={theme}
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
              theme={theme}
              onClear={handleClearNotifications}
              onUpdateSettings={handleUpdateSettings}
              onSendTestNotification={handleSendTestNotification}
            />
          )}

          {activeTab === 'media' && (
            <MediaController
              mediaInfo={mediaInfo}
              theme={theme}
              onControl={handleMediaControl}
              onRefresh={refreshMedia}
            />
          )}

          {activeTab === 'clipboard' && (
            <ClipboardView
              currentClipboard={clipboardContent}
              peers={snapshot?.peers || []}
              theme={theme}
              onRefreshClipboard={refreshClipboard}
              onSetClipboard={handleSetClipboard}
              onSendToPhone={handleSendToPhone}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              systemdStatus={systemdStatus}
              theme={theme}
              onToggleTheme={toggleTheme}
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
          theme={theme}
          onCancel={handleCancelPairing}
        />
      )}
    </div>
  );
}

export default App;
