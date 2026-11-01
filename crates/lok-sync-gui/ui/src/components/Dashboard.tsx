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
  onOpenPairing: () => void;
  onUnpair: (peerId: string) => void;
  onMediaControl: (action: string) => Promise<void>;
  onNavigateTab: (tab: 'media' | 'clipboard' | 'settings') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  snapshot,
  mediaInfo,
  systemdStatus,
  onOpenPairing,
  onUnpair,
  onMediaControl,
  onNavigateTab,
}) => {
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
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span>System Dashboard</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
            Real-time synchronization between Linux host and connected mobile peers.
          </p>
        </div>
        <button
          onClick={onOpenPairing}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-sky-500 to-teal-400 hover:opacity-95 text-white font-semibold text-xs sm:text-sm shadow-xl shadow-indigo-500/20 transition-all transform active:scale-95 cursor-pointer ring-1 ring-white/20"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Pair Mobile Device</span>
        </button>
      </div>

      {/* Main Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Laptop Battery (Real Sysfs Telemetry) */}
        <div className="glass-panel p-5 rounded-3xl glow-card relative overflow-hidden border border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Laptop className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Laptop Battery
              </span>
            </div>

            {localBat?.charging ? (
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Zap className="w-3 h-3 fill-amber-400" />
                <span>Charging</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <BatteryMedium className="w-3 h-3" />
                <span>Discharging</span>
              </span>
            )}
          </div>

          <div className="flex items-baseline space-x-2.5 mb-3">
            <span className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              {localBat ? `${localBat.percent}%` : '--%'}
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              {localBat?.charging ? 'AC Connected' : 'On Battery'}
            </span>
          </div>

          {/* Progress bar with dynamic color gradient */}
          <div className="w-full bg-white/[0.06] rounded-full h-2.5 overflow-hidden mb-2.5 p-[1px]">
            <div
              className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${getBatteryColorGradient(
                localBat?.percent || 0
              )}`}
              style={{ width: `${localBat?.percent || 0}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Direct sysfs power supply telemetry</span>
          </p>
        </div>

        {/* Card 2: Phone Battery */}
        <div className="glass-panel p-5 rounded-3xl glow-card relative overflow-hidden border border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Phone Battery
              </span>
            </div>

            {primaryPeer?.battery?.charging && (
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Zap className="w-3 h-3 fill-amber-400" />
                <span>Charging</span>
              </span>
            )}
          </div>

          <div className="flex items-baseline space-x-2.5 mb-3">
            <span className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              {primaryPeer?.battery ? `${primaryPeer.battery.percent}%` : '--'}
            </span>
            <span className="text-xs text-slate-400 font-semibold truncate max-w-[130px]">
              {primaryPeer ? primaryPeer.name : 'Waiting for phone'}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-white/[0.06] rounded-full h-2.5 overflow-hidden mb-2.5 p-[1px]">
            <div
              className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${getBatteryColorGradient(
                primaryPeer?.battery?.percent || 0
              )}`}
              style={{ width: `${primaryPeer?.battery?.percent || 0}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
            {primaryPeer?.online ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-emerald-400">E2EE live encrypted stream</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>No phone linked yet</span>
              </>
            )}
          </p>
        </div>

        {/* Card 3: Systemd Daemon Status */}
        <div className="glass-panel p-5 rounded-3xl glow-card relative overflow-hidden border border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Cpu className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Systemd Service
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                systemdStatus?.active
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
            >
              {systemdStatus?.active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="space-y-2 mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Host Machine</span>
              <span className="text-slate-200 font-bold">{snapshot?.device_name || 'Linux-Host'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Security</span>
              <span className="text-indigo-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SPAKE2 + AES-GCM</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">RAM Footprint</span>
              <span className="text-emerald-400 font-mono font-semibold">&lt; 1 MB (Slice Cap 25M)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Media Controller Card */}
      <div className="glass-panel p-5 rounded-3xl glow-card border border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Now Playing (MPRIS)</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-slate-300 lowercase">
                  {mediaInfo?.player_name || 'System Player'}
                </span>
              </h3>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('media')}
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold transition-colors cursor-pointer"
          >
            Full Controller &rarr;
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 rounded-2xl bg-black/30 border border-white/[0.05]">
          <div className="flex items-center space-x-3.5 truncate w-full sm:w-auto">
            <div
              className={`w-11 h-11 rounded-2xl bg-indigo-950/70 border border-indigo-500/30 flex items-center justify-center shrink-0 ${
                isPlaying ? 'ring-2 ring-indigo-400/50 shadow-lg shadow-indigo-500/20' : ''
              }`}
            >
              <Music className={`w-5 h-5 text-indigo-400 ${isPlaying ? 'animate-pulse' : ''}`} />
            </div>
            <div className="truncate">
              <p className="text-xs sm:text-sm font-extrabold text-white truncate max-w-sm">
                {mediaInfo?.title || 'No Media Playing'}
              </p>
              <p className="text-[11px] text-slate-400 truncate max-w-xs font-medium">
                {mediaInfo?.artist && mediaInfo.artist !== 'None' ? mediaInfo.artist : 'Playback idle'}
              </p>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => onMediaControl('previous')}
              disabled={!hasMedia}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300 transition-colors cursor-pointer"
              title="Previous"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => onMediaControl('play-pause')}
              className="p-3 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:opacity-90 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer transform active:scale-95"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
            </button>
            <button
              onClick={() => onMediaControl('next')}
              disabled={!hasMedia}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300 transition-colors cursor-pointer"
              title="Next"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button
              onClick={() => onMediaControl('volume-up')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer ml-1"
              title="Volume +5%"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Paired Peers Section */}
      <div className="glass-panel p-6 rounded-3xl border border-white/[0.08]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Paired Devices</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-semibold">
              {peers.length}
            </span>
          </h3>
        </div>

        {peers.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
            <Smartphone className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-200">No paired devices found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Click &quot;Pair Mobile Device&quot; to exchange keys and mirror notifications, clipboard, and battery.
            </p>
            <button
              onClick={onOpenPairing}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
            >
              Start Pairing
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {peers.map((peer) => (
              <div
                key={peer.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-colors"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#11131f] ${
                        peer.online ? 'bg-emerald-400' : 'bg-slate-600'
                      }`}
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      {peer.name}
                      <span className="text-[10px] font-mono text-slate-500">({peer.id})</span>
                    </h4>
                    <p className="text-xs text-slate-400 flex items-center gap-3 mt-0.5 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {formatLastSeen(peer.last_seen)}
                      </span>
                      {peer.battery && (
                        <span className="text-slate-300">
                          Battery: {peer.battery.percent}%
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onUnpair(peer.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
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
