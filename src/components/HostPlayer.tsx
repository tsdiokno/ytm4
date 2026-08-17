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
  onSyncNeeded?: () => void;
}

const HostPlayerComponent: React.FC<HostPlayerProps> = ({ state }) => {
  console.log('%c[RENDER] HostPlayer', 'color: #3b82f6; font-weight: bold;', {
    trackId: state.currentTrack?.id,
    status: state.status,
    version: state.version,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const isPlayerReadyRef = useRef<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(85);
  const currentLoadedVideoIdRef = useRef<string | null>(null);
  const lastSyncedVersionRef = useRef<number>(-1);
  const lastSyncedStatusRef = useRef<string>('');

  // Initialize YouTube Iframe API
  useEffect(() => {
    console.log('%c[PLAYER-LIFECYCLE] HostPlayer useEffect mount', 'color: #8b5cf6;');
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      console.log('%c[PLAYER] initPlayer called', 'color: #ec4899; font-weight: bold;', {
        containerExists: !!containerRef.current,
        alreadyHasPlayer: !!playerRef.current,
      });
      if (!containerRef.current || playerRef.current) return;

      // Create an unmanaged DOM slot so React Virtual DOM never touches or replaces the <iframe>
      containerRef.current.innerHTML = '';
      const iframeSlot = document.createElement('div');
      iframeSlot.id = 'yt-unmanaged-slot';
      containerRef.current.appendChild(iframeSlot);

      playerRef.current = new window.YT.Player(iframeSlot, {
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
            console.log('%c[PLAYER] onReady fired', 'color: #10b981; font-weight: bold;');
            isPlayerReadyRef.current = true;
            event.target.setVolume(85);
            currentLoadedVideoIdRef.current = state.currentTrack?.id || null;
            lastSyncedVersionRef.current = state.version || 0;
            lastSyncedStatusRef.current = state.status;
          },
          onStateChange: (event: any) => {
            const states: Record<number, string> = {
              '-1': 'UNSTARTED',
              0: 'ENDED',
              1: 'PLAYING',
              2: 'PAUSED',
              3: 'BUFFERING',
              5: 'CUED',
            };
            console.log('%c[PLAYER] onStateChange:', 'color: #06b6d4;', states[event.data] || event.data);
            // If the video naturally ends, advance queue via state JSON on server
            if (event.data === window.YT.PlayerState.ENDED) {
              skipTrack().catch((e) => console.error('Error skipping track on ended:', e));
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
    console.log('%c[PLAYER-RECONCILER] Effect evaluated', 'color: #f59e0b; font-weight: bold;', {
      isPlayerReady: isPlayerReadyRef.current,
      targetTrackId: state.currentTrack?.id,
      currentLoadedVideoId: currentLoadedVideoIdRef.current,
      targetStatus: state.status,
      lastSyncedStatus: lastSyncedStatusRef.current,
      version: state.version,
      lastSyncedVersion: lastSyncedVersionRef.current,
    });

    if (!isPlayerReadyRef.current || !playerRef.current) return;

    const player = playerRef.current;
    const targetTrackId = state.currentTrack?.id || null;
    const targetStatus = state.status;
    const targetTime = calculatePlayhead(state);
    const version = state.version || 0;

    try {
      // 1. Reconcile Track / Video ID (Identity Gate)
      if (targetTrackId !== currentLoadedVideoIdRef.current) {
        console.warn('[PLAYER-RECONCILER] Action: Track ID Changed ->', targetTrackId);
        currentLoadedVideoIdRef.current = targetTrackId;
        lastSyncedVersionRef.current = version;
        lastSyncedStatusRef.current = targetStatus;

        if (targetTrackId) {
          if (targetStatus === 'playing') {
            console.warn('[PLAYER-RECONCILER] Action: loadVideoById()');
            player.loadVideoById({
              videoId: targetTrackId,
              startSeconds: Math.floor(targetTime),
            });
          } else {
            console.warn('[PLAYER-RECONCILER] Action: cueVideoById()');
            player.cueVideoById({
              videoId: targetTrackId,
              startSeconds: Math.floor(targetTime),
            });
          }
        } else {
          if (player.stopVideo) {
            console.warn('[PLAYER-RECONCILER] Action: stopVideo()');
            player.stopVideo();
          }
        }
        return;
      }

      // If no track exists, stop player
      if (!targetTrackId) {
        if (player.stopVideo) {
          player.stopVideo();
        }
        return;
      }

      // 2. Reconcile Playback Status (Playing vs Paused/Idle)
      if (targetStatus !== lastSyncedStatusRef.current) {
        console.warn('[PLAYER-RECONCILER] Action: Playback Status Changed ->', targetStatus);
        lastSyncedStatusRef.current = targetStatus;
        const ytState = player.getPlayerState ? player.getPlayerState() : null;
        const isYtPlaying = ytState === 1; // 1 = YT.PlayerState.PLAYING

        if (targetStatus === 'playing' && !isYtPlaying) {
          console.warn('[PLAYER-RECONCILER] Action: playVideo()');
          player.playVideo();
        } else if ((targetStatus === 'paused' || targetStatus === 'idle') && isYtPlaying) {
          console.warn('[PLAYER-RECONCILER] Action: pauseVideo()');
          player.pauseVideo();
        }
      }

      // 3. Reconcile Explicit Seek Command (Triggered strictly when host state version changes)
      if (version !== lastSyncedVersionRef.current) {
        console.warn('[PLAYER-RECONCILER] Action: Version Changed (Seek Check) ->', version);
        lastSyncedVersionRef.current = version;
        if (player.getCurrentTime && player.seekTo) {
          const actualPlayerTime = player.getCurrentTime();
          const drift = Math.abs(targetTime - actualPlayerTime);
          if (drift > 1.5) {
            console.warn('[PLAYER-RECONCILER] Action: seekTo() drift was', drift);
            player.seekTo(targetTime, true);
          }
        }
      }
    } catch (err) {
      console.warn('Reconciler command error:', err);
    }
  }, [state.currentTrack?.id, state.status, state.version]);

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
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl isolate [transform:translateZ(0)]">
      {/* Header Bar */}
      <div className="px-5 py-3 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span className="text-xs font-semibold tracking-wide uppercase text-orange-400">
            Host Audio Engine
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-300 font-mono border border-neutral-800">
            State-Driven Player
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
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden [transform:translateZ(0)]">
        {/* The Stripped YouTube Iframe Target Container (Unmanaged slot) */}
        <div className="w-full h-full" ref={containerRef} />

        {/* Pointer-Event Blocking Overlay Shield */}
        <div
          className="absolute inset-0 z-20 cursor-default select-none pointer-events-auto flex flex-col items-center justify-between p-4 bg-gradient-to-t from-black/80 via-transparent to-black/40"
          title="Direct click disabled: Player strictly commanded by JSON State Machine"
        >
          <div className="w-full flex justify-between items-start">
            <div className="bg-neutral-950/90 backdrop-blur border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-300 flex items-center space-x-2">
              <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
              <span>State JSON authoritative</span>
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

          <div />
        </div>
      </div>
    </div>
  );
};

export const HostPlayer = React.memo(HostPlayerComponent, (prevProps, nextProps) => {
  return (
    prevProps.state.currentTrack?.id === nextProps.state.currentTrack?.id &&
    prevProps.state.status === nextProps.state.status &&
    prevProps.state.version === nextProps.state.version
  );
});
