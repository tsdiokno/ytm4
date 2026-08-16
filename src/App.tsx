import React, { useState, useEffect } from 'react';
import { useSyncState } from './hooks/useSyncState';
import { getStoredHostToken } from './utils/api';
import { Header } from './components/Header';
import { NowPlaying } from './components/NowPlaying';
import { HostPlayer } from './components/HostPlayer';
import { HostControls } from './components/HostControls';
import { AddSongDrawer } from './components/AddSongDrawer';
import { QueueList } from './components/QueueList';
import { HostModal } from './components/HostModal';
import { PhpDeploymentModal } from './components/PhpDeploymentModal';
import { Shield, Sparkles, Radio, Users, Cpu } from 'lucide-react';

export default function App() {
  const [isHost, setIsHost] = useState<boolean>(() => Boolean(getStoredHostToken()));
  const [isHostModalOpen, setIsHostModalOpen] = useState<boolean>(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);

  const {
    state,
    playlist,
    playhead,
    isSyncing,
    syncNow,
  } = useSyncState(isHost);

  useEffect(() => {
    setIsHost(Boolean(getStoredHostToken()));
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-orange-500 selection:text-black">
      {/* Top Navbar */}
      <Header
        isHost={isHost}
        isSyncing={isSyncing}
        roomName={playlist.settings?.roomName || 'Crowd-Q Lounge'}
        onOpenHostModal={() => setIsHostModalOpen(true)}
        onOpenDeployModal={() => setIsDeployModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Role Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800/80 backdrop-blur">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-xl ${
                isHost
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                  : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
              }`}
            >
              {isHost ? <Shield className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-200">
                {isHost ? 'Active Session Host' : 'Guest Endpoint Mode'}
              </h2>
              <p className="text-xs text-neutral-400">
                {isHost
                  ? 'You control master playback audio. The stripped YouTube iframe executes commands from state.json.'
                  : 'Playback audio is driven remotely by the Host. Your playhead syncs via high-resolution Epoch calculations.'}
              </p>
            </div>
          </div>

          {!isHost && (
            <button
              id="banner-unlock-host-btn"
              type="button"
              onClick={() => setIsHostModalOpen(true)}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-orange-400 border border-neutral-800 hover:border-orange-500/40 transition-colors whitespace-nowrap"
            >
              Unlock Host Controls
            </button>
          )}
        </div>

        {/* Primary Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Now Playing & Host Video Engine */}
          <div className="lg:col-span-7 space-y-8">
            {/* Unified Now Playing Card */}
            <NowPlaying state={state} playhead={playhead} isHost={isHost} />

            {/* Host-Exclusive Audio Engine & Master Controls */}
            {isHost ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                <HostPlayer state={state} onSyncNeeded={syncNow} />
                <HostControls state={state} playhead={playhead} onSyncNeeded={syncNow} />
              </div>
            ) : (
              <div className="p-6 rounded-3xl bg-neutral-900/50 border border-neutral-800/70 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  <Cpu className="w-4 h-4 text-orange-500" />
                  <span>Epoch-Based Client Inference Active</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  To prevent duplicate audio streams across multiple clients, the YouTube audio engine is invoked exclusively on the authenticated Host's browser. Guest browsers render fluid 60 FPS playhead progress and queue states by computing mathematical derivatives against the shared <code className="text-orange-400 font-mono bg-black px-1.5 py-0.5 rounded border border-neutral-800">state.json</code> epoch vector.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Add Song Drawer & Live Queue */}
          <div className="lg:col-span-5 space-y-8">
            {/* Song Submitter Drawer */}
            <AddSongDrawer isHost={isHost} onSongAdded={syncNow} />

            {/* Live Queue Explorer */}
            <QueueList
              playlist={playlist}
              isHost={isHost}
              onQueueUpdated={syncNow}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 py-6 text-center text-xs text-neutral-400 space-y-2">
        <p>Crowd-Q • Synchronized YouTube Jukebox with PHP/JSON State Engine</p>
        <p className="font-mono text-neutral-400">
          Drop-in PHP/Apache Architecture • Epoch-Inferred Playhead Placement
        </p>
      </footer>

      {/* Modals */}
      <HostModal
        isOpen={isHostModalOpen}
        onClose={() => setIsHostModalOpen(false)}
        isHost={isHost}
        onHostStatusChanged={(status) => setIsHost(status)}
      />

      <PhpDeploymentModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
      />
    </div>
  );
}
