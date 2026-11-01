import React from 'react';
import {
  LayoutDashboard,
  Bell,
  Settings,
  Radio,
  Music,
  Share2,
  Cpu,
  Sparkles,
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
      badgeColor: 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40',
    },
    {
      id: 'media' as ActiveTab,
      label: 'Media Player',
      icon: Music,
    },
    {
      id: 'clipboard' as ActiveTab,
      label: 'Quick Share',
      icon: Share2,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 h-screen bg-[#0a0c16]/90 backdrop-blur-2xl border-r border-white/[0.08] flex flex-col justify-between select-none relative z-20">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-white/[0.06] flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-teal-400 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-[#0d0f1c] rounded-2xl flex items-center justify-center">
              <Radio className="w-5 h-5 text-sky-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white">
                LokSync
              </h1>
              <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-md bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-300 border border-sky-400/30 uppercase">
                Pro
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-medium">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                }`}
              />
              <span className={isConnected ? 'text-emerald-400' : 'text-rose-400'}>
                {isConnected ? 'Bridge Online' : 'Bridge Offline'}
              </span>
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5">
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Navigation
            </p>
            <Sparkles className="w-3 h-3 text-indigo-400/60" />
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-600 text-white shadow-lg shadow-indigo-600/25 ring-1 ring-white/20'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-white/[0.03] text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
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
      <div className="p-4 m-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] text-slate-300 font-semibold">lok-sync.service</span>
          </div>
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border tracking-wide uppercase ${
              systemdStatus?.active
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}
          >
            {systemdStatus?.active ? 'Active' : 'Stopped'}
          </span>
        </div>

        <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-white/[0.04]">
          <span>RAM Slice</span>
          <span className="text-slate-400 font-medium">&lt; 1 MB</span>
        </div>
      </div>
    </aside>
  );
};
