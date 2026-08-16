import React, { useEffect, useRef, useState } from 'react';
import { PlaybackState } from '../types';
import { calculatePlayhead } from '../utils/epoch';
import { skipTrack } from '../utils/api';
import { Volume2, VolumeX, ShieldAlert, Sparkles } from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface HostPlayerProps {
  state: PlaybackState;
  onSyncNeeded: () => void;
}

export const HostPlayer: React.FC<HostPlayerProps> = ({ state, onSyncNeeded }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(85);
  const currentLoadedVideoIdRef = useRef<string | null>(null);

  // Initialize YouTube Iframe API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (!containerRef.current || playerRef.current) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '100%',
        width: '100%',
        videoId: state.currentTrack?.id || '',
        playerVars: {
          controls: 0,        // Strip native controls completely
          disablekb: 1,       // Disable keyboard shortcuts
          modestbranding: 1,  // Strip branding
          rel: 0,             // No related videos
          fs: 0,              // No fullscreen button
          iv_load_policy: 3,  // No annotations
          playsinline: 1,     // Inline playback
          origin: window.location.origin,
          autoplay: 0,
        },
        events: {
          onReady: (event: any) => {
            setIsPlayerReady(true);
            event.target.setVolume(85);
            currentLoadedVideoIdRef.current = state.currentTrack?.id || null;
          },
          onStateChange: (event: any) => {
            // If the video naturally ends, advance queue via state JSON
            if (event.data === window.YT.PlayerState.ENDED) {
              skipTrack().then(() => onSyncNeeded());
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, []);

  // Logical Client Reconciler: Takes commands solely from state.json
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;

    const player = playerRef.current;
    const targetTrackId = state.currentTrack?.id || null;
    const targetStatus = state.status;
    const targetTime = calculatePlayhead(state, Date.now() / 1000);

    try {
      // 1. Reconcile Track / Video ID
      if (targetTrackId && targetTrackId !== currentLoadedVideoIdRef.current) {
        currentLoadedVideoIdRef.current = targetTrackId;
        if (targetStatus === 'playing') {
          player.loadVideoById({
            videoId: targetTrackId,
            startSeconds: Math.floor(targetTime),
          });
        } else {
          player.cueVideoById({
            videoId: targetTrackId,
            startSeconds: Math.floor(targetTime),
          });
        }
        return;
      }

      // If no track exists, stop player
      if (!targetTrackId) {
        currentLoadedVideoIdRef.current = null;
        if (player.stopVideo) {
          player.stopVideo();
        }
        return;
      }

      // 2. Reconcile Playback Status (Playing vs Paused/Idle)
      const ytState = player.getPlayerState ? player.getPlayerState() : null;
      const isYtPlaying = ytState === 1; // 1 = YT.PlayerState.PLAYING

      if (targetStatus === 'playing' && !isYtPlaying) {
        player.playVideo();
      } else if ((targetStatus === 'paused' || targetStatus === 'idle') && isYtPlaying) {
        player.pauseVideo();
      }

      // 3. Reconcile Drift / Seek Position
      if (player.getCurrentTime) {
        const actualPlayerTime = player.getCurrentTime();
        const drift = Math.abs(targetTime - actualPlayerTime);
        // Only seek if drift exceeds threshold (2.0s) to prevent jitter
        if (drift > 2.0) {
          player.seekTo(targetTime, true);
        }
      }
    } catch (err) {
      console.warn('Reconciler command error:', err);
    }
  }, [state, isPlayerReady]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(val);
      if (val === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
        playerRef.current.unMute();
      }
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume || 80);
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header Bar */}
      <div className="px-5 py-3 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-xs font-semibold tracking-wide uppercase text-orange-400">
            Host Headless Audio Engine
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-300 font-mono border border-neutral-800">
            State-Driven IFrame
          </span>
        </div>

        {/* Local Host Hardware Volume */}
        <div className="flex items-center space-x-3">
          <button
            id="host-mute-toggle"
            type="button"
            onClick={toggleMute}
            className="text-neutral-400 hover:text-orange-400 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-orange-600" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            id="host-volume-slider"
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <span className="text-xs text-neutral-400 font-mono w-7 text-right">{isMuted ? '0%' : `${volume}%`}</span>
        </div>
      </div>

      {/* Video Canvas Container with Pointer Event Shield */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        {/* The Stripped YouTube Iframe Target */}
        <div className="w-full h-full" ref={containerRef} />

        {/* Pointer-Event Blocking Overlay Shield: Prevents manual YouTube controls clicks */}
        <div
          className="absolute inset-0 z-20 cursor-default select-none pointer-events-auto flex flex-col items-center justify-between p-4 bg-gradient-to-t from-black/90 via-transparent to-black/50"
          title="Direct click disabled: Player strictly commanded by JSON State Machine"
        >
          <div className="w-full flex justify-between items-start">
            <div className="bg-neutral-950/90 backdrop-blur border border-neutral-850 rounded-lg px-3 py-1.5 text-xs text-neutral-300 flex items-center space-x-2">
              <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
              <span>Native controls stripped • State JSON authoritative</span>
            </div>
            {state.currentTrack && (
              <span className="bg-neutral-900/90 border border-orange-500/40 text-orange-400 text-xs px-2.5 py-1 rounded-md flex items-center space-x-1 font-mono">
                <Sparkles className="w-3 h-3 text-orange-400" />
                <span>Active Output</span>
              </span>
            )}
          </div>

          {!state.currentTrack && (
            <div className="text-center py-8">
              <p className="text-neutral-400 text-sm font-medium">Queue is currently empty</p>
              <p className="text-neutral-500 text-xs mt-1">Add YouTube songs below to commence synchronized playback</p>
            </div>
          )}

          <div className="w-full text-right">
            <span className="text-[10px] text-neutral-400 font-mono">
              Inferred Epoch T: {Math.floor(calculatePlayhead(state))}s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
