import { useState, useEffect, useRef, useCallback } from 'react';
import { PlaybackState, PlaylistData } from '../types';
import { fetchSyncState, skipTrack } from '../utils/api';
import { calculatePlayhead } from '../utils/epoch';

export function useSyncState(isHost: boolean) {
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
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  const isAdvancingRef = useRef<boolean>(false);

  // Sync poller
  const syncNow = useCallback(async () => {
    try {
      setIsSyncing(true);
      const data = await fetchSyncState();
      if (data) {
        setState(data.state);
        setPlaylist(data.playlist);
        setLastSyncTime(Date.now());
      }
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Periodic gated polling (every 1.5s)
  useEffect(() => {
    syncNow();
    const interval = setInterval(syncNow, 1500);
    return () => clearInterval(interval);
  }, [syncNow]);

  // 60 FPS requestAnimationFrame epoch playhead ticker
  useEffect(() => {
    let animId: number;

    const tick = () => {
      const nowSec = Date.now() / 1000;
      const currentPos = calculatePlayhead(state, nowSec);
      setPlayhead(currentPos);

      // If host is active, playing, and track has naturally reached end, advance automatically
      if (isHost && state.status === 'playing' && state.currentTrack && state.currentTrack.duration > 0) {
        if (currentPos >= state.currentTrack.duration && !isAdvancingRef.current) {
          isAdvancingRef.current = true;
          skipTrack().then(() => {
            syncNow().then(() => {
              isAdvancingRef.current = false;
            });
          });
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [state, isHost, syncNow]);

  return {
    state,
    setState,
    playlist,
    setPlaylist,
    playhead,
    isSyncing,
    lastSyncTime,
    syncNow,
  };
}
