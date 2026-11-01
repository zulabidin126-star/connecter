import React from 'react';
import {
  ShieldCheck,
  Terminal,
  Server,
  Smartphone,
  EyeOff,
  Sliders,
} from 'lucide-react';
import type { GuiSettings } from '../types';

interface SettingsViewProps {
  settings: GuiSettings;
  onUpdateSettings: (newSettings: Partial<GuiSettings>) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
}) => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Sliders className="w-6 h-6 text-indigo-400" />
          <span>Settings & Configuration</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Customize device privacy, background services, and end-to-end encryption.
        </p>
      </div>

      <div className="space-y-5">
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

        {/* System Integration */}
        <div className="glass-panel p-5 rounded-2xl glow-card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">System Integration</h3>
              <p className="text-xs text-slate-400">
                Manage background daemon systemd lifecycle on login.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autostart}
                onChange={(e) => onUpdateSettings({ autostart: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
              />
              <span className="text-xs text-slate-200 font-medium">
                Start LokSync daemon on login (systemd user unit: lok-sync.service)
              </span>
            </label>
            <p className="text-[11px] text-slate-500 pl-7">
              Automatically launches inside a strict systemd resource slice (max 16 MB RSS limit).
            </p>
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

            <p className="text-[11px] text-slate-500 pl-7">
              Automatic spam rate limiter active: maximum 10 notifications per 10 seconds.
            </p>
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
              <span className="text-indigo-300">volume-up</span>
              <span className="text-slate-400">wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5">
              <span className="text-indigo-300">play-pause</span>
              <span className="text-slate-400">playerctl play-pause</span>
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
