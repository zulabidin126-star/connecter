import React from 'react';
import {
  ShieldCheck,
  Terminal,
  Server,
  Smartphone,
  EyeOff,
  Sliders,
  Play,
  Square,
  RotateCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { GuiSettings, SystemdServiceStatus } from '../types';

interface SettingsViewProps {
  settings: GuiSettings;
  systemdStatus: SystemdServiceStatus | null;
  onUpdateSettings: (newSettings: Partial<GuiSettings>) => void;
  onManageSystemd: (action: string) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  systemdStatus,
  onUpdateSettings,
  onManageSystemd,
}) => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Sliders className="w-6 h-6 text-indigo-400" />
          <span>Settings & Configuration</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Manage systemd background service, device privacy, and end-to-end encryption.
        </p>
      </div>

      <div className="space-y-5">
        {/* Systemd Service Lifecycle Management */}
        <div className="glass-panel p-6 rounded-2xl glow-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Systemd User Service: lok-sync.service</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      systemdStatus?.active
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {systemdStatus?.active ? 'Active (Running)' : 'Inactive (Stopped)'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Runs the ultra-lightweight Rust daemon in background under <code>lok-sync.slice</code> (16 MB cap).
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {systemdStatus?.active ? (
                <button
                  onClick={() => onManageSystemd('stop')}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop Service</span>
                </button>
              ) : (
                <button
                  onClick={() => onManageSystemd('start')}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start Service</span>
                </button>
              )}

              <button
                onClick={() => onManageSystemd('restart')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>
            </div>
          </div>

          {/* Autostart toggle */}
          <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs">
              {systemdStatus?.enabled ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-slate-500" />
              )}
              <span className="text-slate-300">
                Login Autostart: <strong className="text-white">{systemdStatus?.enabled ? 'Enabled' : 'Disabled'}</strong>
              </span>
            </div>

            <button
              onClick={() => onManageSystemd(systemdStatus?.enabled ? 'disable' : 'enable')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-200 border border-white/10 transition-colors cursor-pointer w-fit"
            >
              {systemdStatus?.enabled ? 'Disable Autostart' : 'Enable Autostart on Login'}
            </button>
          </div>

          <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] font-mono text-slate-400 space-y-1">
            <p className="text-slate-500"># Check logs anytime with systemd:</p>
            <p className="text-indigo-300">journalctl --user -u lok-sync.service -f</p>
          </div>
        </div>

        {/* Device Naming & Identity */}
        <div className="glass-panel p-5 rounded-2xl glow-card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Device Naming & Identity</h3>
              <p className="text-xs text-slate-400">
                How this machine identifies itself over local mDNS discovery.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <label className="text-xs text-slate-300 font-medium whitespace-nowrap">
              Advertised Name:
            </label>
            <input
              type="text"
              value={settings.device_name}
              onChange={(e) => onUpdateSettings({ device_name: e.target.value })}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors w-64"
            />
          </div>
        </div>

        {/* Privacy & Notification Hygiene */}
        <div className="glass-panel p-5 rounded-2xl glow-card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <EyeOff className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Notification Privacy & Hygiene</h3>
              <p className="text-xs text-slate-400">
                Filter and sanitize notifications forwarded from mobile apps.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.plain_text_only}
                onChange={(e) => onUpdateSettings({ plain_text_only: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-200 font-medium">
                Plain-text only (strip HTML tags, scripts, and rich formatting)
              </span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.hide_body_when_locked}
                onChange={(e) => onUpdateSettings({ hide_body_when_locked: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-200 font-medium">
                Hide notification body preview when the desktop lockscreen is active
              </span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.forward_laptop_to_phone}
                onChange={(e) => onUpdateSettings({ forward_laptop_to_phone: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-200 font-medium">
                Forward Linux system notifications to connected phone
              </span>
            </label>
          </div>
        </div>

        {/* End-to-End Encryption & Security Keys */}
        <div className="glass-panel p-5 rounded-2xl glow-card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">End-to-End Cryptography</h3>
              <p className="text-xs text-slate-400">
                Cryptographic algorithms and key protection standards in use.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-slate-400 block mb-1">Host Identity Algorithm</span>
              <span className="text-indigo-400 font-mono font-semibold">Ed25519 (256-bit signatures)</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-slate-400 block mb-1">Session Key Exchange</span>
              <span className="text-indigo-400 font-mono font-semibold">X25519 + HKDF-SHA256</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-slate-400 block mb-1">Authenticated Encryption</span>
              <span className="text-emerald-400 font-mono font-semibold">AES-128-GCM (implicit nonce)</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-slate-400 block mb-1">Pairing Zero-Knowledge Protocol</span>
              <span className="text-sky-400 font-mono font-semibold">SPAKE2 (Curve25519)</span>
            </div>
          </div>
        </div>

        {/* Approved Commands */}
        <div className="glass-panel p-5 rounded-2xl glow-card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Allow-listed Remote Actions</h3>
              <p className="text-xs text-slate-400">
                Only these pre-approved shell actions can be invoked remotely by paired phones.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5">
              <span className="text-indigo-300">lock-screen</span>
              <span className="text-slate-400">loginctl lock-session</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5">
              <span className="text-indigo-300">volume-up / volume-down</span>
              <span className="text-slate-400">wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+/-</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5">
              <span className="text-indigo-300">play-pause / next / previous</span>
              <span className="text-slate-400">playerctl [action]</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5">
              <span className="text-indigo-300">suspend</span>
              <span className="text-slate-400">systemctl suspend</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
