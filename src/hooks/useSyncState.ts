import { useState, useEffect, useCallback } from 'react';
import { PlaybackState, PlaylistData } from '../types';
import { fetchSyncState } from '../utils/api';
import { calculatePlayhead } from '../utils/epoch';

export function useSyncState(_isHost: boolean) {
  const [state, setState] = useState<PlaybackState>({
    status: 'idle',
    currentTrack: null,
    referenceTime: 0,
    epochTimestamp: Date.now() / 1000,
    playbackRate: 1.0,
    version: 1,
    updatedAt: Date.now() / 1000,
  });

  const [playlist, setPlaylist] = useState<PlaylistData>({
    queue: [],
    history: [],
    settings: { roomName: 'Crowd-Q Lounge' },
  });

  const [playhead, setPlayhead] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());

  // Sync poller
  const syncNow = useCallback(async () => {
    try {
      const result = await fetchSyncState();

      if (result && result.notModified === false) {
        const { state: incomingState, playlist: incomingPlaylist } = result.data;
        console.log('%c[API] GET /api/sync -> New Data (200 OK)', 'color: #8b5cf6;', {
          stateVersion: incomingState.version,
          trackId: incomingState.currentTrack?.id,
          queueLength: incomingPlaylist.queue.length,
        });

        // Only update state if version, status, track, or epoch vector changed
        setState((prev) => {
          if (
            prev.version === incomingState.version &&
            prev.status === incomingState.status &&
            prev.currentTrack?.id === incomingState.currentTrack?.id &&
            prev.referenceTime === incomingState.referenceTime &&
            prev.epochTimestamp === incomingState.epochTimestamp
          ) {
            return prev;
          }
          console.log('%c[STATE-UPDATE] state.json changed', 'color: #ec4899; font-weight: bold;', {
            prevVersion: prev.version,
            nextVersion: incomingState.version,
          });
          return incomingState;
        });

        // Only update playlist if queue length or items have changed
        setPlaylist((prev) => {
          const prevQueueIds = prev.queue.map((q) => q.uid).join(',');
          const nextQueueIds = incomingPlaylist.queue.map((q) => q.uid).join(',');
          const prevHistoryIds = prev.history.map((h) => h.uid).join(',');
          const nextHistoryIds = incomingPlaylist.history.map((h) => h.uid).join(',');

          if (
            prevQueueIds === nextQueueIds &&
            prevHistoryIds === nextHistoryIds &&
            prev.settings.roomName === incomingPlaylist.settings.roomName
          ) {
            return prev;
          }
          console.log('%c[QUEUE-UPDATE] queue.json changed', 'color: #10b981;', {
            queueLength: incomingPlaylist.queue.length,
          });
          return incomingPlaylist;
        });

        setLastSyncTime(Date.now());
      } else if (result?.notModified) {
        // Unmodified on server (HTTP 304)
      }
    } catch (err) {
      console.warn('[API] GET /api/sync error:', err);
    }
  }, []);

  // Adaptive Gated Polling: 3s active tab, 8s background tab, immediate on visibility restore
  useEffect(() => {
    let intervalId: any;

    const setupPoller = () => {
      if (intervalId) clearInterval(intervalId);
      const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      const pollDelay = isHidden ? 8000 : 3000;
      intervalId = setInterval(syncNow, pollDelay);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncNow();
      }
      setupPoller();
    };

    syncNow();
    setupPoller();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncNow]);

  // 60 FPS requestAnimationFrame epoch playhead ticker
  useEffect(() => {
    let animId: number;

    const tick = () => {
      const nowSec = Date.now() / 1000;
      const currentPos = calculatePlayhead(state, nowSec);
      setPlayhead(currentPos);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [state]);

  return {
    state,
    setState,
    playlist,
    setPlaylist,
    playhead,
    lastSyncTime,
    syncNow,
  };
}