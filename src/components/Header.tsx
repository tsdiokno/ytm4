import React from 'react';
import { Radio, Lock, Unlock, Server } from 'lucide-react';

interface HeaderProps {
  isHost: boolean;
  roomName: string;
  onOpenHostModal: () => void;
  onOpenDeployModal: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  isHost,
  roomName,
  onOpenHostModal,
  onOpenDeployModal,
}) => {
  return (
    <header className="border-b border-neutral-850 bg-neutral-950/90 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/20">
            <Radio className="w-5 h-5 text-neutral-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-extrabold text-neutral-100 text-lg tracking-tight">Crowd-Q</h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-neutral-900 text-orange-400 border border-neutral-800">
                PHP / JSON Sync
              </span>
            </div>
            <p className="text-xs text-neutral-400 hidden sm:block">
              {roomName || 'Crowd-Q Lounge'}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Sync status indicator */}
          <div
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-400 select-none"
            title="Periodic Gated Polling Sync (1.5s)"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
            </span>
            <span className="hidden md:inline">Live Epoch Sync</span>
          </div>

          {/* PHP Architecture Modal Trigger */}
          <button
            id="open-deploy-info-btn"
            type="button"
            onClick={onOpenDeployModal}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-medium flex items-center space-x-1.5 transition-colors"
            title="Inspect PHP Backend & Apache Setup"
          >
            <Server className="w-4 h-4 text-orange-500" />
            <span className="hidden sm:inline">PHP Architecture</span>
          </button>

          {/* Host Mode Toggle Button */}
          <button
            id="toggle-host-mode-btn"
            type="button"
            onClick={onOpenHostModal}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
              isHost
                ? 'bg-orange-500/15 text-orange-300 border border-orange-500/40 hover:bg-orange-500/25'
                : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            {isHost ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-orange-400" />
                <span>Host Mode (Audio On)</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-neutral-400" />
                <span>Host Mode</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
});
