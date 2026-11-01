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
  onRefreshClipboard: () => Promise<void>;
  onSetClipboard: (text: string) => Promise<void>;
  onSendToPhone: (text: string) => Promise<void>;
}

export const ClipboardView: React.FC<ClipboardViewProps> = ({
  currentClipboard,
  peers,
  onRefreshClipboard,
  onSetClipboard,
  onSendToPhone,
}) => {
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
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Clipboard className="w-6 h-6 text-sky-400" />
            <span>Quick Share & Clipboard</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            LocalSend-style instant text, links, and clipboard synchronization across devices.
          </p>
        </div>

        <button
          onClick={onRefreshClipboard}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Clipboard</span>
        </button>
      </div>

      {/* Current System Clipboard Card */}
      <div className="glass-panel p-6 rounded-2xl glow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Current Host Clipboard</h3>
              <p className="text-xs text-slate-400">
                Live content on your Linux system clipboard (Wayland / X11).
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyCurrent}
              disabled={!currentClipboard}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-xs font-medium text-slate-200 border border-white/10 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              onClick={() => onSendToPhone(currentClipboard)}
              disabled={!currentClipboard || onlinePeers.length === 0}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-colors cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Push to Phone</span>
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-xs text-slate-200 max-h-36 overflow-y-auto whitespace-pre-wrap break-all leading-relaxed">
          {currentClipboard || (
            <span className="text-slate-500 italic font-sans">
              Clipboard is currently empty or contains non-text payload.
            </span>
          )}
        </div>
      </div>

      {/* Send Quick Text / URL Box */}
      <div className="glass-panel p-6 rounded-2xl glow-card space-y-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Send Note, Link, or Snippet</h3>
            <p className="text-xs text-slate-400">
              Type or paste anything to push to paired mobile devices or set on host clipboard.
            </p>
          </div>
        </div>

        <textarea
          rows={4}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste URL (e.g. https://github.com), OTP code, phone number, or notes here..."
          className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none font-sans"
        />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              Target: {onlinePeers.length > 0 ? `${onlinePeers[0].name} (Online)` : 'No mobile peer online'}
            </span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <button
              onClick={handleSetHostClipboard}
              disabled={!inputText.trim()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-xs font-medium text-slate-200 border border-white/10 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Set on Host</span>
            </button>

            <button
              onClick={handleSendInput}
              disabled={!inputText.trim()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 disabled:opacity-40 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all transform active:scale-95 cursor-pointer"
            >
              {sentSuccess ? <Check className="w-3.5 h-3.5 text-white" /> : <Send className="w-3.5 h-3.5" />}
              <span>{sentSuccess ? 'Sent to Phone!' : 'Send to Phone'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Footnote */}
      <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/10 flex items-center space-x-3 text-xs text-slate-400">
        <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
        <p className="leading-relaxed">
          Integrated with <span className="text-indigo-300 font-mono">wl-clipboard</span> (Hyprland, Sway, GNOME Wayland) and <span className="text-indigo-300 font-mono">xclip</span> (X11) for zero-lag copy-paste parity.
        </p>
      </div>
    </div>
  );
};
