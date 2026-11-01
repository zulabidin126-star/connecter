import React, { useState } from 'react';
import {
  Bell,
  Search,
  Trash2,
  Smartphone,
  Laptop,
  Send,
  Radio,
  CheckCircle2,
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
  const [testBody, setTestBody] = useState('Testing notification sync between Linux and Phone!');
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header and Sub-tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.07]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                isDark
                  ? 'bg-white/[0.08] text-zinc-300'
                  : 'bg-black/[0.06] text-[#211c19]'
              }`}
            >
              {notifications.length}
            </span>
          </div>
          <p
            className={`text-xs mt-1 font-medium ${
              isDark ? 'text-zinc-400' : 'text-[#615a54]'
            }`}
          >
            Mirror notifications between your phone and Linux desktop
          </p>
        </div>

        {/* Clean Segmented Control */}
        <div
          className={`flex items-center p-1 rounded-xl self-start sm:self-auto ${
            isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'
          }`}
        >
          <button
            onClick={() => setActiveSubTab('incoming')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'incoming'
                ? isDark
                  ? 'bg-white/[0.12] text-white shadow-xs'
                  : 'bg-white text-[#211c19] shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-[#615a54] hover:text-[#211c19]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>From Phone ({notifications.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('outgoing')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'outgoing'
                ? isDark
                  ? 'bg-white/[0.12] text-white shadow-xs'
                  : 'bg-white text-[#211c19] shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-[#615a54] hover:text-[#211c19]'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Laptop Forwarding</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'incoming' && (
        <div className="space-y-4">
          {/* Search Bar & Clear Button */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search
                className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50`}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notifications..."
                className={`w-full pl-10 pr-3.5 py-2 rounded-xl text-xs font-medium focus:outline-none transition-colors border ${
                  isDark
                    ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder-zinc-500 focus:border-zinc-400'
                    : 'bg-white border-black/[0.08] text-[#211c19] placeholder-stone-400 focus:border-stone-500'
                }`}
              />
            </div>

            {notifications.length > 0 && (
              <button
                onClick={onClear}
                className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                  isDark
                    ? 'border-white/10 hover:bg-rose-500/10 text-zinc-300 hover:text-rose-400'
                    : 'border-black/10 hover:bg-rose-50 text-[#615a54] hover:text-rose-600'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {/* Notifications Feed */}
          {filtered.length === 0 ? (
            <div className="kde-card text-center py-16 px-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
                  isDark ? 'bg-white/[0.04] text-zinc-400' : 'bg-black/[0.04] text-[#615a54]'
                }`}
              >
                <Bell className="w-6 h-6 stroke-[1.8]" />
              </div>
              <h3 className="text-sm font-bold">
                {search ? 'No notifications match your search' : 'No notifications'}
              </h3>
              <p
                className={`text-xs max-w-sm mx-auto mt-1 font-medium ${
                  isDark ? 'text-zinc-400' : 'text-[#615a54]'
                }`}
              >
                {search
                  ? 'Try a different keyword or clear search.'
                  : 'Notifications received on your phone will appear here in real-time.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((notif) => (
                <div key={notif.id} className="kde-card p-4 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isDark ? 'bg-white/[0.08] text-zinc-200' : 'bg-black/[0.06] text-[#211c19]'
                        }`}
                      >
                        {notif.app}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          isDark ? 'text-zinc-400' : 'text-[#615a54]'
                        }`}
                      >
                        via {notif.peer_name}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-medium ${
                        isDark ? 'text-zinc-500' : 'text-stone-400'
                      }`}
                    >
                      {notif.time_str}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold mb-1">{notif.title}</h4>
                  <p
                    className={`text-xs leading-relaxed ${
                      isDark ? 'text-zinc-300' : 'text-[#443e39]'
                    }`}
                  >
                    {notif.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'outgoing' && (
        <div className="space-y-4">
          {/* Laptop to Phone Settings Card */}
          <div className="kde-card p-6 space-y-4">
            <h3 className="text-sm font-bold">Laptop Notification Forwarding</h3>
            <p
              className={`text-xs font-medium ${
                isDark ? 'text-zinc-400' : 'text-[#615a54]'
              }`}
            >
              Automatically send desktop system notifications (messages, mail alerts, system warnings) to your paired phone.
            </p>

            <label className="flex items-center space-x-3 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={settings.forward_laptop_to_phone}
                onChange={(e) => onUpdateSettings({ forward_laptop_to_phone: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-500 text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-semibold">
                Forward Linux system notifications to phone
              </span>
            </label>
          </div>

          {/* Test Notification Trigger */}
          <div className="kde-card p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-white/[0.06] text-white' : 'bg-black/[0.05] text-[#211c19]'
                }`}
              >
                <Radio className="w-4 h-4 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Test Notification Delivery</h3>
                <p
                  className={`text-xs font-medium ${
                    isDark ? 'text-zinc-400' : 'text-[#615a54]'
                  }`}
                >
                  Send a sample notification via DBus to verify delivery.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label
                  className={`text-[11px] font-semibold uppercase tracking-wider block mb-1 ${
                    isDark ? 'text-zinc-400' : 'text-[#615a54]'
                  }`}
                >
                  Title
                </label>
                <input
                  type="text"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none transition-colors ${
                    isDark
                      ? 'bg-white/[0.03] border-white/[0.08] text-white focus:border-zinc-400'
                      : 'bg-white border-black/[0.08] text-[#211c19] focus:border-stone-500'
                  }`}
                />
              </div>

              <div>
                <label
                  className={`text-[11px] font-semibold uppercase tracking-wider block mb-1 ${
                    isDark ? 'text-zinc-400' : 'text-[#615a54]'
                  }`}
                >
                  Message
                </label>
                <input
                  type="text"
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border focus:outline-none transition-colors ${
                    isDark
                      ? 'bg-white/[0.03] border-white/[0.08] text-white focus:border-zinc-400'
                      : 'bg-white border-black/[0.08] text-[#211c19] focus:border-stone-500'
                  }`}
                />
              </div>

              <button
                onClick={handleSendTest}
                className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                  isDark
                    ? 'bg-white text-zinc-900 hover:bg-zinc-200'
                    : 'bg-[#211c19] text-white hover:bg-[#38302c]'
                }`}
              >
                {testSent ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Send className="w-4 h-4 stroke-[1.8]" />}
                <span>{testSent ? 'Dispatched!' : 'Send Test Notification'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
