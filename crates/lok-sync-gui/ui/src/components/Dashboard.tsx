import React from 'react';
import {
  Laptop,
  Smartphone,
  Zap,
  Radio,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import type { StateSnapshot } from '../types';

interface DashboardProps {
  snapshot: StateSnapshot | null;
  onOpenPairing: () => void;
  onUnpair: (peerId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  snapshot,
  onOpenPairing,
  onUnpair,
}) => {
  const localBat = snapshot?.local_battery;
  const peers = snapshot?.peers || [];
  const primaryPeer = peers.find((p) => p.online) || peers[0];

  const formatLastSeen = (timestamp: number) => {
    if (!timestamp) return 'Never';
    const diff = Math.floor(Date.now() / 1000 - timestamp);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">System Dashboard</h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time synchronization between Linux host and connected mobile peers.
          </p>
        </div>
        <button
          onClick={onOpenPairing}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 transition-all duration-150 transform active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Pair Mobile Device</span>
        </button>
      </div>

      {/* Main Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Laptop Battery */}
        <div className="glass-panel p-5 rounded-2xl glow-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Laptop className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-slate-200">Laptop Battery</span>
            </div>
            {localBat?.charging && (
              <span className="inline-flex items-center space-x-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Zap className="w-3 h-3 fill-amber-400" />
                <span>Charging</span>
              </span>
            )}
          </div>

          <div className="flex items-baseline space-x-2 mb-3">
            <span className="text-4xl font-extrabold tracking-tight text-white">
              {localBat ? `${localBat.percent}%` : '--'}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {localBat?.plugged ? 'AC Connected' : 'On Battery'}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (localBat?.percent || 0) > 20
                  ? 'bg-gradient-to-r from-sky-400 to-indigo-500'
                  : 'bg-gradient-to-r from-rose-500 to-amber-500'
              }`}
              style={{ width: `${localBat?.percent || 0}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Monitored via Linux sysfs & netlink</span>
          </p>
        </div>

        {/* Card 2: Phone Battery */}
        <div className="glass-panel p-5 rounded-2xl glow-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-slate-200">Phone Battery</span>
            </div>
            {primaryPeer?.battery?.charging && (
              <span className="inline-flex items-center space-x-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Zap className="w-3 h-3 fill-amber-400" />
                <span>Charging</span>
              </span>
            )}
          </div>

          <div className="flex items-baseline space-x-2 mb-3">
            <span className="text-4xl font-extrabold tracking-tight text-white">
              {primaryPeer?.battery ? `${primaryPeer.battery.percent}%` : '--'}
            </span>
            <span className="text-xs text-slate-400 font-medium truncate max-w-[120px]">
              {primaryPeer ? primaryPeer.name : 'No device'}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (primaryPeer?.battery?.percent || 0) > 20
                  ? 'bg-gradient-to-r from-indigo-500 to-emerald-400'
                  : 'bg-gradient-to-r from-rose-500 to-amber-500'
              }`}
              style={{ width: `${primaryPeer?.battery?.percent || 0}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            {primaryPeer?.online ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live encrypted telemetry</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-slate-500" />
                <span>Offline or unlinked</span>
              </>
            )}
          </p>
        </div>

        {/* Card 3: Connection & Host */}
        <div className="glass-panel p-5 rounded-2xl glow-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Radio className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-slate-200">Bridge Status</span>
            </div>
            <span className="inline-flex items-center space-x-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              <span>SPAKE2 / E2EE</span>
            </span>
          </div>

          <div className="space-y-2 mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Host Name</span>
              <span className="text-slate-200 font-medium">{snapshot?.device_name || 'Linux-Machine'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">mDNS Service</span>
              <span className="text-slate-200 font-mono text-[11px]">_loksync._tcp</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Paired Devices</span>
              <span className="text-indigo-400 font-semibold">{peers.length} active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Paired Peers Section */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>Paired Devices</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-normal">
              {peers.length}
            </span>
          </h3>
        </div>

        {peers.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
            <Smartphone className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-300">No paired devices found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Click &quot;Pair Mobile Device&quot; to securely exchange keys and sync notifications and battery data with your phone.
            </p>
            <button
              onClick={onOpenPairing}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/10 transition-colors cursor-pointer"
            >
              Start Pairing
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {peers.map((peer) => (
              <div
                key={peer.id}
                className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#11131f] ${
                        peer.online ? 'bg-emerald-400' : 'bg-slate-600'
                      }`}
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      {peer.name}
                      <span className="text-[10px] font-mono text-slate-500">({peer.id})</span>
                    </h4>
                    <p className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {formatLastSeen(peer.last_seen)}
                      </span>
                      {peer.battery && (
                        <span className="text-slate-300 font-medium">
                          Battery: {peer.battery.percent}%
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onUnpair(peer.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
