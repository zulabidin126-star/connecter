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
  Sun,
  Moon,
  Palette,
} from 'lucide-react';
import type { GuiSettings, SystemdServiceStatus } from '../types';

interface SettingsViewProps {
  settings: GuiSettings;
  systemdStatus: SystemdServiceStatus | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onUpdateSettings: (newSettings: Partial<GuiSettings>) => void;
  onManageSystemd: (action: string) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  systemdStatus,
  theme,
  onToggleTheme,
  onUpdateSettings,
  onManageSystemd,
}) => {
  const isDark = theme === 'dark';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2.5">
          <Sliders className="w-6 h-6 text-indigo-500" />
          <h2
            className={`text-2xl sm:text-3xl font-black tracking-tight ${
              isDark ? 'title-gradient-dark' : 'title-gradient-light'
            }`}
          >
            Settings & Configuration
          </h2>
        </div>
        <p className={`text-xs sm:text-sm mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Manage systemd background service, appearance themes, and end-to-end encryption.
        </p>
      </div>

      <div className="space-y-5">
        {/* Appearance & Color Theme */}
        <div
          className={`p-6 rounded-3xl glow-card space-y-4 border ${
            isDark ? 'glass-panel-dark glow-card-dark' : 'glass-panel-light glow-card-light'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Appearance Theme
                </h3>
                <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Choose between Obsidian Dark mode or Clean Porcelain Light mode.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => isDark || onToggleTheme()}
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-xs font-semibold border transition-all cursor-pointer ${
                  isDark
                    ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white border-transparent shadow-md ring-1 ring-white/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
              <button
                onClick={() => !isDark || onToggleTheme()}
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-xs font-semibold border transition-all cursor-pointer ${
                  !isDark
                    ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white border-transparent shadow-md ring-1 ring-white/20'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
            </div>
          </div>
        </div>

        {/* Systemd Service Lifecycle Management */}
        <div
          className={`p-6 rounded-3xl glow-card space-y-4 border ${
            isDark ? 'glass-panel-dark glow-card-dark' : 'glass-panel-light glow-card-light'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-500">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>Systemd Service: lok-sync.service</span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                      systemdStatus?.active
                        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                    }`}
                  >
                    {systemdStatus?.active ? 'Active' : 'Stopped'}
                  </span>
                </h3>
                <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Runs the ultra-lightweight Rust daemon in background under <code>lok-sync.slice</code> (16 MB cap).
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto">
              {systemdStatus?.active ? (
                <button
                  onClick={() => onManageSystemd('stop')}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 border border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop Service</span>
                </button>
              ) : (
                <button
                  onClick={() => onManageSystemd('start')}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500 border border-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start Service</span>
                </button>
              )}

              <button
                onClick={() => onManageSystemd('restart')}
                className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl border text-xs font-semibold transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>
            </div>
          </div>

          {/* Autostart toggle */}
          <div className="pt-2 border-t border-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs font-medium">
              {systemdStatus?.enabled ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-slate-400" />
              )}
              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                Login Autostart:{' '}
                <strong className={isDark ? 'text-white' : 'text-slate-900'}>
                  {systemdStatus?.enabled ? 'Enabled' : 'Disabled'}
                </strong>
              </span>
            </div>

            <button
              onClick={() => onManageSystemd(systemdStatus?.enabled ? 'disable' : 'enable')}
              className={`px-3.5 py-1.5 rounded-2xl text-xs font-semibold border transition-colors cursor-pointer w-fit ${
                isDark
                  ? 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
              }`}
            >
              {systemdStatus?.enabled ? 'Disable Autostart' : 'Enable Autostart on Login'}
            </button>
          </div>

          <div
            className={`p-3.5 rounded-2xl border font-mono text-[11px] space-y-1 ${
              isDark ? 'bg-black/30 border-white/5' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <p className={isDark ? 'text-slate-500' : 'text-slate-400'}># Check logs anytime with systemd:</p>
            <p className="text-indigo-500 font-semibold">journalctl --user -u lok-sync.service -f</p>
          </div>
        </div>

        {/* Device Naming & Identity */}
        <div
          className={`p-6 rounded-3xl glow-card border ${
            isDark ? 'glass-panel-dark glow-card-dark' : 'glass-panel-light glow-card-light'
          }`}
        >
          <div className="flex items-center space-x-3.5 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Device Naming & Identity
              </h3>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                How this machine identifies itself over local mDNS discovery.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className={`text-xs font-semibold whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Advertised Name:
            </label>
            <input
              type="text"
              value={settings.device_name}
              onChange={(e) => onUpdateSettings({ device_name: e.target.value })}
              className={`px-3.5 py-2 rounded-2xl text-xs font-medium border focus:outline-none transition-colors w-full sm:w-64 ${
                isDark
                  ? 'bg-white/[0.03] border-white/[0.08] text-white focus:border-indigo-500'
                  : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500 shadow-sm'
              }`}
            />
          </div>
        </div>

        {/* Privacy & Notification Hygiene */}
        <div
          className={`p-6 rounded-3xl glow-card border ${
            isDark ? 'glass-panel-dark glow-card-dark' : 'glass-panel-light glow-card-light'
          }`}
        >
          <div className="flex items-center space-x-3.5 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Notification Privacy & Hygiene
              </h3>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
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
                className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                Plain-text only (strip HTML tags, scripts, and rich formatting)
              </span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.hide_body_when_locked}
                onChange={(e) => onUpdateSettings({ hide_body_when_locked: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                Hide notification body preview when the desktop lockscreen is active
              </span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.forward_laptop_to_phone}
                onChange={(e) => onUpdateSettings({ forward_laptop_to_phone: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                Forward Linux system notifications to connected phone
              </span>
            </label>
          </div>
        </div>

        {/* End-to-End Encryption & Security Keys */}
        <div
          className={`p-6 rounded-3xl glow-card border ${
            isDark ? 'glass-panel-dark glow-card-dark' : 'glass-panel-light glow-card-light'
          }`}
        >
          <div className="flex items-center space-x-3.5 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                End-to-End Cryptography
              </h3>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Cryptographic algorithms and key protection standards in use.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`block mb-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Host Identity</span>
              <span className="text-indigo-500 font-mono font-bold">Ed25519 (256-bit signatures)</span>
            </div>
            <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`block mb-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Key Exchange</span>
              <span className="text-indigo-500 font-mono font-bold">X25519 + HKDF-SHA256</span>
            </div>
            <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`block mb-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Encryption</span>
              <span className="text-emerald-500 font-mono font-bold">AES-128-GCM (implicit nonce)</span>
            </div>
            <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`block mb-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Pairing Protocol</span>
              <span className="text-sky-500 font-mono font-bold">SPAKE2 (Curve25519)</span>
            </div>
          </div>
        </div>

        {/* Approved Commands */}
        <div
          className={`p-6 rounded-3xl glow-card border ${
            isDark ? 'glass-panel-dark glow-card-dark' : 'glass-panel-light glow-card-light'
          }`}
        >
          <div className="flex items-center space-x-3.5 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Allow-listed Remote Actions
              </h3>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Only these pre-approved shell actions can be invoked remotely by paired phones.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className={`flex items-center justify-between p-2.5 rounded-xl border ${isDark ? 'bg-black/30 border-white/5 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              <span className="text-indigo-500 font-semibold">lock-screen</span>
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>loginctl lock-session</span>
            </div>
            <div className={`flex items-center justify-between p-2.5 rounded-xl border ${isDark ? 'bg-black/30 border-white/5 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              <span className="text-indigo-500 font-semibold">volume-up / volume-down</span>
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+/-</span>
            </div>
            <div className={`flex items-center justify-between p-2.5 rounded-xl border ${isDark ? 'bg-black/30 border-white/5 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              <span className="text-indigo-500 font-semibold">play-pause / next / previous</span>
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>playerctl [action]</span>
            </div>
            <div className={`flex items-center justify-between p-2.5 rounded-xl border ${isDark ? 'bg-black/30 border-white/5 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              <span className="text-indigo-500 font-semibold">suspend</span>
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>systemctl suspend</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
