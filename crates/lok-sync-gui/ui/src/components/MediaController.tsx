import React from 'react';
import {
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  Radio,
  RefreshCw,
  Disc3,
  Sliders,
} from 'lucide-react';
import type { MediaPlayerInfo } from '../types';

interface MediaControllerProps {
  mediaInfo: MediaPlayerInfo | null;
  onControl: (action: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const MediaController: React.FC<MediaControllerProps> = ({
  mediaInfo,
  onControl,
  onRefresh,
}) => {
  const isPlaying = mediaInfo?.status.toLowerCase() === 'playing';
  const hasMedia = mediaInfo && mediaInfo.title !== 'No Media Playing' && mediaInfo.title.trim() !== '';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Music className="w-6 h-6 text-indigo-400" />
            <span>Media Player Controller</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Control laptop playback and audio volume seamlessly from Linux desktop or connected phone.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-colors cursor-pointer"
          title="Refresh media status"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Now Playing Showcase Card */}
      <div className="glass-panel p-8 rounded-3xl glow-card relative overflow-hidden border border-white/10 shadow-2xl">
        {/* Ambient background glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          {/* Animated Vinyl Disc / Artwork */}
          <div className="relative group">
            <div
              className={`w-40 h-40 sm:w-48 sm:h-48 rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-800 border border-indigo-500/20 shadow-2xl flex items-center justify-center relative overflow-hidden ${
                isPlaying ? 'ring-2 ring-indigo-500/40 shadow-indigo-500/20' : ''
              }`}
            >
              {/* Disc grooves visual */}
              <div className="absolute inset-2 rounded-full border border-white/5 opacity-50" />
              <div className="absolute inset-6 rounded-full border border-white/5 opacity-40" />
              <div className="absolute inset-10 rounded-full border border-white/5 opacity-30" />

              <Disc3
                className={`w-20 h-20 text-indigo-400/80 transition-all duration-1000 ${
                  isPlaying ? 'animate-spin' : ''
                }`}
                style={{ animationDuration: '6s' }}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Active player badge */}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-0.5 rounded-full bg-slate-900/90 border border-white/10 text-[10px] font-semibold tracking-wider text-slate-300 uppercase shadow-md flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-sky-400" />
              <span>{mediaInfo?.player_name || 'MPRIS'}</span>
            </div>
          </div>

          {/* Track Info & Controls */}
          <div className="flex-1 w-full text-center md:text-left space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border tracking-wide uppercase ${
                    isPlaying
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : mediaInfo?.status === 'Paused'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  }`}
                >
                  {mediaInfo?.status || 'Stopped'}
                </span>
                {mediaInfo?.album && (
                  <span className="text-xs text-slate-400 truncate max-w-xs">
                    Album: {mediaInfo.album}
                  </span>
                )}
              </div>

              <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight line-clamp-2">
                {mediaInfo?.title || 'No Media Playing'}
              </h3>
              <p className="text-sm font-medium text-indigo-300/90 truncate">
                {mediaInfo?.artist && mediaInfo.artist !== 'None' ? mediaInfo.artist : 'Ready for media input'}
              </p>
            </div>

            {/* Playback Controls */}
            <div className="pt-2 flex items-center justify-center md:justify-start gap-4">
              <button
                onClick={() => onControl('previous')}
                disabled={!hasMedia}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-300 hover:text-white border border-white/5 transition-all transform active:scale-95 cursor-pointer shadow-md"
                title="Previous Track"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>

              <button
                onClick={() => onControl('play-pause')}
                className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white shadow-xl shadow-indigo-500/30 transition-all transform active:scale-95 cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current translate-x-0.5" />
                )}
              </button>

              <button
                onClick={() => onControl('next')}
                disabled={!hasMedia}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-300 hover:text-white border border-white/5 transition-all transform active:scale-95 cursor-pointer shadow-md"
                title="Next Track"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>

              <button
                onClick={() => onControl('stop')}
                disabled={!hasMedia}
                className="p-3 rounded-2xl bg-white/5 hover:bg-rose-500/10 disabled:opacity-40 text-slate-400 hover:text-rose-400 border border-white/5 transition-all transform active:scale-95 cursor-pointer shadow-md ml-2"
                title="Stop Playback"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            </div>

            {/* Quick Volume Buttons */}
            <div className="pt-2 flex items-center justify-center md:justify-start gap-3">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Host Volume:</span>
              </span>
              <button
                onClick={() => onControl('volume-down')}
                className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
              >
                -5%
              </button>
              <button
                onClick={() => onControl('volume-up')}
                className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
              >
                +5%
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Guide / Compatibility Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl glow-card">
          <div className="flex items-center space-x-2.5 mb-2">
            <Radio className="w-4 h-4 text-sky-400" />
            <h4 className="text-xs font-bold text-white">Universal MPRIS Support</h4>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Works out-of-the-box with Spotify, Firefox, Chrome, Brave, VLC, mpv, Audacious, and Cider.
          </p>
        </div>

        <div className="glass-panel p-4 rounded-2xl glow-card">
          <div className="flex items-center space-x-2.5 mb-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white">PipeWire & PulseAudio</h4>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Volume commands dynamically bind to <code>wpctl</code> (modern PipeWire) and fallback to <code>pactl</code>.
          </p>
        </div>

        <div className="glass-panel p-4 rounded-2xl glow-card">
          <div className="flex items-center space-x-2.5 mb-2">
            <Music className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold text-white">Remote Phone Control</h4>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Paired mobile devices can pause, play, skip songs, or adjust laptop volume directly from phone lockscreens.
          </p>
        </div>
      </div>
    </div>
  );
};
