import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchState, addSongToQueue, removeSongFromQueue, advanceNextSong, clearQueue, fetchConfig } from '../services/api';
import { extractVideoId, fetchVideoTitles } from '../services/youtube';

/**
 * Returns true when two queue arrays have identical videoId sequences.
 */
function queuesAreEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].videoId !== b[i].videoId) return false;
  }
  return true;
}

/**
 * Returns true when two playback state objects are effectively equal.
 */
function playbackIsEqual(a, b) {
  if (!a || !b) return a === b;
  return (
    a.currentVideoId === b.currentVideoId &&
    a.isPlaying === b.isPlaying &&
    a.elapsedMs === b.elapsedMs &&
    a.updatedAt === b.updatedAt
  );
}

export function useQueue(notify) {
  const [queue, setQueue] = useState([]);
  const [playback, setPlayback] = useState({
    currentVideoId: null,
    isPlaying: false,
    elapsedMs: 0,
    updatedAt: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [config, setConfig] = useState({ hasApiKey: false, youtube_api_key: null });

  const pollingRef = useRef(null);
  const latestQueueRef = useRef([]);
  const latestPlaybackRef = useRef(playback);

  const updateQueue = useCallback((newQueue) => {
    latestQueueRef.current = newQueue;
    setQueue((prev) => {
      if (queuesAreEqual(prev, newQueue)) return prev;
      return newQueue;
    });
  }, []);

  const updatePlayback = useCallback((newPlayback) => {
    if (!newPlayback) return;
    latestPlaybackRef.current = newPlayback;
    setPlayback((prev) => {
      if (playbackIsEqual(prev, newPlayback)) return prev;
      return newPlayback;
    });
  }, []);

  // Load configuration once on mount
  useEffect(() => {
    fetchConfig().then((cfg) => setConfig(cfg));
  }, []);

  // Enrich queue items with titles if missing
  const enrichTitles = useCallback(async (rawQueue, apiKey) => {
    if (!Array.isArray(rawQueue) || rawQueue.length === 0) return rawQueue;

    const uncachedVideoIds = rawQueue
      .filter((item) => !item.title && item.videoId)
      .map((item) => item.videoId);

    if (uncachedVideoIds.length === 0) return rawQueue;

    const titleMap = await fetchVideoTitles(uncachedVideoIds, apiKey);
    return rawQueue.map((item) => ({
      ...item,
      title: item.title || titleMap.get(item.videoId) || null,
    }));
  }, []);

  // Reload full state from server
  const loadQueue = useCallback(async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const stateData = await fetchState();
      const rawQueue = Array.isArray(stateData) ? stateData : (stateData.queue || []);
      const playbackData = stateData.playback || null;

      const enriched = await enrichTitles(rawQueue, config.youtube_api_key);
      updateQueue(enriched);
      if (playbackData) updatePlayback(playbackData);
    } catch (err) {
      console.error('Error fetching state:', err);
    } finally {
      setIsLoading(false);
      if (showLoading) setIsRefreshing(false);
    }
  }, [enrichTitles, config.youtube_api_key, updateQueue, updatePlayback]);

  // Initial load
  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Smart polling — paused when the browser tab is inactive
  useEffect(() => {
    const startPolling = () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') loadQueue(false);
      }, 5000);
    };

    startPolling();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadQueue(false);
        startPolling();
      } else if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadQueue]);

  // Add a song to the queue
  const addSong = async (url) => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      notify?.('Please enter a valid YouTube or YouTube Music URL', 'error');
      return false;
    }

    const isDuplicate = latestQueueRef.current.some(
      (item) => item.videoId === videoId || item.url === url.trim()
    );
    if (isDuplicate) {
      notify?.('This song is already in the queue!', 'warning');
      return false;
    }

    try {
      const titleMap = await fetchVideoTitles([videoId], config.youtube_api_key);
      const title = titleMap.get(videoId) || null;

      const songData = { url: url.trim(), videoId, title };
      const response = await addSongToQueue(songData);
      const updatedQueue = await enrichTitles(response.data || [], config.youtube_api_key);
      updateQueue(updatedQueue);
      notify?.('Song added to queue! 🎵', 'success');
      return true;
    } catch (err) {
      notify?.(err.message || 'Failed to add song', 'error');
      return false;
    }
  };

  // Remove a song by index
  const removeSong = async (index) => {
    try {
      const response = await removeSongFromQueue(index);
      const updatedQueue = await enrichTitles(response.data || [], config.youtube_api_key);
      updateQueue(updatedQueue);
      notify?.('Song removed from queue', 'info');
    } catch (err) {
      notify?.(err.message || 'Failed to remove song', 'error');
    }
  };

  // Advance to the next song
  const nextTrack = async () => {
    try {
      const response = await advanceNextSong();
      const updatedQueue = await enrichTitles(response.data || [], config.youtube_api_key);
      updateQueue(updatedQueue);
      return updatedQueue;
    } catch (err) {
      notify?.(err.message || 'Failed to advance next song', 'error');
      return latestQueueRef.current;
    }
  };

  // Clear the entire queue
  const clearAll = async () => {
    try {
      await clearQueue();
      updateQueue([]);
      notify?.('Queue has been cleared', 'info');
    } catch (err) {
      notify?.(err.message || 'Failed to clear queue', 'error');
    }
  };

  return {
    queue,
    playback,
    isLoading,
    isRefreshing,
    config,
    loadQueue,
    addSong,
    removeSong,
    nextTrack,
    clearAll,
    latestQueueRef,
    latestPlaybackRef,
  };
}
