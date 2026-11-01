import React, { useEffect, useState } from 'react';
import { QrCode, X, Copy, Check, Clock, ShieldAlert } from 'lucide-react';
import type { PairingState } from '../types';

interface PairingModalProps {
  pairingState: PairingState;
  onCancel: () => void;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  pairingState,
  onCancel,
}) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#131625] border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-7 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-4 shadow-lg shadow-indigo-500/20">
            <QrCode className="w-6 h-6" />
          </div>

          <h3 className="text-xl font-bold tracking-tight text-white">Pair Mobile Device</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 mb-6">
            Enter this secure one-time 6-digit PIN in your mobile app to perform cryptographic SPAKE2 key exchange.
          </p>

          {/* Large Glowing PIN Card */}
          <div className="p-5 rounded-2xl bg-[#0c0d17] border border-indigo-500/30 shadow-inner shadow-black/50 mb-6 relative group">
            <span className="text-4xl font-extrabold font-mono tracking-widest text-indigo-300 select-all">
              {pairingState.pin || '••••••'}
            </span>
            <button
              onClick={copyPin}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Copy PIN"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Countdown & Expiration */}
          <div className="space-y-2 mb-6">
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Expires in {timeLeft}s</span>
              </span>
              <span className="text-slate-500 text-[11px]">SPAKE2 Curve25519</span>
            </div>
          </div>

          {/* Security Alert / Status */}
          <div className="flex items-center justify-center space-x-2 text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl mb-6">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="truncate">{pairingState.status || 'Waiting for phone connection...'}</span>
          </div>

          {/* Action */}
          <button
            onClick={onCancel}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
          >
            Cancel Pairing
          </button>
        </div>
      </div>
    </div>
  );
};
