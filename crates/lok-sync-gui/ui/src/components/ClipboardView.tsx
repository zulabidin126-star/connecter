import React, { useState } from 'react';
import {
  Send,
  Copy,
  Check,
  RefreshCw,
  Smartphone,
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.07]">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Send Clipboard & Files</h2>
          <p
            className={`text-xs mt-1 font-medium ${
              isDark ? 'text-zinc-400' : 'text-[#615a54]'
            }`}
          >
            Instant clipboard synchronization and text sharing across devices
          </p>
        </div>

        <button
          onClick={onRefreshClipboard}
          className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
            isDark
              ? 'border-white/10 hover:bg-white/[0.06] text-zinc-300'
              : 'border-black/10 hover:bg-black/[0.04] text-[#615a54]'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Current System Clipboard Card */}
      <div className="kde-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Current Laptop Clipboard</h3>
            <p
              className={`text-xs font-medium mt-0.5 ${
                isDark ? 'text-zinc-400' : 'text-[#615a54]'
              }`}
            >
              Text copied on your Linux desktop (Wayland / X11)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyCurrent}
              disabled={!currentClipboard}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 ${
                isDark
                  ? 'border-white/10 hover:bg-white/[0.06] text-zinc-300'
                  : 'border-black/10 hover:bg-black/[0.04] text-[#211c19]'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={() => onSendToPhone(currentClipboard)}
              disabled={!currentClipboard || onlinePeers.length === 0}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 shadow-xs ${
                isDark
                  ? 'bg-white text-zinc-900 hover:bg-zinc-200'
                  : 'bg-[#211c19] text-white hover:bg-[#38302c]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Send to Phone</span>
            </button>
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border font-mono text-xs max-h-36 overflow-y-auto whitespace-pre-wrap break-all leading-relaxed ${
            isDark
              ? 'bg-black/30 border-white/[0.06] text-zinc-200'
              : 'bg-black/[0.02] border-black/[0.06] text-[#211c19]'
          }`}
        >
          {currentClipboard || (
            <span className="opacity-50 italic font-sans">
              Clipboard is currently empty or contains non-text content.
            </span>
          )}
        </div>
      </div>

      {/* Send Quick Text / URL Box */}
      <div className="kde-card p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold">Send Text, URL, or Note</h3>
          <p
            className={`text-xs font-medium mt-0.5 ${
              isDark ? 'text-zinc-400' : 'text-[#615a54]'
            }`}
          >
            Type or paste content to send to your phone or set on laptop clipboard.
          </p>
        </div>

        <textarea
          rows={4}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste link, OTP code, phone number, or notes here..."
          className={`w-full p-4 rounded-xl border text-xs font-medium focus:outline-none transition-colors resize-none ${
            isDark
              ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder-zinc-500 focus:border-zinc-400'
              : 'bg-white border-black/[0.08] text-[#211c19] placeholder-stone-400 focus:border-stone-500'
          }`}
        />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div
            className={`flex items-center space-x-2 text-xs font-medium ${
              isDark ? 'text-zinc-400' : 'text-[#615a54]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Target: {onlinePeers.length > 0 ? `${onlinePeers[0].name} (Connected)` : 'No phone connected'}
            </span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <button
              onClick={handleSetHostClipboard}
              disabled={!inputText.trim()}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 ${
                isDark
                  ? 'border-white/10 hover:bg-white/[0.06] text-zinc-300'
                  : 'border-black/10 hover:bg-black/[0.04] text-[#211c19]'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Set on Laptop</span>
            </button>

            <button
              onClick={handleSendInput}
              disabled={!inputText.trim()}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 shadow-xs ${
                isDark
                  ? 'bg-white text-zinc-900 hover:bg-zinc-200'
                  : 'bg-[#211c19] text-white hover:bg-[#38302c]'
              }`}
            >
              {sentSuccess ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Send className="w-3.5 h-3.5 stroke-[1.8]" />}
              <span>{sentSuccess ? 'Sent to Phone!' : 'Send to Phone'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
