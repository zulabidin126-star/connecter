import React from 'react';
import {
  Laptop,
  Smartphone,
  Zap,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Music,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Cpu,
  BatteryMedium,
  ShieldCheck,
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
  onNavigateTab: (tab: 'media' | 'clipboard' | 'settings') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  snapshot,
  mediaInfo,
  systemdStatus,
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

  const formatLastSeen = (timestamp: number) => {
    if (!timestamp) return 'Never';
    const diff = Math.floor(Date.now() / 1000 - timestamp);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const getBatteryColorGradient = (pct: number) => {
    if (pct > 40) return 'from-emerald-400 via-teal-400 to-sky-400';
    if (pct > 20) return 'from-amber-400 via-orange-400 to-amber-500';
    return 'from-rose-500 via-red-500 to-rose-600';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2
            className={`text-2xl sm:text-3xl font-black tracking-tight ${
              isDark ? 'title-gradient-dark' : 'title-gradient-light'
            }`}
          >
            System Dashboard
          </h2>
          <p className={`text-xs sm:text-sm mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Real-time synchronization between Linux host and connected mobile peers.
          </p>
        </div>
        <button
          onClick={onOpenPairing}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-sky-500 to-teal-400 hover:opacity-95 text-white font-semibold text-xs sm:text-sm shadow-xl shadow-indigo-500/20 transition-all transform active:scale-95 cursor-pointer ring-1 ring-white/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Pair Mobile Device</span>
        </button>
      </div>

      {/* Main Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Laptop Battery (Real Sysfs Telemetry) */}
        <div
          className={`p-5 rounded-3xl glow-card relative overflow-hidden border ${
            isDark ? 'glass-panel-dark glow-card-dark' : 'glass-panel-light glow-card-light'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-500">
                <Laptop className="w-4 h-4" />
              </div>
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Laptop Battery
              </span>
            </div>

            {localBat?.charging ? (
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                <Zap className="w-3 h-3 fill-amber-400" />
                <span>Charging</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                <BatteryMedium className="w-3 h-3" />
                <span>Discharging</span>
              </span>
            )}
          </div>

          <div className="flex items-baseline space-x-2.5 mb-3">
            <span
              className={`text-4xl sm:text-5xl font-black tracking-tight ${
                isDark ? 'title-gradient-dark' : 'title-gradient-light'
              }`}
            >
              {localBat ? `${localBat.percent}%` : '--%'}
            </span>
            <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {localBat?.charging ? 'AC Connected' : 'On Battery'}
            </span>
          </div>

          {/* Progress bar with dynamic color gradient */}
          <div
            className={`w-full rounded-full h-2.5 overflow-hidden mb-2.5 p-[1px] ${
              isDark ? 'bg-white/[0.06]' : 'bg-slate-200'
            }`}
          >
            <div
              className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${getBatteryColorGradient(
                localBat?.percent || 0
              )}`}
              style={{ width: `${localBat?.percent || 0}%` }}
            />
          </div>

          <p className={`text-[11px] flex items-center gap-1.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Direct sysfs power supply telemetry</span>
          </p>
        </div>

        {/* Card 2: Phone Battery */}
        <div
          className={`p-5 rounded-3xl glow-card relative overflow-hidden border ${
            isDark ? 'glass-panel-dark glow-card-dark' : 'glass-panel-light glow-card-light'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500">
                <Smartphone className="w-4 h-4" />
              </div>
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Phone Battery
              </span>
            </div>

            {primaryPeer?.battery?.charging && (
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                <Zap className="w-3 h-3 fill-amber-400" />
                <span>Charging</span>
              </span>
            )}
          </div>

          <div className="flex items-baseline space-x-2.5 mb-3">
            <span
              className={`text-4xl sm:text-5xl font-black tracking-tight ${
                isDark ? 'title-gradient-dark' : 'title-gradient-light'
              }`}
            >
              {primaryPeer?.battery ? `${primaryPeer.battery.percent}%` : '--'}
            </span>
            <span className={`text-xs font-semibold truncate max-w-[130px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {primaryPeer ? primaryPeer.name : 'Waiting for phone'}
            </span>
          </div>

          {/* Progress bar */}
          <div
            className={`w-full rounded-full h-2.5 overflow-hidden mb-2.5 p-[1px] ${
              isDark ? 'bg-white/[0.06]' : 'bg-slate-200'
            }`}
          >
            <div
              className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${getBatteryColorGradient(
                primaryPeer?.battery?.percent || 0
              )}`}
              style={{ width: `${primaryPeer?.battery?.percent || 0}%` }}
            />
          </div>

          <p className={`text-[11px] flex items-center gap-1.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {primaryPeer?.online ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-500">E2EE live encrypted stream</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>No phone linked yet</span>
              </>
            )}
          </p>
        </div>

        {/* Card 3: Systemd Daemon Status */}
        <div
          className={`p-5 rounded-3xl glow-card relative overflow-hidden border ${
            isDark ? 'glass-panel-dark glow-card-dark' : 'glass-panel-light glow-card-light'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <Cpu className="w-4 h-4" />
              </div>
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Systemd Service
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                systemdStatus?.active
                  ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
              }`}
            >
              {systemdStatus?.active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="space-y-2 mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Host Machine</span>
              <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {snapshot?.device_name || 'Linux-Host'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Security</span>
              <span className="text-indigo-500 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SPAKE2 + AES-GCM</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>RAM Footprint</span>
              <span className="text-emerald-500 font-mono font-semibold">&lt; 1 MB (Slice Cap 25M)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Media Controller Card */}
      <div
        className={`p-5 rounded-3xl glow-card border space-y-3 ${
          isDark ? 'glass-panel-dark glow-card-dark' : 'glass-panel-light glow-card-light'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h3
                className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                <span>Now Playing (MPRIS)</span>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-md border lowercase ${
                    isDark
                      ? 'bg-white/[0.05] border-white/[0.08] text-slate-300'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  {mediaInfo?.player_name || 'System Player'}
                </span>
              </h3>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('media')}
            className="text-xs text-indigo-500 hover:text-indigo-600 font-semibold transition-colors cursor-pointer"
          >
            Full Controller &rarr;
          </button>
        </div>

        <div
          className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 rounded-2xl border ${
            isDark ? 'bg-black/30 border-white/[0.05]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center space-x-3.5 truncate w-full sm:w-auto">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                isDark
                  ? 'bg-indigo-950/70 border-indigo-500/30'
                  : 'bg-indigo-50 border-indigo-200'
              } ${isPlaying ? 'ring-2 ring-indigo-400/50 shadow-md' : ''}`}
            >
              <Music className={`w-5 h-5 text-indigo-500 ${isPlaying ? 'animate-pulse' : ''}`} />
            </div>
            <div className="truncate">
              <p
                className={`text-xs sm:text-sm font-extrabold truncate max-w-sm ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                {mediaInfo?.title || 'No Media Playing'}
              </p>
              <p
                className={`text-[11px] truncate max-w-xs font-medium ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {mediaInfo?.artist && mediaInfo.artist !== 'None' ? mediaInfo.artist : 'Playback idle'}
              </p>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => onMediaControl('previous')}
              disabled={!hasMedia}
              className={`p-2 rounded-xl border transition-colors cursor-pointer disabled:opacity-30 ${
                isDark
                  ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/5'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
              }`}
              title="Previous Track"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => onMediaControl('play-pause')}
              className="p-3 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:opacity-95 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer transform active:scale-95"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current translate-x-0.5" />
              )}
            </button>
            <button
              onClick={() => onMediaControl('next')}
              disabled={!hasMedia}
              className={`p-2 rounded-xl border transition-colors cursor-pointer disabled:opacity-30 ${
                isDark
                  ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/5'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
              }`}
              title="Next Track"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button
              onClick={() => onMediaControl('volume-up')}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ml-1 ${
                isDark
                  ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/5'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
              }`}
              title="Volume +5%"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Paired Peers Section */}
      <div
        className={`p-6 rounded-3xl border ${
          isDark ? 'glass-panel-dark glow-card-dark' : 'glass-panel-light glow-card-light'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            <span>Paired Devices</span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {peers.length}
            </span>
          </h3>
        </div>

        {peers.length === 0 ? (
          <div
            className={`text-center py-10 px-4 rounded-2xl border border-dashed ${
              isDark ? 'border-white/10 bg-white/[0.01]' : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <Smartphone className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h4 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              No paired devices found
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Click &quot;Pair Mobile Device&quot; to exchange keys and mirror notifications, clipboard, and battery.
            </p>
            <button
              onClick={onOpenPairing}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
              }`}
            >
              Start Pairing
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {peers.map((peer) => (
              <div
                key={peer.id}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
                  isDark
                    ? 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                        isDark ? 'border-[#11131f]' : 'border-white'
                      } ${peer.online ? 'bg-emerald-500' : 'bg-slate-400'}`}
                    />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      {peer.name}
                      <span className="text-[10px] font-mono text-slate-400">({peer.id})</span>
                    </h4>
                    <p className="text-xs text-slate-400 flex items-center gap-3 mt-0.5 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatLastSeen(peer.last_seen)}
                      </span>
                      {peer.battery && (
                        <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                          Battery: {peer.battery.percent}%
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onUnpair(peer.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/15 transition-colors cursor-pointer"
                    title="Unpair & revoke key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
