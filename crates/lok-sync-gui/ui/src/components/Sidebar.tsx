import React from 'react';
import {
  LayoutDashboard,
  Bell,
  Settings,
  Radio,
  Music,
  Clipboard,
  Cpu,
} from 'lucide-react';
import type { ActiveTab, SystemdServiceStatus } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isConnected: boolean;
  systemdStatus: SystemdServiceStatus | null;
  notificationCount: number;
  pairedCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isConnected,
  systemdStatus,
  notificationCount,
  pairedCount,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: pairedCount > 0 ? `${pairedCount}` : undefined,
    },
    {
      id: 'notifications' as ActiveTab,
      label: 'Notifications',
      icon: Bell,
      badge: notificationCount > 0 ? `${notificationCount}` : undefined,
      badgeColor: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
    },
    {
      id: 'media' as ActiveTab,
      label: 'Media Player',
      icon: Music,
    },
    {
      id: 'clipboard' as ActiveTab,
      label: 'Quick Share',
      icon: Clipboard,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 h-screen bg-[#11131f] border-r border-white/5 flex flex-col justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-white/5 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              LokSync
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                v0.1
              </span>
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'
                }`}
              />
              <span
                className={`font-medium ${
                  isConnected ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isConnected ? 'Daemon Online' : 'Daemon Offline'}
              </span>
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Navigation
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      item.badgeColor || (isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300')
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

      {/* Footer Info with Systemd User Service Status */}
      <div className="p-4 border-t border-white/5 bg-black/20 space-y-2">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center space-x-2">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-300 font-medium">lok-sync.service</span>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              systemdStatus?.active
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}
          >
            {systemdStatus?.active ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="px-2 text-[10px] text-slate-500 font-mono truncate">
          Unix: /run/user/1000/lok-sync/ctl.sock
        </div>
      </div>
    </aside>
  );
};
