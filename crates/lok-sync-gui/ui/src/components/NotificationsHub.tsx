import React, { useState } from 'react';
import {
  Bell,
  Search,
  Trash2,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import type { SyncedNotification } from '../types';

interface NotificationsHubProps {
  notifications: SyncedNotification[];
  onClear: () => void;
}

export const NotificationsHub: React.FC<NotificationsHubProps> = ({
  notifications,
  onClear,
}) => {
  const [search, setSearch] = useState('');

  const filtered = notifications.filter((n) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      n.app.toLowerCase().includes(q) ||
      n.title.toLowerCase().includes(q) ||
      n.body.toLowerCase().includes(q)
    );
  });

  const getAppBadgeColor = (appName: string) => {
    const app = appName.toLowerCase();
    if (app.includes('what') || app.includes('phone')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (app.includes('slack') || app.includes('discord')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (app.includes('mail') || app.includes('gmail')) return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (app.includes('tele')) return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>Notifications Hub</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
              {notifications.length} live
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time notifications mirrored from your mobile device via encrypted stream.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter notifications..."
              className="pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors w-48"
            />
          </div>

          {notifications.length > 0 && (
            <button
              onClick={onClear}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 border border-white/10 text-xs font-medium transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Feed</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <div className="glass-panel text-center py-16 px-4 rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-500 mx-auto mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">
            {search ? 'No notifications match your search' : 'All caught up!'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {search
              ? 'Try adjusting your search keywords or clear the filter.'
              : 'New push notifications arriving on your paired phone will stream here instantly.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((notif) => (
            <div
              key={notif.id}
              className="glass-panel p-4 rounded-2xl glow-card hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${getAppBadgeColor(
                      notif.app
                    )}`}
                  >
                    {notif.app}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-slate-500" />
                    <span>via {notif.peer_name}</span>
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {notif.time_str}
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-100 mb-1">{notif.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{notif.body}</p>

              <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>Sanitized & strip HTML enabled</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
