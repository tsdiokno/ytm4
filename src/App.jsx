import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { AddSongForm } from './components/AddSongForm';
import { QueueList } from './components/QueueList';
import { Player } from './components/Player';
import { HostControls } from './components/HostControls';
import { HostAuthModal } from './components/HostAuthModal';
import { Toast } from './components/Toast';
import { Footer } from './components/Footer';
import { useQueue } from './hooks/useQueue';
import { usePlayer } from './hooks/usePlayer';
import { useHostAuth } from './hooks/useHostAuth';

export function App() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ─── Queue ───────────────────────────────────────────────────────────────────
  const {
    queue,
    isRefreshing,
    config,
    loadQueue,
    addSong: addSongToQueueState,
    removeSong,
    nextTrack,
    clearAll,
    latestQueueRef,       // ref that always holds the freshest queue without closure staleness
  } = useQueue(addToast);

  // ─── Host auth ───────────────────────────────────────────────────────────────
  const {
    isHost,
    isModalOpen,
    openAuthModal,
    closeAuthModal,
    loginAsHost,
    logoutHost,
  } = useHostAuth(addToast);

  // ─── Player ──────────────────────────────────────────────────────────────────
  // Forward-reference trick: advanceAndPlayNext is passed into usePlayer as a
  // callback. It references `playerRef` (from usePlayer) via a ref to avoid
  // a circular dependency and stale closures.
  const advanceCallbackRef = useRef(null);

  const player = usePlayer((videoId) => {
    // Called by usePlayer when onTrackEnded fires — run the latest advance fn
    advanceCallbackRef.current?.();
  }, addToast);

  advanceCallbackRef.current = useCallback(async () => {
    const updatedQueue = await nextTrack();
    if (updatedQueue.length > 0 && updatedQueue[0]?.videoId) {
      player.loadAndPlay(updatedQueue[0].videoId, true);
    } else {
      player.clearPlayback();
    }
  }, [nextTrack, player.loadAndPlay, player.clearPlayback]);

  // ─── Autoplay when host first becomes ready with a non-empty queue ────────────
  // This effect ONLY fires when isReady transitions true. It does NOT watch queue.
  const autoplayTriggeredRef = useRef(false);
  useEffect(() => {
    if (!isHost || !player.isReady || autoplayTriggeredRef.current) return;
    const q = latestQueueRef.current;
    if (q.length > 0 && q[0].videoId && !player.currentVideoIdRef.current) {
      autoplayTriggeredRef.current = true;
      player.loadAndPlay(q[0].videoId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, player.isReady]);   // ← queue is intentionally NOT here

  // ─── Add song ────────────────────────────────────────────────────────────────
  const handleAddSong = async (url) => {
    // Snapshot BEFORE the async call so we know if the queue was empty going in
    const wasEmpty = latestQueueRef.current.length === 0;
    const success = await addSongToQueueState(url);

    if (success && wasEmpty && isHost && player.isReady && !player.currentVideoIdRef.current) {
      // Queue was empty; a new track is now at index 0 — start playing it.
      // latestQueueRef is updated synchronously inside addSongToQueueState.
      const q = latestQueueRef.current;
      if (q.length > 0 && q[0].videoId) {
        player.loadAndPlay(q[0].videoId, true);
        autoplayTriggeredRef.current = true;
      }
    }
    return success;
  };

  // ─── Advance + play next (used by host Next button) ──────────────────────────
  const handleNext = useCallback(async () => {
    const updatedQueue = await nextTrack();
    if (updatedQueue.length > 0 && updatedQueue[0]?.videoId) {
      player.loadAndPlay(updatedQueue[0].videoId, true);
    } else {
      player.clearPlayback();
    }
  }, [nextTrack, player.loadAndPlay, player.clearPlayback]);

  // ─── Clear queue ─────────────────────────────────────────────────────────────
  const handleClearQueue = async () => {
    await clearAll();
    player.clearPlayback();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-amber-500 selection:text-zinc-950">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-amber-500/10 blur-[140px] rounded-full" />
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6">
        <Header isHost={isHost} onOpenAuth={openAuthModal} onLogoutHost={logoutHost} />
        <Player isHost={isHost} onInitPlayer={player.initPlayer} />
        <AddSongForm
          onAddSong={handleAddSong}
          onRefresh={() => loadQueue(true)}
          isRefreshing={isRefreshing}
        />
        <QueueList queue={queue} isHost={isHost} onRemove={removeSong} config={config} />
        <Footer />
      </div>

      <HostControls
        isHost={isHost}
        isPlaying={player.isPlaying}
        onTogglePlayPause={() => player.togglePlayPause(latestQueueRef.current[0]?.videoId)}
        onStop={player.stopPlayback}
        onNext={handleNext}
        onClearQueue={handleClearQueue}
        queueLength={queue.length}
      />

      <HostAuthModal isOpen={isModalOpen} onClose={closeAuthModal} onLogin={loginAsHost} />
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
