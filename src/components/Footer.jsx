import React from 'react';
import { Heart, Music } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full max-w-3xl mx-auto mt-12 mb-20 text-center px-4">
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-6 text-xs text-zinc-500 space-y-3 backdrop-blur-sm">
        <p className="font-semibold text-zinc-400 flex items-center justify-center gap-1">
          Made by <strong className="text-zinc-300">Timothy</strong>
        </p>
        <p className="leading-relaxed">
          Inspired by Spotify's <em>Jam</em> feature — a collaborative queue for YouTube music. It allows everyone in the room to contribute songs to one shared queue while centralized playback remains controlled by the host device.
        </p>
        <p className="leading-relaxed text-zinc-600">
          The queue automatically updates in real-time, or you can refresh on-demand. Designed specifically for same-room group listening sessions with centralized sound systems.
        </p>
      </div>
    </footer>
  );
}
