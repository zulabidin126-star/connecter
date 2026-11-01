import React from 'react';
import {
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  RefreshCw,
  Radio,
  Disc,
} from 'lucide-react';
import type { MediaPlayerInfo } from '../types';

interface MediaControllerProps {
  mediaInfo: MediaPlayerInfo | null;
  theme: 'dark' | 'light';
  onControl: (action: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const MediaController: React.FC<MediaControllerProps> = ({
  mediaInfo,
  theme,
  onControl,
  onRefresh,
}) => {
  const isDark = theme === 'dark';
  const isPlaying = mediaInfo?.status.toLowerCase() === 'playing';

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.07]">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Multimedia Control</h2>
          <p
            className={`text-xs mt-1 font-medium ${
              isDark ? 'text-zinc-400' : 'text-[#615a54]'
            }`}
          >
            Control playback and volume on your laptop from here or your phone
          </p>
        </div>

        <button
          onClick={onRefresh}
          className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer outline-none ${
            isDark
              ? 'border-white/10 hover:bg-white/[0.06] text-zinc-300'
              : 'border-black/10 hover:bg-black/[0.04] text-[#615a54]'
          }`}
          title="Refresh player state"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Player Card - Professional, High-End Design */}
      <div className="kde-card p-6 sm:p-8 overflow-hidden">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
          {/* Professional Vinyl / Sleeve Artwork Tile */}
          <div
            className={`w-28 h-28 sm:w-36 sm:h-36 rounded-2xl flex items-center justify-center shrink-0 border relative overflow-hidden shadow-sm ${
              isDark
                ? 'bg-[#18181f] border-white/10 text-white'
                : 'bg-[#ede3da] border-black/10 text-[#211c19]'
            }`}
          >
            {/* Vinyl record concentric ring effect */}
            <div className="absolute inset-2 rounded-full border border-black/5 dark:border-white/5 opacity-50" />
            <div className="absolute inset-5 rounded-full border border-black/5 dark:border-white/5 opacity-40" />
            <div className="absolute inset-8 rounded-full border border-black/5 dark:border-white/5 opacity-30" />

            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-inner ${
                isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-stone-200 text-stone-800'
              }`}
            >
              <Disc className={`w-7 h-7 stroke-[2] ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
            </div>
          </div>

          {/* Details & Responsive Controls */}
          <div className="flex-1 min-w-0 w-full text-center md:text-left space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    isPlaying
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : 'bg-zinc-500/15 text-zinc-400'
                  }`}
                >
                  {mediaInfo?.status || 'Stopped'}
                </span>
                {mediaInfo?.player_name && (
                  <span
                    className={`text-xs font-semibold flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${
                      isDark ? 'bg-white/[0.06] text-zinc-300' : 'bg-black/[0.05] text-[#443e39]'
                    }`}
                  >
                    <Radio className="w-3 h-3 text-sky-500" />
                    <span>{mediaInfo.player_name}</span>
                  </span>
                )}
              </div>

              <h3 className="text-lg sm:text-xl font-bold tracking-tight truncate leading-snug">
                {mediaInfo?.title || 'No Media Playing'}
              </h3>
              <p
                className={`text-xs sm:text-sm mt-0.5 font-medium truncate ${
                  isDark ? 'text-zinc-400' : 'text-[#615a54]'
                }`}
              >
                {mediaInfo?.artist && mediaInfo.artist !== 'None'
                  ? mediaInfo.artist
                  : 'Start audio or video in browser or player'}
              </p>
            </div>

            {/* Playback Controls Toolbar - Flexible & Non-Clipping */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
              <button
                onClick={() => onControl('previous')}
                className={`p-3 rounded-xl border transition-all cursor-pointer outline-none shadow-xs active:scale-95 ${
                  isDark
                    ? 'border-white/10 hover:bg-white/[0.08] text-zinc-200'
                    : 'border-black/10 hover:bg-black/[0.06] text-[#211c19]'
                }`}
                title="Previous Track"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>

              <button
                onClick={() => onControl('play-pause')}
                className={`px-5 py-3 rounded-xl transition-all cursor-pointer outline-none shadow-sm flex items-center justify-center active:scale-95 ${
                  isDark
                    ? 'bg-white text-zinc-900 hover:bg-zinc-200'
                    : 'bg-[#211c19] text-white hover:bg-[#38302c]'
                }`}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current translate-x-0.5" />
                )}
              </button>

              <button
                onClick={() => onControl('next')}
                className={`p-3 rounded-xl border transition-all cursor-pointer outline-none shadow-xs active:scale-95 ${
                  isDark
                    ? 'border-white/10 hover:bg-white/[0.08] text-zinc-200'
                    : 'border-black/10 hover:bg-black/[0.06] text-[#211c19]'
                }`}
                title="Next Track"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>

              <button
                onClick={() => onControl('stop')}
                className={`p-3 rounded-xl border transition-all cursor-pointer outline-none shadow-xs active:scale-95 ${
                  isDark
                    ? 'border-white/10 hover:bg-rose-500/15 text-zinc-400 hover:text-rose-400'
                    : 'border-black/10 hover:bg-rose-50 text-[#615a54] hover:text-rose-600'
                }`}
                title="Stop Playback"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            </div>

            {/* Quick Volume Steppers */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
              <span
                className={`text-xs font-semibold flex items-center gap-1.5 mr-1 ${
                  isDark ? 'text-zinc-400' : 'text-[#615a54]'
                }`}
              >
                <Volume2 className="w-4 h-4" />
                <span>Volume:</span>
              </span>
              <button
                onClick={() => onControl('volume-down')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer outline-none active:scale-95 ${
                  isDark
                    ? 'border-white/10 hover:bg-white/[0.06] text-zinc-300'
                    : 'border-black/10 hover:bg-black/[0.04] text-[#211c19]'
                }`}
              >
                -5%
              </button>
              <button
                onClick={() => onControl('volume-up')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer outline-none active:scale-95 ${
                  isDark
                    ? 'border-white/10 hover:bg-white/[0.06] text-zinc-300'
                    : 'border-black/10 hover:bg-black/[0.04] text-[#211c19]'
                }`}
              >
                +5%
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="kde-card p-5">
        <h4 className="text-xs font-bold mb-1 flex items-center gap-1.5">
          <Music className="w-3.5 h-3.5" />
          <span>Universal MPRIS Media Bridge</span>
        </h4>
        <p
          className={`text-xs font-medium leading-relaxed ${
            isDark ? 'text-zinc-400' : 'text-[#615a54]'
          }`}
        >
          Directly controls Spotify, Brave, Firefox, Chrome, VLC, mpv, and system audio volume via PipeWire (<code className="font-mono text-[11px]">wpctl</code>) and PulseAudio.
        </p>
      </div>
    </div>
  );
};
