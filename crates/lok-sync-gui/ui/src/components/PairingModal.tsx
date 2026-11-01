import React, { useEffect, useState } from 'react';
import { X, Copy, Check, Clock } from 'lucide-react';
import type { PairingState } from '../types';

interface PairingModalProps {
  pairingState: PairingState;
  theme: 'dark' | 'light';
  onCancel: () => void;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  pairingState,
  theme,
  onCancel,
}) => {
  const isDark = theme === 'dark';
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(pairingState.expires_in_secs);

  useEffect(() => {
    setTimeLeft(pairingState.expires_in_secs);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pairingState.expires_in_secs, pairingState.started_at]);

  const copyPin = () => {
    if (!pairingState.pin) return;
    navigator.clipboard.writeText(pairingState.pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const progressPercent = Math.max(
    0,
    Math.min(100, (timeLeft / (pairingState.expires_in_secs || 120)) * 100)
  );

  // Format PIN nicely e.g. "492 815"
  const formattedPin = pairingState.pin
    ? pairingState.pin.length === 6
      ? `${pairingState.pin.slice(0, 3)} ${pairingState.pin.slice(3)}`
      : pairingState.pin
    : '••••••';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-sm rounded-2xl border shadow-xl overflow-hidden relative ${
          isDark
            ? 'bg-[#1a1a20] border-white/10 text-white'
            : 'bg-white border-black/10 text-[#211c19]'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onCancel}
          className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors cursor-pointer opacity-60 hover:opacity-100 ${
            isDark ? 'hover:bg-white/10' : 'hover:bg-black/05'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 text-center">
          <h3 className="text-lg font-bold tracking-tight">Pair New Device</h3>
          <p
            className={`text-xs mt-1 mb-5 font-medium ${
              isDark ? 'text-zinc-400' : 'text-[#615a54]'
            }`}
          >
            Enter this 6-digit PIN on your phone to securely pair
          </p>

          {/* Clean PIN Card */}
          <div
            className={`p-5 rounded-xl border mb-4 relative flex items-center justify-center ${
              isDark
                ? 'bg-black/30 border-white/[0.08]'
                : 'bg-black/[0.03] border-black/[0.08]'
            }`}
          >
            <span className="text-3xl font-bold font-mono tracking-wider select-all">
              {formattedPin}
            </span>
            <button
              onClick={copyPin}
              className={`absolute right-3 p-2 rounded-lg transition-colors cursor-pointer border ${
                isDark
                  ? 'border-white/10 hover:bg-white/10 text-zinc-300'
                  : 'border-black/10 hover:bg-black/05 text-[#211c19]'
              }`}
              title="Copy PIN"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Timeout Progress */}
          <div className="space-y-1.5 mb-5">
            <div
              className={`w-full rounded-full h-1.5 overflow-hidden ${
                isDark ? 'bg-white/10' : 'bg-black/10'
              }`}
            >
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div
              className={`flex items-center justify-between text-[11px] font-medium ${
                isDark ? 'text-zinc-400' : 'text-[#615a54]'
              }`}
            >
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Expires in {timeLeft}s</span>
              </span>
              <span>Encrypted SPAKE2</span>
            </div>
          </div>

          {/* Status */}
          <div
            className={`p-2.5 rounded-xl text-xs font-medium mb-4 ${
              isDark ? 'bg-white/[0.04] text-zinc-300' : 'bg-black/[0.03] text-[#443e39]'
            }`}
          >
            {pairingState.status || 'Waiting for connection...'}
          </div>

          {/* Cancel */}
          <button
            onClick={onCancel}
            className={`w-full py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              isDark
                ? 'border-white/10 hover:bg-white/10 text-zinc-300'
                : 'border-black/10 hover:bg-black/05 text-[#211c19]'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
