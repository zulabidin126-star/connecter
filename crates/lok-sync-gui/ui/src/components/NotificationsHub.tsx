import React, { useState } from 'react';
import {
  Bell,
  Search,
  Trash2,
  Smartphone,
  Laptop,
  Sparkles,
  Send,
  Radio,
  CheckCircle2,
  ArrowRightLeft,
} from 'lucide-react';
import type { SyncedNotification, GuiSettings } from '../types';

interface NotificationsHubProps {
  notifications: SyncedNotification[];
  settings: GuiSettings;
  onClear: () => void;
  onUpdateSettings: (newSettings: Partial<GuiSettings>) => void;
  onSendTestNotification: (title: string, body: string) => Promise<void>;
}

export const NotificationsHub: React.FC<NotificationsHubProps> = ({
  notifications,
  settings,
  onClear,
  onUpdateSettings,
  onSendTestNotification,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [search, setSearch] = useState('');
  const [testTitle, setTestTitle] = useState('LokSync Alert');
  const [testBody, setTestBody] = useState('Testing bidirectional notification sync between Linux and Phone!');
  const [testSent, setTestSent] = useState(false);

  const filtered = notifications.filter((n) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      n.app.toLowerCase().includes(q) ||
      n.title.toLowerCase().includes(q) ||
      n.body.toLowerCase().includes(q)
    );
  });

  const handleSendTest = async () => {
    if (!testTitle.trim()) return;
    await onSendTestNotification(testTitle, testBody);
    setTestSent(true);
    setTimeout(() => setTestSent(false), 2500);
  };

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
            <Bell className="w-6 h-6 text-indigo-400" />
            <span>Notifications Hub</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
              {notifications.length} live
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Bidirectional notification mirroring: Phone &rarr; Laptop and Laptop &rarr; Phone.
          </p>
        </div>

        {/* Sub-tab switcher */}
        <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10">
          <button
            onClick={() => setActiveSubTab('incoming')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeSubTab === 'incoming'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>From Phone ({notifications.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('outgoing')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeSubTab === 'outgoing'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>To Phone (Outgoing)</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'incoming' && (
        <div className="space-y-4">
          {/* Search Bar & Clear Button */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search phone notifications..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
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
      )}

      {activeSubTab === 'outgoing' && (
        <div className="space-y-5">
          {/* Laptop to Phone Settings Card */}
          <div className="glass-panel p-6 rounded-2xl glow-card space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Laptop &rarr; Phone Notification Forwarding</h3>
                <p className="text-xs text-slate-400">
                  Forward desktop system notifications (emails, messages, terminal alerts) to your paired phone.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.forward_laptop_to_phone}
                  onChange={(e) => onUpdateSettings({ forward_laptop_to_phone: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-200 font-medium">
                  Enable automatic forwarding of Linux DBus notifications to paired mobile devices
                </span>
              </label>
            </div>
          </div>

          {/* Test Notification Trigger */}
          <div className="glass-panel p-6 rounded-2xl glow-card space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Trigger Test Desktop Notification</h3>
                <p className="text-xs text-slate-400">
                  Emit a system notification via <code>notify-send</code> to test desktop delivery and phone sync.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Message Body
                </label>
                <input
                  type="text"
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={handleSendTest}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-medium text-xs shadow-lg shadow-indigo-500/25 transition-all transform active:scale-95 cursor-pointer"
              >
                {testSent ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Send className="w-4 h-4" />}
                <span>{testSent ? 'Notification Dispatched!' : 'Send Test Notification'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
