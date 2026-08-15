import React from 'react';
import { ExternalLink, Trash2, Volume2, Music2 } from 'lucide-react';

export function QueueItem({ item, index, isCurrent, isHost, onRemove }) {
  const thumbnailUrl = item.videoId
    ? `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`
    : null;

  return (
    <div
      className={`group relative flex items-center gap-3.5 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-all duration-200 ${
        isCurrent
          ? 'bg-zinc-900/90 border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
          : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800/80 hover:border-zinc-700/80'
      }`}
    >
      {/* Position / Now Playing indicator */}
      <div className="flex flex-col items-center justify-center min-w-[28px]">
        {isCurrent ? (
          <div className="flex items-center gap-0.5" title="Now Playing">
            <span className="w-1 h-3.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1 h-5 bg-amber-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1 h-3 bg-amber-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        ) : (
          <span className="text-xs font-semibold text-zinc-500 group-hover:text-zinc-300 transition-colors">
            #{index + 1}
          </span>
        )}
      </div>

      {/* Thumbnail */}
      <div className="relative w-20 sm:w-28 aspect-video rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 shadow-md">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={item.title || 'YouTube Thumbnail'}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.src = `https://img.youtube.com/vi/${item.videoId}/0.jpg`;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
            <Music2 className="w-6 h-6" />
          </div>
        )}

        {isCurrent && (
          <div className="absolute inset-0 bg-amber-500/10 mix-blend-overlay" />
        )}
      </div>

      {/* Track Details */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-2 mb-1">
          {isCurrent && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950">
              <Volume2 className="w-3 h-3" /> Now Playing
            </span>
          )}
        </div>

        <h3 className="text-sm sm:text-base font-medium text-zinc-100 truncate leading-snug">
          {item.title || 'YouTube Track'}
        </h3>

        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-amber-400 transition-colors truncate max-w-full mt-0.5 group/link"
        >
          <span className="truncate">{item.url}</span>
          <ExternalLink className="w-3 h-3 opacity-60 group-hover/link:opacity-100 flex-shrink-0" />
        </a>
      </div>

      {/* Host Controls: Delete Button */}
      {isHost && (
        <button
          onClick={() => onRemove(index)}
          className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          title="Remove from queue"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
