import { useState, useEffect, useRef, useCallback } from 'react';
import { postPlaybackState, syncPlaybackPosition } from '../services/playbackApi';

export function usePlayer(onTrackEnded, notify, isHost = false) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);

  const playerRef = useRef(null);
  const currentVideoIdRef = useRef(null);
  const isPlayingRef = useRef(false);
  const pendingPlayIdRef = useRef(null);
  const onTrackEndedRef = useRef(onTrackEnded);
  const syncIntervalRef = useRef(null);

  useEffect(() => {
    onTrackEndedRef.current = onTrackEnded;
  }, [onTrackEnded]);

  // Helper to push state to server if host
  const broadcastPlaybackState = useCallback((playing, vid, elapsedMs = 0) => {
    if (!isHost) return;
    const currentVid = vid || currentVideoIdRef.current;
    postPlaybackState({
      currentVideoId: currentVid,
      isPlaying: playing,
      elapsedMs: Math.round(elapsedMs),
    }).catch((err) => console.warn('Failed to broadcast playback state:', err));
  }, [isHost]);

  // Inject YouTube IFrame API script
  useEffect(() => {
    if (document.getElementById('yt-iframe-api')) return;
    const tag = document.createElement('script');
    tag.id = 'yt-iframe-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }, []);

  // Periodic position sync every 3s while host is playing
  useEffect(() => {
    if (isHost && isPlaying && isReady) {
      syncIntervalRef.current = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          try {
            const seconds = playerRef.current.getCurrentTime() || 0;
            syncPlaybackPosition(Math.round(seconds * 1000));
          } catch (e) {
            console.warn(e);
          }
        }
      }, 3000);
    } else {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    }

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [isHost, isPlaying, isReady]);

  // Create YT.Player instance
  const createPlayer = useCallback((containerId) => {
    if (playerRef.current) return;

    playerRef.current = new window.YT.Player(containerId, {
      height: '100%',
      width: '100%',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        iv_load_policy: 3,
        playsinline: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          setIsReady(true);
          if (pendingPlayIdRef.current) {
            const vid = pendingPlayIdRef.current;
            pendingPlayIdRef.current = null;
            currentVideoIdRef.current = vid;
            setCurrentVideoId(vid);
            playerRef.current.loadVideoById(vid);
            setIsPlaying(true);
            isPlayingRef.current = true;
            broadcastPlaybackState(true, vid, 0);
          }
        },
        onStateChange: (event) => {
          const { PlayerState } = window.YT;
          const currentTime = playerRef.current?.getCurrentTime ? playerRef.current.getCurrentTime() * 1000 : 0;

          if (event.data === PlayerState.PLAYING) {
            setIsPlaying(true);
            isPlayingRef.current = true;
            broadcastPlaybackState(true, currentVideoIdRef.current, currentTime);
          } else if (event.data === PlayerState.PAUSED) {
            setIsPlaying(false);
            isPlayingRef.current = false;
            broadcastPlaybackState(false, currentVideoIdRef.current, currentTime);
          } else if (event.data === PlayerState.ENDED) {
            setIsPlaying(false);
            isPlayingRef.current = false;
            broadcastPlaybackState(false, currentVideoIdRef.current, 0);
            onTrackEndedRef.current?.();
          }
        },
        onError: (event) => {
          if (event.data === 101 || event.data === 150) {
            notify?.('This video cannot be embedded. Skipping...', 'warning');
            setTimeout(() => onTrackEndedRef.current?.(), 1500);
          }
        },
      },
    });
  }, [notify, broadcastPlaybackState]);

  const initPlayer = useCallback((containerId) => {
    if (window.YT && typeof window.YT.Player === 'function') {
      createPlayer(containerId);
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === 'function') prev();
        createPlayer(containerId);
      };
    }
  }, [createPlayer]);

  const loadAndPlay = useCallback((videoId, force = false) => {
    if (!videoId) return;

    if (!force && currentVideoIdRef.current === videoId && isPlayingRef.current) return;

    currentVideoIdRef.current = videoId;
    setCurrentVideoId(videoId);

    if (!playerRef.current || !isReady) {
      pendingPlayIdRef.current = videoId;
      return;
    }

    try {
      playerRef.current.loadVideoById(videoId);
      setIsPlaying(true);
      isPlayingRef.current = true;
      broadcastPlaybackState(true, videoId, 0);
    } catch (err) {
      console.error('[usePlayer] loadAndPlay error:', err);
    }
  }, [isReady, broadcastPlaybackState]);

  const togglePlayPause = useCallback((fallbackVideoId) => {
    const vid = currentVideoIdRef.current || fallbackVideoId;

    if (!playerRef.current || !isReady) {
      if (vid) {
        pendingPlayIdRef.current = vid;
        currentVideoIdRef.current = vid;
        setCurrentVideoId(vid);
      } else {
        notify?.('Queue is empty. Add a song first!', 'info');
      }
      return;
    }

    try {
      const state = playerRef.current.getPlayerState();
      const currentTime = playerRef.current.getCurrentTime ? playerRef.current.getCurrentTime() * 1000 : 0;

      if (state === 1 || state === 3) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
        isPlayingRef.current = false;
        broadcastPlaybackState(false, vid, currentTime);
      } else if (state === 2) {
        playerRef.current.playVideo();
        setIsPlaying(true);
        isPlayingRef.current = true;
        broadcastPlaybackState(true, vid, currentTime);
      } else {
        if (vid) {
          playerRef.current.loadVideoById(vid);
          currentVideoIdRef.current = vid;
          setCurrentVideoId(vid);
          setIsPlaying(true);
          isPlayingRef.current = true;
          broadcastPlaybackState(true, vid, 0);
        } else {
          notify?.('Queue is empty. Add a song first!', 'info');
        }
      }
    } catch (err) {
      console.error('[usePlayer] togglePlayPause error:', err);
    }
  }, [isReady, notify, broadcastPlaybackState]);

  const stopPlayback = useCallback(() => {
    if (!playerRef.current || !isReady) return;
    try {
      playerRef.current.pauseVideo();
      playerRef.current.seekTo(0, true);
      setIsPlaying(false);
      isPlayingRef.current = false;
      broadcastPlaybackState(false, currentVideoIdRef.current, 0);
      notify?.('Stopped and rewound to 0:00', 'info');
    } catch (err) {
      console.error('[usePlayer] stopPlayback error:', err);
    }
  }, [isReady, notify, broadcastPlaybackState]);

  const clearPlayback = useCallback(() => {
    currentVideoIdRef.current = null;
    pendingPlayIdRef.current = null;
    setCurrentVideoId(null);
    setIsPlaying(false);
    isPlayingRef.current = false;
    broadcastPlaybackState(false, null, 0);
    try {
      if (playerRef.current && isReady) {
        playerRef.current.stopVideo();
      }
    } catch (err) {
      console.error('[usePlayer] clearPlayback error:', err);
    }
  }, [isReady, broadcastPlaybackState]);

  return {
    isReady,
    isPlaying,
    currentVideoId,
    currentVideoIdRef,
    initPlayer,
    loadAndPlay,
    togglePlayPause,
    stopPlayback,
    clearPlayback,
  };
}
