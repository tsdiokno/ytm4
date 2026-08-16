import React from 'react';
import { PlaybackState } from '../types';
import { formatDuration } from '../utils/epoch';
import { Music, Disc3, User } from 'lucide-react';

interface NowPlayingProps {
  state: PlaybackState;
  playhead: number;
  isHost: boolean;
}

export const NowPlaying: React.FC<NowPlayingProps> = ({ state, playhead, isHost }) => {
  const current = state.currentTrack;
  const duration = current?.duration || 180;
  const progressPercent = Math.min(100, Math.max(0, (playhead / duration) * 100));

  const isPlaying = state.status === 'playing';

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      {/* Dynamic Background Glow in Orange */}
      {current && (
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none transition-all duration-1000 bg-orange-600"
        />
      )}

      <div className="relative z-10 space-y-6">
        {/* Top Status Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isPlaying ? 'bg-orange-500 animate-ping' : state.status === 'paused' ? 'bg-neutral-500' : 'bg-neutral-700'
              }`}
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              {isPlaying ? 'Now Playing' : state.status === 'paused' ? 'Playback Paused' : 'Idle / Waiting'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-950 text-neutral-400 border border-neutral-800 font-mono">
              Sync Epoch v{state.version}
            </span>
          </div>
        </div>

        {/* Track Details & Album Art */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden shadow-2xl bg-black flex-shrink-0 border border-neutral-800 group">
            {current?.thumbnail ? (
              <img
                src={current.thumbnail}
                alt={current.title}
                referrerPolicy="no-referrer"
                className={`w-full h-full object-cover transition-transform duration-500 ${
                  isPlaying ? 'scale-105' : 'scale-100'
                }`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-700">
                <Music className="w-16 h-16 stroke-1" />
              </div>
            )}

            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Disc3 className="w-10 h-10 text-orange-400 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2.5 min-w-0 w-full">
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-100 line-clamp-2 tracking-tight">
              {current ? current.title : 'No Track in Playback'}
            </h2>

            <p className="text-base text-neutral-400 font-medium truncate">
              {current ? current.author : 'Add a YouTube or YouTube Music link to begin'}
            </p>

            {current && (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs text-neutral-400">
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-neutral-950/80 border border-neutral-800">
                  <User className="w-3 h-3 text-neutral-500" />
                  <span>Cued by <strong className="text-neutral-200">{current.addedBy}</strong></span>
                </span>
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-neutral-950/80 border border-neutral-800 font-mono">
                  <span>ID: {current.id}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Inferred Playhead Progress */}
        <div className="space-y-2">
          <div className="relative w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800/80">
            <div
              className={`h-full rounded-full transition-all duration-100 ${
                isPlaying
                  ? 'bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400'
                  : 'bg-neutral-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-xs font-mono text-neutral-400 px-0.5">
            <span>{formatDuration(playhead)}</span>
            <span className="text-[11px] text-neutral-500 hidden sm:inline">
              {!isHost ? 'Guest View • 60 FPS Epoch Sync' : 'Live Host Broadcast'}
            </span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
