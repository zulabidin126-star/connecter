import React from 'react';
import {
  Smartphone,
  Plus,
  Trash2,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ClipboardList,
  BellRing,
  PlayCircle,
  BatteryCharging,
  Zap,
  Lock,
  FileText,
} from 'lucide-react';
import type { StateSnapshot, MediaPlayerInfo, SystemdServiceStatus } from '../types';

interface DashboardProps {
  snapshot: StateSnapshot | null;
  mediaInfo: MediaPlayerInfo | null;
  systemdStatus: SystemdServiceStatus | null;
  theme: 'dark' | 'light';
  onOpenPairing: () => void;
  onUnpair: (peerId: string) => void;
  onMediaControl: (action: string) => Promise<void>;
  onNavigateTab: (tab: 'notifications' | 'media' | 'clipboard' | 'settings') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  snapshot,
  mediaInfo,
  theme,
  onOpenPairing,
  onUnpair,
  onMediaControl,
  onNavigateTab,
}) => {
  const isDark = theme === 'dark';
  const localBat = snapshot?.local_battery;
  const peers = snapshot?.peers || [];
  const primaryPeer = peers.find((p) => p.online) || peers[0];

  const isPlaying = mediaInfo?.status.toLowerCase() === 'playing';
  const hasMedia = mediaInfo && mediaInfo.title !== 'No Media Playing' && mediaInfo.title.trim() !== '';

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      {/* Top Header - Exact KDE Connect Header style */}
      <div
        className={`flex items-center justify-between pb-4 border-b ${
          isDark ? 'border-white/[0.07]' : 'border-black/[0.06]'
        }`}
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {primaryPeer ? primaryPeer.name : snapshot?.device_name || 'My Linux Laptop'}
          </h2>
          <div
            className={`flex items-center space-x-2 text-xs font-semibold mt-1 ${
              isDark ? 'text-zinc-400' : 'text-[#615a54]'
            }`}
          >
            {primaryPeer?.battery ? (
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Battery: {primaryPeer.battery.percent}%</span>
              </span>
            ) : localBat ? (
              <span className="flex items-center gap-1.5">
                <BatteryCharging className="w-4 h-4 text-emerald-500" />
                <span>
                  Battery: {localBat.percent}% {localBat.charging ? '(Charging)' : ''}
                </span>
              </span>
            ) : (
              <span>Ready for connection</span>
            )}
          </div>
        </div>

        <button
          onClick={onOpenPairing}
          className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs outline-none active:scale-95 ${
            isDark
              ? 'bg-white text-zinc-900 hover:bg-zinc-200'
              : 'bg-[#211c19] text-white hover:bg-[#38302c]'
          }`}
        >
          <Plus className="w-4 h-4 stroke-[2.4]" />
          <span>Pair new device</span>
        </button>
      </div>

      {/* Feature Action Grid (Exact layout from KDE Connect Android - Image 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tile 1: Send Files */}
        <div
          onClick={() => onNavigateTab('clipboard')}
          className="kde-action-tile p-6 cursor-pointer flex flex-col justify-between min-h-[140px] outline-none active:scale-[0.99] transition-transform"
        >
          <div>
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 shadow-xs ${
                isDark ? 'bg-white/[0.08] text-white' : 'bg-black/[0.05] text-[#211c19]'
              }`}
            >
              <FileText className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold tracking-tight">Send files</h3>
            <p
              className={`text-xs mt-1 font-medium line-clamp-1 ${
                isDark ? 'text-zinc-400' : 'text-[#615a54]'
              }`}
            >
              Share text, documents, and links with paired phone
            </p>
          </div>
        </div>

        {/* Tile 2: Send clipboard */}
        <div
          onClick={() => onNavigateTab('clipboard')}
          className="kde-action-tile p-6 cursor-pointer flex flex-col justify-between min-h-[140px] outline-none active:scale-[0.99] transition-transform"
        >
          <div>
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 shadow-xs ${
                isDark ? 'bg-white/[0.08] text-white' : 'bg-black/[0.05] text-[#211c19]'
              }`}
            >
              <ClipboardList className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold tracking-tight">Send clipboard</h3>
            <p
              className={`text-xs mt-1 font-medium line-clamp-1 ${
                isDark ? 'text-zinc-400' : 'text-[#615a54]'
              }`}
            >
              Copy-paste automatically synced across devices
            </p>
          </div>
        </div>

        {/* Tile 3: Multimedia control */}
        <div className="kde-action-tile p-6 flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-xs ${
                  isDark ? 'bg-white/[0.08] text-white' : 'bg-black/[0.05] text-[#211c19]'
                }`}
              >
                <PlayCircle className="w-5 h-5 stroke-[2]" />
              </div>
              <button
                onClick={() => onNavigateTab('media')}
                className="text-xs font-bold opacity-75 hover:opacity-100 cursor-pointer underline outline-none"
              >
                Open Player &rarr;
              </button>
            </div>
            <h3 className="text-base font-bold tracking-tight">Multimedia control</h3>
            <p
              className={`text-xs mt-1 font-medium truncate ${
                isDark ? 'text-zinc-400' : 'text-[#615a54]'
              }`}
            >
              {hasMedia ? `${mediaInfo.title} • ${mediaInfo.artist}` : 'No active media playing'}
            </p>
          </div>

          {/* Quick playback controls bar */}
          <div
            className={`flex items-center space-x-2 pt-3 mt-3 border-t ${
              isDark ? 'border-white/[0.05]' : 'border-black/[0.05]'
            }`}
          >
            <button
              onClick={() => onMediaControl('previous')}
              className={`p-2 rounded-lg transition-colors cursor-pointer outline-none ${
                isDark ? 'hover:bg-white/[0.08] text-zinc-300' : 'hover:bg-black/[0.06] text-[#211c19]'
              }`}
              title="Previous"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>
            <button
              onClick={() => onMediaControl('play-pause')}
              className={`p-2 rounded-lg transition-colors cursor-pointer outline-none ${
                isDark
                  ? 'bg-white/[0.12] hover:bg-white/[0.18] text-white'
                  : 'bg-black/[0.08] hover:bg-black/[0.12] text-[#211c19]'
              }`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button
              onClick={() => onMediaControl('next')}
              className={`p-2 rounded-lg transition-colors cursor-pointer outline-none ${
                isDark ? 'hover:bg-white/[0.08] text-zinc-300' : 'hover:bg-black/[0.06] text-[#211c19]'
              }`}
              title="Next"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>

        {/* Tile 4: Notifications */}
        <div
          onClick={() => onNavigateTab('notifications')}
          className="kde-action-tile p-6 cursor-pointer flex flex-col justify-between min-h-[140px] outline-none active:scale-[0.99] transition-transform"
        >
          <div>
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 shadow-xs ${
                isDark ? 'bg-white/[0.08] text-white' : 'bg-black/[0.05] text-[#211c19]'
              }`}
            >
              <BellRing className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold tracking-tight">Notifications</h3>
            <p
              className={`text-xs mt-1 font-medium line-clamp-1 ${
                isDark ? 'text-zinc-400' : 'text-[#615a54]'
              }`}
            >
              Phone alerts appear on laptop; forward desktop alerts
            </p>
          </div>
        </div>

        {/* Tile 5: Laptop Battery & Power */}
        <div className="kde-action-tile p-6 flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-xs ${
                  isDark ? 'bg-white/[0.08] text-white' : 'bg-black/[0.05] text-[#211c19]'
                }`}
              >
                {localBat?.charging ? (
                  <Zap className="w-5 h-5 text-amber-500 fill-amber-500 stroke-[2]" />
                ) : (
                  <BatteryCharging className="w-5 h-5 stroke-[2]" />
                )}
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  isDark ? 'bg-white/[0.06] text-zinc-300' : 'bg-black/[0.05] text-[#443e39]'
                }`}
              >
                {localBat?.charging ? 'Charging' : 'On Battery'}
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold tracking-tight">
                {localBat ? `${localBat.percent}%` : '--%'}
              </span>
              <span
                className={`text-xs font-semibold ${
                  isDark ? 'text-zinc-400' : 'text-[#615a54]'
                }`}
              >
                Laptop Battery
              </span>
            </div>
          </div>

          <div
            className={`w-full h-2 rounded-full overflow-hidden mt-3 ${
              isDark ? 'bg-white/[0.08]' : 'bg-black/[0.08]'
            }`}
          >
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${localBat?.percent || 0}%` }}
            />
          </div>
        </div>

        {/* Tile 6: Remote Control */}
        <div
          onClick={() => onNavigateTab('settings')}
          className="kde-action-tile p-6 cursor-pointer flex flex-col justify-between min-h-[140px] outline-none active:scale-[0.99] transition-transform"
        >
          <div>
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 shadow-xs ${
                isDark ? 'bg-white/[0.08] text-white' : 'bg-black/[0.05] text-[#211c19]'
              }`}
            >
              <Lock className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold tracking-tight">Remote control</h3>
            <p
              className={`text-xs mt-1 font-medium line-clamp-1 ${
                isDark ? 'text-zinc-400' : 'text-[#615a54]'
              }`}
            >
              Lock screen, suspend, or adjust system volume remotely
            </p>
          </div>
        </div>
      </div>

      {/* Paired Devices Section */}
      <div className="kde-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <span>Paired Devices</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                isDark ? 'bg-white/[0.08] text-zinc-300' : 'bg-black/[0.05] text-[#615a54]'
              }`}
            >
              {peers.length}
            </span>
          </h3>
        </div>

        {peers.length === 0 ? (
          <div
            className={`text-center py-8 px-4 rounded-xl border border-dashed ${
              isDark ? 'border-white/[0.08] bg-white/[0.01]' : 'border-black/[0.08] bg-black/[0.01]'
            }`}
          >
            <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <h4 className="text-xs font-bold">No phone paired yet</h4>
            <p
              className={`text-xs max-w-sm mx-auto mt-1 mb-4 font-medium ${
                isDark ? 'text-zinc-400' : 'text-[#615a54]'
              }`}
            >
              Click below to pair your mobile phone and sync notifications, clipboard, and media controls.
            </p>
            <button
              onClick={onOpenPairing}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer outline-none active:scale-95 ${
                isDark
                  ? 'border-white/10 hover:bg-white/[0.06] text-white'
                  : 'border-black/10 hover:bg-black/[0.04] text-[#211c19]'
              }`}
            >
              Pair Device
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {peers.map((peer) => (
              <div
                key={peer.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                  isDark
                    ? 'bg-white/[0.02] border-white/[0.04] hover:border-white/[0.08]'
                    : 'bg-black/[0.02] border-black/[0.04] hover:border-black/[0.08]'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isDark ? 'bg-white/[0.05]' : 'bg-black/[0.04]'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">{peer.name}</h4>
                    <p
                      className={`text-[11px] font-medium mt-0.5 ${
                        isDark ? 'text-zinc-400' : 'text-[#615a54]'
                      }`}
                    >
                      {peer.online ? (
                        <span className="text-emerald-500 font-bold">Online</span>
                      ) : (
                        <span>Offline</span>
                      )}
                      {peer.battery && <span> • Battery: {peer.battery.percent}%</span>}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onUnpair(peer.id)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer outline-none"
                  title="Unpair this device"
                >
                  <Trash2 className="w-4 h-4 stroke-[1.8]" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
