import React, { useState } from 'react';
import {
  Clipboard,
  Send,
  Copy,
  Check,
  RefreshCw,
  FileText,
  Smartphone,
  Sparkles,
  Link2,
} from 'lucide-react';
import type { PeerInfo } from '../types';

interface ClipboardViewProps {
  currentClipboard: string;
  peers: PeerInfo[];
  theme: 'dark' | 'light';
  onRefreshClipboard: () => Promise<void>;
  onSetClipboard: (text: string) => Promise<void>;
  onSendToPhone: (text: string) => Promise<void>;
}

export const ClipboardView: React.FC<ClipboardViewProps> = ({
  currentClipboard,
  peers,
  theme,
  onRefreshClipboard,
  onSetClipboard,
  onSendToPhone,
}) => {
  const isDark = theme === 'dark';
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleCopyCurrent = () => {
    if (!currentClipboard) return;
    onSetClipboard(currentClipboard);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendInput = async () => {
    if (!inputText.trim()) return;
    await onSendToPhone(inputText);
    setSentSuccess(true);
    setInputText('');
    setTimeout(() => setSentSuccess(false), 2500);
  };

  const handleSetHostClipboard = async () => {
    if (!inputText.trim()) return;
    await onSetClipboard(inputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onlinePeers = peers.filter((p) => p.online);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Clipboard className="w-6 h-6 text-sky-500" />
            <h2
              className={`text-2xl sm:text-3xl font-black tracking-tight ${
                isDark ? 'title-gradient-dark' : 'title-gradient-light'
              }`}
            >
              Quick Share & Clipboard
            </h2>
          </div>
          <p className={`text-xs sm:text-sm mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            LocalSend-style instant text, links, and clipboard synchronization across devices.
          </p>
        </div>

        <button
          onClick={onRefreshClipboard}
          className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl border text-xs font-semibold transition-colors cursor-pointer ${
            isDark
              ? 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Clipboard</span>
        </button>
      </div>

      {/* Current System Clipboard Card */}
      <div
        className={`p-6 rounded-3xl glow-card space-y-4 border ${
          isDark ? 'glass-panel-dark glow-card-dark' : 'glass-panel-light glow-card-light'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-500">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Current Host Clipboard
              </h3>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Live content on your Linux system clipboard (Wayland / X11).
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyCurrent}
              disabled={!currentClipboard}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl border text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 ${
                isDark
                  ? 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              onClick={() => onSendToPhone(currentClipboard)}
              disabled={!currentClipboard || onlinePeers.length === 0}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-sky-500 to-teal-400 hover:opacity-95 disabled:opacity-40 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer ring-1 ring-white/20"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Push to Phone</span>
            </button>
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border font-mono text-xs max-h-36 overflow-y-auto whitespace-pre-wrap break-all leading-relaxed ${
            isDark
              ? 'bg-black/40 border-white/5 text-slate-200'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          {currentClipboard || (
            <span className="text-slate-400 italic font-sans">
              Clipboard is currently empty or contains non-text payload.
            </span>
          )}
        </div>
      </div>

      {/* Send Quick Text / URL Box */}
      <div
        className={`p-6 rounded-3xl glow-card space-y-4 border ${
          isDark ? 'glass-panel-dark glow-card-dark' : 'glass-panel-light glow-card-light'
        }`}
      >
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Send Note, Link, or Snippet
            </h3>
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Type or paste anything to push to paired mobile devices or set on host clipboard.
            </p>
          </div>
        </div>

        <textarea
          rows={4}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste URL (e.g. https://github.com), OTP code, phone number, or notes here..."
          className={`w-full p-4 rounded-2xl border text-xs font-medium focus:outline-none transition-colors resize-none ${
            isDark
              ? 'bg-white/[0.03] border-white/[0.08] text-slate-100 placeholder-slate-500 focus:border-indigo-500'
              : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500 shadow-sm'
          }`}
        />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className={`flex items-center space-x-2 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Target: {onlinePeers.length > 0 ? `${onlinePeers[0].name} (Online)` : 'No mobile peer online'}
            </span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <button
              onClick={handleSetHostClipboard}
              disabled={!inputText.trim()}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-2xl border text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 ${
                isDark
                  ? 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Set on Host</span>
            </button>

            <button
              onClick={handleSendInput}
              disabled={!inputText.trim()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-sky-500 to-teal-400 hover:opacity-95 disabled:opacity-40 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all transform active:scale-95 cursor-pointer ring-1 ring-white/20"
            >
              {sentSuccess ? <Check className="w-3.5 h-3.5 text-white" /> : <Send className="w-3.5 h-3.5" />}
              <span>{sentSuccess ? 'Sent to Phone!' : 'Send to Phone'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Footnote */}
      <div
        className={`p-4 rounded-3xl border flex items-center space-x-3 text-xs ${
          isDark
            ? 'bg-indigo-950/20 border-indigo-500/20 text-slate-400'
            : 'bg-indigo-50/60 border-indigo-100 text-slate-600'
        }`}
      >
        <Sparkles className="w-5 h-5 text-indigo-500 shrink-0" />
        <p className="leading-relaxed font-medium">
          Integrated with <span className="text-indigo-500 font-mono font-semibold">wl-clipboard</span> (Wayland) and <span className="text-indigo-500 font-mono font-semibold">xclip</span> (X11) for zero-lag copy-paste parity.
        </p>
      </div>
    </div>
  );
};
