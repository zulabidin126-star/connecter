import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { NotificationsHub } from './components/NotificationsHub';
import { SettingsView } from './components/SettingsView';
import { PairingModal } from './components/PairingModal';
import type {
  ActiveTab,
  StateSnapshot,
  SyncedNotification,
  PairingState,
  GuiSettings,
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
  // running in browser / dev mode
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
  device_name: 'Linux-Machine',
  port: 47100,
};

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [snapshot, setSnapshot] = useState<StateSnapshot | null>(DEFAULT_SNAPSHOT);
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

  // Initial load and polling fallback
  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 3000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  // Real-time Tauri event listener
  useEffect(() => {
    if (!tauriListen) return;

    let unlisten: (() => void) | undefined;
    tauriListen<{ type: string; data?: unknown }>('daemon-event', (event) => {
      const payload = event.payload;
      if (payload.type === 'Battery') {
        refreshStatus();
      } else if (payload.type === 'PeerOnline') {
        refreshStatus();
        showToast('New peer device connected');
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

  // Handlers
  const handleOpenPairing = async () => {
    if (tauriInvoke) {
      try {
        await tauriInvoke('start_pairing');
      } catch (e) {
        showToast(`Pairing error: ${e}`);
      }
    } else {
      // Mock for browser testing
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
        notificationCount={notifications.length}
        pairedCount={snapshot?.peers.length || 0}
      />

      {/* Main View Area */}
      <main className="flex-1 h-screen overflow-y-auto p-8 relative">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard
              snapshot={snapshot}
              onOpenPairing={handleOpenPairing}
              onUnpair={handleUnpair}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsHub
              notifications={notifications}
              onClear={handleClearNotifications}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
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
