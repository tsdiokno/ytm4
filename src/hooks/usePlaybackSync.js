import { useState, useEffect } from 'react';

/**
 * Derives current elapsed time (in ms) locally using animation frames based on central playback state.
 */
export function usePlaybackSync(playback) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!playback) return;

    let animFrameId = null;

    const updateFrame = () => {
      if (playback.isPlaying && playback.updatedAt > 0) {
        const now = Date.now();
        const delta = Math.max(0, now - playback.updatedAt);
        setElapsedMs((playback.elapsedMs || 0) + delta);
        animFrameId = requestAnimationFrame(updateFrame);
      } else {
        setElapsedMs(playback.elapsedMs || 0);
      }
    };

    updateFrame();

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [playback?.currentVideoId, playback?.isPlaying, playback?.elapsedMs, playback?.updatedAt]);

  return {
    elapsedMs,
    isPlaying: !!playback?.isPlaying,
    currentVideoId: playback?.currentVideoId || null,
  };
}
