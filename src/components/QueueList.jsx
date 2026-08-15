import React from 'react';
import { QueueItem } from './QueueItem';
import { ListMusic, Sparkles, KeyRound } from 'lucide-react';

export function QueueList({ queue, isHost, onRemove, config }) {
  const hasApiKey = config?.hasApiKey;

  return (
    <div className="w-full max-w-3xl mx-auto bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 mb-8 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
            <ListMusic className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              Queue
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                {queue.length} {queue.length === 1 ? 'song' : 'songs'}
              </span>
            </h2>
          </div>
        </div>
      </div>

      {/* Warning if YouTube API key is unconfigured */}
      {!hasApiKey && (
        <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 text-amber-300/90 p-3.5 rounded-2xl mb-4 text-xs leading-relaxed">
          <KeyRound className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
          <p>
            <strong className="text-amber-400">Note:</strong> YouTube API Key is not configured. Public oEmbed fallbacks will be used to resolve track titles where possible.
          </p>
        </div>
      )}

      {/* List / Empty State */}
      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 flex items-center justify-center text-zinc-600 mb-3.5">
            <Sparkles className="w-7 h-7 text-amber-500/50" />
          </div>
          <h3 className="text-base font-semibold text-zinc-300 mb-1">Queue is empty</h3>
          <p className="text-xs sm:text-sm text-zinc-500 max-w-sm">
            Be the DJ! Paste a YouTube or YouTube Music song URL above to get the party started.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {queue.map((item, index) => (
            <QueueItem
              key={`${item.videoId}-${index}`}
              item={item}
              index={index}
              isCurrent={index === 0}
              isHost={isHost}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
