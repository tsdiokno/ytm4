import React from 'react';
import { Play, Pause, Square, SkipForward, Trash2 } from 'lucide-react';

export function HostControls({
  isHost,
  isPlaying,
  onTogglePlayPause,
  onStop,
  onNext,
  onClearQueue,
  queueLength,
}) {
  if (!isHost) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4">
      <div className="bg-zinc-900/95 border border-amber-500/30 backdrop-blur-xl rounded-2xl p-2.5 sm:p-3 shadow-2xl shadow-black/80 flex items-center justify-between gap-2">
        {/* Playback Controls (Play/Pause, Stop, Next) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Play / Pause Toggle */}
          <button
            onClick={onTogglePlayPause}
            disabled={queueLength === 0}
            className={`flex items-center gap-1.5 font-bold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 text-xs sm:text-sm cursor-pointer disabled:cursor-not-allowed ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20'
                : 'bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950'
            }`}
            title={isPlaying ? 'Pause playback' : 'Play queue'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          {/* Stop Button (rewinds playback head to 0:00) */}
          <button
            onClick={onStop}
            disabled={queueLength === 0}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 hover:text-red-400 disabled:opacity-40 text-zinc-200 font-semibold px-3 sm:px-3.5 py-2.5 rounded-xl transition-all active:scale-95 text-xs sm:text-sm cursor-pointer disabled:cursor-not-allowed"
            title="Stop and rewind to beginning (0:00)"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Stop</span>
          </button>

          {/* Next / Skip */}
          <button
            onClick={onNext}
            disabled={queueLength === 0}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-100 font-semibold px-3 sm:px-4 py-2.5 rounded-xl transition-all active:scale-95 text-xs sm:text-sm cursor-pointer disabled:cursor-not-allowed"
            title="Skip to next song and play"
          >
            <SkipForward className="w-4 h-4" />
            <span>Next</span>
          </button>
        </div>

        {/* Clear Queue */}
        <button
          onClick={onClearQueue}
          disabled={queueLength === 0}
          className="flex items-center gap-1 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 px-3 py-2 rounded-xl transition-all text-xs font-medium cursor-pointer disabled:cursor-not-allowed"
          title="Clear all upcoming songs"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>
    </div>
  );
}
