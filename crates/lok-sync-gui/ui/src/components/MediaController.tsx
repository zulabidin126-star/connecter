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
  const hasMedia = mediaInfo && mediaInfo.title !== 'No Media Playing' && mediaInfo.title.trim() !== '';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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
          className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
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

      {/* Main Player Card - Clean, Human, Native */}
      <div className="kde-card p-8">
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          {/* Album artwork / Music Tile */}
          <div
            className={`w-32 h-32 sm:w-40 sm:h-40 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
              isDark
                ? 'bg-white/[0.04] border-white/[0.08] text-white'
                : 'bg-[#f4ebe4] border-black/[0.06] text-[#211c19]'
            }`}
          >
            <Music className="w-12 h-12 stroke-[1.6] opacity-80" />
          </div>

          {/* Details & Controls */}
          <div className="flex-1 min-w-0 text-center sm:text-left space-y-4">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    isPlaying
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : 'bg-zinc-500/15 text-zinc-400'
                  }`}
                >
                  {mediaInfo?.status || 'Stopped'}
                </span>
                {mediaInfo?.player_name && (
                  <span
                    className={`text-xs font-medium flex items-center gap-1 ${
                      isDark ? 'text-zinc-400' : 'text-[#615a54]'
                    }`}
                  >
                    <Radio className="w-3 h-3" />
                    <span>{mediaInfo.player_name}</span>
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold tracking-tight truncate">
                {mediaInfo?.title || 'No Media Playing'}
              </h3>
              <p
                className={`text-sm mt-0.5 font-medium truncate ${
                  isDark ? 'text-zinc-400' : 'text-[#615a54]'
                }`}
              >
                {mediaInfo?.artist && mediaInfo.artist !== 'None'
                  ? mediaInfo.artist
                  : 'Start playing music or video on your system'}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center sm:justify-start space-x-3 pt-1">
              <button
                onClick={() => onControl('previous')}
                disabled={!hasMedia}
                className={`p-2.5 rounded-xl border transition-colors cursor-pointer disabled:opacity-30 ${
                  isDark
                    ? 'border-white/10 hover:bg-white/[0.06] text-zinc-300'
                    : 'border-black/10 hover:bg-black/[0.04] text-[#211c19]'
                }`}
                title="Previous"
              >
                <SkipBack className="w-5 h-5 stroke-[1.8]" />
              </button>

              <button
                onClick={() => onControl('play-pause')}
                className={`p-3.5 rounded-2xl transition-all cursor-pointer shadow-xs ${
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
                disabled={!hasMedia}
                className={`p-2.5 rounded-xl border transition-colors cursor-pointer disabled:opacity-30 ${
                  isDark
                    ? 'border-white/10 hover:bg-white/[0.06] text-zinc-300'
                    : 'border-black/10 hover:bg-black/[0.04] text-[#211c19]'
                }`}
                title="Next"
              >
                <SkipForward className="w-5 h-5 stroke-[1.8]" />
              </button>

              <button
                onClick={() => onControl('stop')}
                disabled={!hasMedia}
                className={`p-2.5 rounded-xl border transition-colors cursor-pointer disabled:opacity-30 ${
                  isDark
                    ? 'border-white/10 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400'
                    : 'border-black/10 hover:bg-rose-50 text-[#615a54] hover:text-rose-600'
                }`}
                title="Stop"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            </div>

            {/* Volume control */}
            <div className="flex items-center justify-center sm:justify-start space-x-2 pt-2">
              <span
                className={`text-xs font-semibold flex items-center gap-1.5 ${
                  isDark ? 'text-zinc-400' : 'text-[#615a54]'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Volume:</span>
              </span>
              <button
                onClick={() => onControl('volume-down')}
                className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                  isDark
                    ? 'border-white/10 hover:bg-white/[0.06] text-zinc-300'
                    : 'border-black/10 hover:bg-black/[0.04] text-[#211c19]'
                }`}
              >
                -5%
              </button>
              <button
                onClick={() => onControl('volume-up')}
                className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
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
        <h4 className="text-xs font-bold mb-1">Universal MPRIS Support</h4>
        <p
          className={`text-xs font-medium leading-relaxed ${
            isDark ? 'text-zinc-400' : 'text-[#615a54]'
          }`}
        >
          Compatible with all standard Linux media players including Spotify, Firefox, Chrome, Brave, VLC, mpv, and Rhythmbox. Volume commands interface cleanly with PipeWire (<code className="font-mono text-[11px]">wpctl</code>) and PulseAudio (<code className="font-mono text-[11px]">pactl</code>).
        </p>
      </div>
    </div>
  );
};
