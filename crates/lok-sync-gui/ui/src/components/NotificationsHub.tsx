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
  theme: 'dark' | 'light';
  onClear: () => void;
  onUpdateSettings: (newSettings: Partial<GuiSettings>) => void;
  onSendTestNotification: (title: string, body: string) => Promise<void>;
}

export const NotificationsHub: React.FC<NotificationsHubProps> = ({
  notifications,
  settings,
  theme,
  onClear,
  onUpdateSettings,
  onSendTestNotification,
}) => {
  const isDark = theme === 'dark';
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
      {/* Header and Sub-tab Controls - Wrapped cleanly for all screen sizes */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                isDark ? 'title-gradient-dark' : 'title-gradient-light'
              }`}
            >
              Notifications Hub
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                isDark
                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                  : 'bg-indigo-50 text-indigo-600 border-indigo-200'
              }`}
            >
              {notifications.length} live
            </span>
          </div>
          <p className={`text-xs sm:text-sm mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Bidirectional mirroring: Phone &rarr; Laptop and Laptop &rarr; Phone.
          </p>
        </div>

        {/* Responsive Segmented Control */}
        <div
          className={`flex items-center p-1 rounded-2xl border self-start md:self-auto shrink-0 ${
            isDark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            onClick={() => setActiveSubTab('incoming')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'incoming'
                ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-md'
                : isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>From Phone ({notifications.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('outgoing')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'outgoing'
                ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-md'
                : isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
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
              <Search
                className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search phone notifications..."
                className={`w-full pl-10 pr-3.5 py-2 rounded-2xl text-xs font-medium focus:outline-none transition-colors border ${
                  isDark
                    ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder-slate-500 focus:border-indigo-500'
                    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500 shadow-sm'
                }`}
              />
            </div>

            {notifications.length > 0 && (
              <button
                onClick={onClear}
                className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl border text-xs font-semibold transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-white/[0.03] hover:bg-rose-500/15 text-slate-300 hover:text-rose-400 border-white/[0.08]'
                    : 'bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border-slate-200 shadow-sm'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Feed</span>
              </button>
            )}
          </div>

          {/* Notifications Feed */}
          {filtered.length === 0 ? (
            <div
              className={`text-center py-20 px-4 rounded-3xl border ${
                isDark
                  ? 'glass-panel-dark glow-card-dark'
                  : 'glass-panel-light glow-card-light'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-3xl border flex items-center justify-center mx-auto mb-4 ${
                  isDark
                    ? 'bg-white/[0.03] border-white/[0.08] text-slate-500'
                    : 'bg-slate-100 border-slate-200 text-slate-400'
                }`}
              >
                <Bell className="w-7 h-7" />
              </div>
              <h3
                className={`text-sm font-bold ${
                  isDark ? 'text-slate-200' : 'text-slate-800'
                }`}
              >
                {search ? 'No notifications match your search' : 'All caught up!'}
              </h3>
              <p className={`text-xs max-w-sm mx-auto mt-1.5 font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
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
                  className={`p-4 rounded-3xl glow-card transition-all border ${
                    isDark
                      ? 'glass-panel-dark glow-card-dark hover:bg-white/[0.04]'
                      : 'glass-panel-light glow-card-light hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border uppercase tracking-wider ${getAppBadgeColor(
                          notif.app
                        )}`}
                      >
                        {notif.app}
                      </span>
                      <span className={`text-xs flex items-center gap-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                        <span>via {notif.peer_name}</span>
                      </span>
                    </div>
                    <span className={`text-[11px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {notif.time_str}
                    </span>
                  </div>

                  <h4
                    className={`text-sm font-bold mb-1 ${
                      isDark ? 'text-slate-100' : 'text-slate-900'
                    }`}
                  >
                    {notif.title}
                  </h4>
                  <p
                    className={`text-xs leading-relaxed ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {notif.body}
                  </p>

                  <div
                    className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[11px] font-medium ${
                      isDark ? 'border-white/[0.04] text-slate-500' : 'border-slate-100 text-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
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
          <div
            className={`p-6 rounded-3xl glow-card space-y-4 border ${
              isDark ? 'glass-panel-dark glow-card-dark' : 'glass-panel-light glow-card-light'
            }`}
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Laptop &rarr; Phone Notification Forwarding
                </h3>
                <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
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
                  className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  Enable automatic forwarding of Linux DBus notifications to paired mobile devices
                </span>
              </label>
            </div>
          </div>

          {/* Test Notification Trigger */}
          <div
            className={`p-6 rounded-3xl glow-card space-y-4 border ${
              isDark ? 'glass-panel-dark glow-card-dark' : 'glass-panel-light glow-card-light'
            }`}
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Trigger Test Desktop Notification
                </h3>
                <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Emit a system notification via <code>notify-send</code> to test desktop delivery and phone sync.
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Notification Title
                </label>
                <input
                  type="text"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-2xl text-xs font-medium border focus:outline-none transition-colors ${
                    isDark
                      ? 'bg-white/[0.03] border-white/[0.08] text-white focus:border-indigo-500'
                      : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500 shadow-sm'
                  }`}
                />
              </div>

              <div>
                <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Message Body
                </label>
                <input
                  type="text"
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-2xl text-xs font-medium border focus:outline-none transition-colors ${
                    isDark
                      ? 'bg-white/[0.03] border-white/[0.08] text-white focus:border-indigo-500'
                      : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500 shadow-sm'
                  }`}
                />
              </div>

              <button
                onClick={handleSendTest}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-sky-500 to-teal-400 hover:opacity-95 text-white font-semibold text-xs shadow-xl shadow-indigo-500/20 transition-all transform active:scale-95 cursor-pointer ring-1 ring-white/20"
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
