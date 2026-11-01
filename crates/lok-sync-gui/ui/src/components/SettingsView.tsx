import React from 'react';
import {
  Server,
  Play,
  Square,
  RotateCw,
  Sun,
  Moon,
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-black/[0.06] dark:border-white/[0.07]">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p
          className={`text-xs mt-1 font-medium ${
            isDark ? 'text-zinc-400' : 'text-[#615a54]'
          }`}
        >
          Manage background service, appearance, privacy, and device pairing
        </p>
      </div>

      <div className="space-y-4">
        {/* Appearance Theme */}
        <div className="kde-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Theme</h3>
              <p
                className={`text-xs font-medium mt-0.5 ${
                  isDark ? 'text-zinc-400' : 'text-[#615a54]'
                }`}
              >
                Choose between Dark obsidian or Warm porcelain light mode
              </p>
            </div>

            <div
              className={`flex items-center p-1 rounded-xl ${
                isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'
              }`}
            >
              <button
                onClick={() => isDark || onToggleTheme()}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isDark
                    ? 'bg-white/[0.12] text-white shadow-xs'
                    : 'text-[#615a54] hover:text-[#211c19]'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
              <button
                onClick={() => !isDark || onToggleTheme()}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  !isDark
                    ? 'bg-white text-[#211c19] shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
            </div>
          </div>
        </div>

        {/* Systemd Service Lifecycle */}
        <div className="kde-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isDark ? 'bg-white/[0.06] text-white' : 'bg-black/[0.05] text-[#211c19]'
                }`}
              >
                <Server className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <span>Background Service (lok-sync.service)</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      systemdStatus?.active
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-rose-500/15 text-rose-500'
                    }`}
                  >
                    {systemdStatus?.active ? 'Active' : 'Stopped'}
                  </span>
                </h3>
                <p
                  className={`text-xs font-medium mt-0.5 ${
                    isDark ? 'text-zinc-400' : 'text-[#615a54]'
                  }`}
                >
                  Manages encrypted sockets, MPRIS listeners, and DBus notifications
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto">
              {systemdStatus?.active ? (
                <button
                  onClick={() => onManageSystemd('stop')}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  onClick={() => onManageSystemd('start')}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start</span>
                </button>
              )}

              <button
                onClick={() => onManageSystemd('restart')}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                  isDark
                    ? 'border-white/10 hover:bg-white/[0.06] text-zinc-300'
                    : 'border-black/10 hover:bg-black/[0.04] text-[#211c19]'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span
              className={`text-xs font-medium ${
                isDark ? 'text-zinc-300' : 'text-[#443e39]'
              }`}
            >
              Start automatically on user login:{' '}
              <strong>{systemdStatus?.enabled ? 'Enabled' : 'Disabled'}</strong>
            </span>

            <button
              onClick={() => onManageSystemd(systemdStatus?.enabled ? 'disable' : 'enable')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer w-fit ${
                isDark
                  ? 'border-white/10 hover:bg-white/[0.06] text-zinc-300'
                  : 'border-black/10 hover:bg-black/[0.04] text-[#211c19]'
              }`}
            >
              {systemdStatus?.enabled ? 'Disable Autostart' : 'Enable Autostart'}
            </button>
          </div>
        </div>

        {/* Device Name */}
        <div className="kde-card p-6">
          <h3 className="text-sm font-bold">Device Name</h3>
          <p
            className={`text-xs font-medium mt-0.5 mb-3 ${
              isDark ? 'text-zinc-400' : 'text-[#615a54]'
            }`}
          >
            Name displayed to other devices on local network
          </p>

          <input
            type="text"
            value={settings.device_name}
            onChange={(e) => onUpdateSettings({ device_name: e.target.value })}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none transition-colors w-full sm:w-72 ${
              isDark
                ? 'bg-white/[0.03] border-white/[0.08] text-white focus:border-zinc-400'
                : 'bg-white border-black/[0.08] text-[#211c19] focus:border-stone-500'
            }`}
          />
        </div>

        {/* Notification Privacy */}
        <div className="kde-card p-6 space-y-3">
          <h3 className="text-sm font-bold">Notification Privacy</h3>
          <p
            className={`text-xs font-medium mt-0.5 mb-2 ${
              isDark ? 'text-zinc-400' : 'text-[#615a54]'
            }`}
          >
            Control how notifications are processed and displayed
          </p>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.plain_text_only}
              onChange={(e) => onUpdateSettings({ plain_text_only: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-500 text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <span className="text-xs font-medium">
              Strip HTML tags and rich formatting from phone notifications
            </span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.hide_body_when_locked}
              onChange={(e) => onUpdateSettings({ hide_body_when_locked: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-500 text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <span className="text-xs font-medium">
              Hide message content preview when screen is locked
            </span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.forward_laptop_to_phone}
              onChange={(e) => onUpdateSettings({ forward_laptop_to_phone: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-500 text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <span className="text-xs font-medium">
              Forward laptop desktop notifications to paired phone
            </span>
          </label>
        </div>

        {/* Security / Cryptography */}
        <div className="kde-card p-6">
          <h3 className="text-sm font-bold mb-1">Security & Encryption</h3>
          <p
            className={`text-xs font-medium mb-3 ${
              isDark ? 'text-zinc-400' : 'text-[#615a54]'
            }`}
          >
            All peer communication is authenticated and encrypted end-to-end
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div
              className={`p-3 rounded-xl border ${
                isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-black/[0.02] border-black/[0.05]'
              }`}
            >
              <span className="block text-[10px] opacity-60">Identity</span>
              <span className="font-semibold">Ed25519</span>
            </div>
            <div
              className={`p-3 rounded-xl border ${
                isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-black/[0.02] border-black/[0.05]'
              }`}
            >
              <span className="block text-[10px] opacity-60">Key Exchange</span>
              <span className="font-semibold">X25519</span>
            </div>
            <div
              className={`p-3 rounded-xl border ${
                isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-black/[0.02] border-black/[0.05]'
              }`}
            >
              <span className="block text-[10px] opacity-60">Encryption</span>
              <span className="font-semibold">AES-128-GCM</span>
            </div>
            <div
              className={`p-3 rounded-xl border ${
                isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-black/[0.02] border-black/[0.05]'
              }`}
            >
              <span className="block text-[10px] opacity-60">Pairing</span>
              <span className="font-semibold">SPAKE2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
