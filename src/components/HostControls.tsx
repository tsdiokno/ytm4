import React, { useState } from 'react';
import { PlaybackState } from '../types';
import { updatePlaybackState, skipTrack } from '../utils/api';
import { formatDuration } from '../utils/epoch';
import { Play, Pause, SkipForward, RefreshCw, Radio } from 'lucide-react';

interface HostControlsProps {
  state: PlaybackState;
  playhead: number;
  onSyncNeeded: () => void;
}

export const HostControls: React.FC<HostControlsProps> = ({ state, playhead, onSyncNeeded }) => {
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [scrubPosition, setScrubPosition] = useState<number>(0);

  const duration = state.currentTrack?.duration || 180;
  const displayProgress = isScrubbing ? scrubPosition : playhead;
  const progressPercent = Math.min(100, Math.max(0, (displayProgress / duration) * 100));

  const handleTogglePlay = async () => {
    if (!state.currentTrack) return;
    setIsUpdating(true);
    try {
      const newStatus = state.status === 'playing' ? 'paused' : 'playing';
      await updatePlaybackState({
        status: newStatus,
        referenceTime: playhead,
        epochTimestamp: Date.now() / 1000,
      });
      onSyncNeeded();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSeekStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!state.currentTrack) return;
    setIsScrubbing(true);
    updateScrubFromEvent(e);
  };

  const updateScrubFromEvent = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setScrubPosition(ratio * duration);
  };

  const handleSeekCommit = async (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!state.currentTrack) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'changedTouches' in e ? (e as any).changedTouches[0].clientX : (e as any).clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetSeconds = ratio * duration;

    setIsScrubbing(false);
    setIsUpdating(true);
    try {
      await updatePlaybackState({
        referenceTime: targetSeconds,
        epochTimestamp: Date.now() / 1000,
      });
      onSyncNeeded();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSkip = async () => {
    setIsUpdating(true);
    try {
      await skipTrack();
      onSyncNeeded();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFastSeek = async (secondsDelta: number) => {
    if (!state.currentTrack) return;
    const target = Math.max(0, Math.min(duration, playhead + secondsDelta));
    setIsUpdating(true);
    try {
      await updatePlaybackState({
        referenceTime: target,
        epochTimestamp: Date.now() / 1000,
      });
      onSyncNeeded();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Radio className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold text-neutral-100 text-base">Host Control Deck</h3>
          <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-orange-400 font-mono">
            State Writer Mode
          </span>
        </div>
        <span className="text-xs text-neutral-400 font-mono">
          State v{state.version} • {state.status.toUpperCase()}
        </span>
      </div>

      {/* Scrub Bar */}
      <div className="space-y-1.5">
        <div
          id="host-scrub-bar"
          className={`relative w-full h-3 bg-neutral-950 border border-neutral-800 rounded-full overflow-hidden cursor-pointer group select-none ${
            !state.currentTrack ? 'opacity-40 cursor-not-allowed' : ''
          }`}
          onMouseDown={handleSeekStart}
          onMouseUp={handleSeekCommit}
          onTouchStart={handleSeekStart}
          onTouchEnd={handleSeekCommit}
        >
          {/* Background fill */}
          <div
            className="h-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400 rounded-full transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Thumb marker on hover */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPercent}% - 8px)` }}
          />
        </div>

        <div className="flex justify-between text-xs font-mono text-neutral-400">
          <span>{formatDuration(displayProgress)}</span>
          <span className="text-neutral-500">Epoch Inferred Placement</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center space-x-2">
          <button
            id="host-seek-backward-10"
            type="button"
            onClick={() => handleFastSeek(-10)}
            disabled={!state.currentTrack || isUpdating}
            className="px-3 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 disabled:opacity-40 text-neutral-300 rounded-xl text-xs font-mono font-medium transition-colors"
            title="Rewind 10s"
          >
            -10s
          </button>
          <button
            id="host-seek-forward-10"
            type="button"
            onClick={() => handleFastSeek(10)}
            disabled={!state.currentTrack || isUpdating}
            className="px-3 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 disabled:opacity-40 text-neutral-300 rounded-xl text-xs font-mono font-medium transition-colors"
            title="Forward 10s"
          >
            +10s
          </button>
        </div>

        {/* Central Play/Pause and Skip */}
        <div className="flex items-center space-x-3">
          <button
            id="host-play-pause-btn"
            type="button"
            onClick={handleTogglePlay}
            disabled={!state.currentTrack || isUpdating}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:opacity-40 text-neutral-950 flex items-center justify-center shadow-lg shadow-orange-500/25 transition-all transform active:scale-95 font-bold"
            title={state.status === 'playing' ? 'Pause State' : 'Play State'}
          >
            {state.status === 'playing' ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
          </button>

          <button
            id="host-skip-btn"
            type="button"
            onClick={handleSkip}
            disabled={isUpdating}
            className="w-11 h-11 rounded-full bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 flex items-center justify-center transition-colors shadow hover:text-orange-400"
            title="Skip to Next in Queue"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Sync / Refresh */}
        <div>
          <button
            id="host-force-sync-btn"
            type="button"
            onClick={onSyncNeeded}
            className="p-2.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-orange-400 rounded-xl transition-colors"
            title="Force Sync State JSON"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
