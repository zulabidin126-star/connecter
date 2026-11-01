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
  Sun,
  Moon,
} from 'lucide-react';
import type { ActiveTab, SystemdServiceStatus } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isConnected: boolean;
  systemdStatus: SystemdServiceStatus | null;
  notificationCount: number;
  pairedCount: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isConnected,
  systemdStatus,
  notificationCount,
  pairedCount,
  theme,
  onToggleTheme,
}) => {
  const isDark = theme === 'dark';

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
      badgeColor: isDark
        ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40'
        : 'bg-indigo-50 text-indigo-600 border border-indigo-200',
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
    <aside
      className={`w-64 h-screen border-r flex flex-col justify-between select-none relative z-20 transition-colors duration-300 ${
        isDark
          ? 'bg-[#0a0c16]/90 border-white/[0.08] text-slate-100'
          : 'bg-white/90 border-slate-200 text-slate-800'
      } backdrop-blur-2xl`}
    >
      <div>
        {/* Brand Header */}
        <div
          className={`p-6 border-b flex items-center space-x-3.5 ${
            isDark ? 'border-white/[0.06]' : 'border-slate-100'
          }`}
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-teal-400 p-[1px] shadow-lg shadow-indigo-500/20">
            <div
              className={`w-full h-full rounded-2xl flex items-center justify-center ${
                isDark ? 'bg-[#0d0f1c]' : 'bg-white'
              }`}
            >
              <Radio className="w-5 h-5 text-sky-500 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1
                className={`text-base font-extrabold tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                LokSync
              </h1>
              <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-md bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-400/30 uppercase">
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
              <span className={isConnected ? 'text-emerald-500 font-semibold' : 'text-rose-500'}>
                {isConnected ? 'Bridge Online' : 'Bridge Offline'}
              </span>
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5">
          <div className="flex items-center justify-between px-3 mb-2">
            <p
              className={`text-[10px] font-bold uppercase tracking-widest ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
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
                    : isDark
                    ? 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : isDark
                        ? 'bg-white/[0.03] text-slate-400'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      item.badgeColor ||
                      (isActive
                        ? 'bg-white/20 text-white'
                        : isDark
                        ? 'bg-white/10 text-slate-300'
                        : 'bg-slate-200 text-slate-700')
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

      {/* Footer Controls: Theme Toggle & Systemd Status */}
      <div className="p-4 space-y-3">
        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className={`w-full flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all border cursor-pointer ${
            isDark
              ? 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 border-white/[0.08]'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-sm'
          }`}
          title="Toggle Dark / Light Mode"
        >
          <div className="flex items-center space-x-2">
            {isDark ? (
              <Moon className="w-4 h-4 text-indigo-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
            <span>Theme: {isDark ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-100 text-amber-800'
            }`}
          >
            Switch
          </span>
        </button>

        {/* Systemd Unit Badge */}
        <div
          className={`p-3.5 rounded-2xl border backdrop-blur-md space-y-2 ${
            isDark
              ? 'bg-white/[0.02] border-white/[0.06]'
              : 'bg-slate-50 border-slate-200/80 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <span
                className={`text-[11px] font-semibold ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                lok-sync.service
              </span>
            </div>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border tracking-wide uppercase ${
                systemdStatus?.active
                  ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
              }`}
            >
              {systemdStatus?.active ? 'Active' : 'Stopped'}
            </span>
          </div>

          <div
            className={`text-[10px] font-mono flex items-center justify-between pt-1 border-t ${
              isDark ? 'border-white/[0.04] text-slate-500' : 'border-slate-200 text-slate-400'
            }`}
          >
            <span>RAM Usage</span>
            <span className={isDark ? 'text-slate-400 font-medium' : 'text-slate-600 font-medium'}>
              &lt; 1 MB
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
