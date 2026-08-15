import React from 'react';
import { usePlaybackSync } from '../hooks/usePlaybackSync';

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const NowPlayingBar = React.memo(function NowPlayingBar({ queue, playback, isHost }) {
  const { elapsedMs, isPlaying, currentVideoId } = usePlaybackSync(playback);

  if (!currentVideoId) return null;

  const currentTrack = queue.find((item) => item.videoId === currentVideoId) || {
    videoId: currentVideoId,
    title: 'Now Playing Track',
  };

  const thumbnailUrl = `https://img.youtube.com/vi/${currentVideoId}/mqdefault.jpg`;

  return (
    <div className="w-full max-w-3xl mx-auto mb-6">
      <div className="bg-zinc-900/90 backdrop-blur border border-amber-500/20 rounded-2xl p-4 shadow-xl flex items-center gap-4">
        {/* Thumbnail */}
        <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-black flex-shrink-0 border border-zinc-800">
          <img
            src={thumbnailUrl}
            alt={currentTrack.title || 'Track thumbnail'}
            className="w-full h-full object-cover"
          />
          {isPlaying && (
            <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
              <span className="flex space-x-0.5">
                <span className="w-1 h-3 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-3 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-3 bg-amber-400 rounded-full animate-bounce" />
              </span>
            </div>
          )}
        </div>

        {/* Title & info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
              {isPlaying ? 'Now Playing' : 'Paused'}
            </span>
            {!isHost && (
              <span className="text-xs text-zinc-400">
                Synced from Host
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-zinc-100 truncate">
            {currentTrack.title || `Video ID: ${currentVideoId}`}
          </h3>
        </div>

        {/* Live elapsed timer display */}
        <div className="flex-shrink-0 text-right">
          <div className="font-mono text-base font-semibold text-amber-400">
            {formatTime(elapsedMs)}
          </div>
          <div className="text-xs text-zinc-400">
            elapsed
          </div>
        </div>
      </div>
    </div>
  );
});
