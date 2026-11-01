import React from 'react';
import {
  LayoutGrid,
  Bell,
  SlidersHorizontal,
  PlayCircle,
  ClipboardCopy,
  Monitor,
  Smartphone,
  PlusCircle,
  Sun,
  Moon,
  CheckCircle2,
  Circle,
  Radio,
} from 'lucide-react';
import type { ActiveTab, SystemdServiceStatus, StateSnapshot } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  snapshot: StateSnapshot | null;
  isConnected: boolean;
  systemdStatus: SystemdServiceStatus | null;
  notificationCount: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenPairing: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  snapshot,
  isConnected,
  systemdStatus,
  notificationCount,
  theme,
  onToggleTheme,
  onOpenPairing,
}) => {
  const isDark = theme === 'dark';
  const peers = snapshot?.peers || [];
  const hostName = snapshot?.device_name || 'Linux Laptop';

  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: LayoutGrid,
    },
    {
      id: 'notifications' as ActiveTab,
      label: 'Notifications',
      icon: Bell,
      badge: notificationCount > 0 ? `${notificationCount}` : undefined,
    },
    {
      id: 'media' as ActiveTab,
      label: 'Multimedia control',
      icon: PlayCircle,
    },
    {
      id: 'clipboard' as ActiveTab,
      label: 'Send clipboard',
      icon: ClipboardCopy,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Settings',
      icon: SlidersHorizontal,
    },
  ];

  return (
    <aside
      className={`w-64 h-screen border-r flex flex-col justify-between select-none shrink-0 transition-colors ${
        isDark
          ? 'bg-[#18181c] border-white/[0.07] text-[#f4f4f7]'
          : 'bg-[#f3ede7] border-black/[0.06] text-[#211c19]'
      }`}
    >
      <div className="overflow-y-auto">
        {/* App Header (KDE Connect style) */}
        <div
          className={`p-5 border-b flex items-center space-x-3.5 ${
            isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
              isDark ? 'bg-white text-zinc-900' : 'bg-[#211c19] text-white'
            }`}
          >
            <Radio className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold tracking-tight truncate leading-tight">
              LokSync
            </h1>
            <p
              className={`text-xs truncate mt-0.5 font-medium ${
                isDark ? 'text-zinc-400' : 'text-[#615a54]'
              }`}
            >
              {hostName}
            </p>
          </div>
        </div>

        {/* Devices Section (Exact replica of KDE Connect drawer in User's screenshot) */}
        <div className="p-3">
          <p
            className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${
              isDark ? 'text-zinc-500' : 'text-[#8e857e]'
            }`}
          >
            Devices
          </p>

          <div className="space-y-1">
            {/* Host Machine */}
            <div
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium ${
                isDark ? 'text-zinc-300' : 'text-[#443e39]'
              }`}
            >
              <Monitor className="w-4 h-4 stroke-[2] shrink-0 opacity-80" />
              <span className="truncate flex-1 font-semibold">{hostName}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="This Device" />
            </div>

            {/* Paired Mobile Devices */}
            {peers.map((peer) => {
              const isSelected = activeTab === 'dashboard';
              return (
                <button
                  key={peer.id}
                  onClick={() => onTabChange('dashboard')}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left outline-none ${
                    isSelected
                      ? isDark
                        ? 'bg-[#333340] text-white shadow-xs'
                        : 'bg-[#fae4dc] text-[#211c19] shadow-xs'
                      : isDark
                      ? 'text-zinc-300 hover:bg-white/[0.04]'
                      : 'text-[#443e39] hover:bg-black/[0.04]'
                  }`}
                >
                  <Smartphone className="w-4 h-4 stroke-[2] shrink-0" />
                  <span className="truncate flex-1">{peer.name}</span>
                  {peer.online ? (
                    <span className="text-[10px] text-emerald-500 font-bold">Online</span>
                  ) : (
                    <span className="text-[10px] text-zinc-400 font-normal">Offline</span>
                  )}
                </button>
              );
            })}

            {/* Pair New Device Action */}
            <button
              onClick={onOpenPairing}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left outline-none border border-transparent hover:border-black/5 dark:hover:border-white/5 active:scale-[0.98] ${
                isDark
                  ? 'text-zinc-300 hover:text-white hover:bg-white/[0.05]'
                  : 'text-[#443e39] hover:text-[#211c19] hover:bg-black/[0.04]'
              }`}
            >
              <PlusCircle className="w-4 h-4 stroke-[2] shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Pair new device</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div
          className={`mx-4 my-2 border-t ${
            isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'
          }`}
        />

        {/* Navigation Features */}
        <nav className="p-3 space-y-1">
          <p
            className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${
              isDark ? 'text-zinc-500' : 'text-[#8e857e]'
            }`}
          >
            Features
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer outline-none ${
                  isActive
                    ? isDark
                      ? 'bg-white/[0.1] text-white font-bold'
                      : 'bg-[#e9dfd6] text-[#211c19] font-bold'
                    : isDark
                    ? 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                    : 'text-[#615a54] hover:text-[#211c19] hover:bg-black/[0.03]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4 stroke-[2]" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isDark
                        ? 'bg-white/15 text-white'
                        : 'bg-[#dbcbc1] text-[#211c19]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls: Theme Toggle & Service Status */}
      <div
        className={`p-3 border-t space-y-2 ${
          isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'
        }`}
      >
        <button
          onClick={onToggleTheme}
          className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer outline-none ${
            isDark
              ? 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              : 'text-[#615a54] hover:text-[#211c19] hover:bg-black/[0.04]'
          }`}
          title="Toggle Theme"
        >
          <div className="flex items-center space-x-2.5">
            {isDark ? (
              <Moon className="w-4 h-4 stroke-[2]" />
            ) : (
              <Sun className="w-4 h-4 stroke-[2]" />
            )}
            <span>{isDark ? 'Dark Theme' : 'Light Theme'}</span>
          </div>
          <span className="text-[11px] opacity-70">Switch</span>
        </button>

        <div
          className={`px-3.5 py-2 rounded-xl text-[11px] flex items-center justify-between font-medium ${
            isDark ? 'bg-white/[0.03] text-zinc-400' : 'bg-black/[0.03] text-[#615a54]'
          }`}
        >
          <span className="flex items-center gap-1.5">
            {isConnected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-rose-500" />
            )}
            <span>Service</span>
          </span>
          <span
            className={`font-semibold ${
              systemdStatus?.active ? 'text-emerald-500' : 'text-zinc-500'
            }`}
          >
            {systemdStatus?.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </aside>
  );
};
