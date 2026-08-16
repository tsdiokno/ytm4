import React, { useState } from 'react';
import { PlaylistData } from '../types';
import { removeSongFromQueue, reorderQueue } from '../utils/api';
import { formatDuration } from '../utils/epoch';
import { ListMusic, History, Trash2, ArrowUp, ArrowDown, Music2, User } from 'lucide-react';

interface QueueListProps {
  playlist: PlaylistData;
  isHost: boolean;
  onQueueUpdated: () => void;
}

export const QueueList: React.FC<QueueListProps> = ({ playlist, isHost, onQueueUpdated }) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const queue = playlist.queue || [];
  const history = playlist.history || [];

  const handleDelete = async (uid: string) => {
    setIsDeleting(uid);
    try {
      await removeSongFromQueue(uid);
      onQueueUpdated();
    } finally {
      setIsDeleting(null);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (!isHost) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= queue.length) return;

    const updated = [...queue];
    const item = updated.splice(index, 1)[0];
    updated.splice(targetIndex, 0, item);

    await reorderQueue(updated);
    onQueueUpdated();
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-5">
      {/* Tabs Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div className="flex space-x-2">
          <button
            id="queue-tab-btn"
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2 transition-colors ${
              activeTab === 'queue'
                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            <span>Up Next ({queue.length})</span>
          </button>

          <button
            id="history-tab-btn"
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2 transition-colors ${
              activeTab === 'history'
                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History ({history.length})</span>
          </button>
        </div>

        <span className="text-xs text-neutral-500 font-mono hidden sm:inline">
          {activeTab === 'queue' ? 'Auto-advanced by state JSON' : 'Recent playback logs'}
        </span>
      </div>

      {/* Queue View */}
      {activeTab === 'queue' && (
        <div className="space-y-3">
          {queue.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 space-y-2">
              <Music2 className="w-12 h-12 stroke-1 mx-auto text-neutral-600" />
              <p className="text-sm font-medium text-neutral-400">The queue is completely empty</p>
              <p className="text-xs text-neutral-500">Be the first to paste a YouTube link above!</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {queue.map((track, idx) => (
                <div
                  key={track.uid}
                  className="group p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800 hover:border-neutral-700 flex items-center justify-between gap-3 transition-all"
                >
                  {/* Position number & Thumbnail */}
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className="text-xs font-mono font-bold text-neutral-500 w-5 text-center group-hover:text-orange-400 transition-colors">
                      {idx + 1}
                    </span>

                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover border border-neutral-800 flex-shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-neutral-200 truncate group-hover:text-white transition-colors">
                        {track.title}
                      </h4>
                      <div className="flex items-center space-x-2 text-xs text-neutral-400 truncate mt-0.5">
                        <span className="truncate">{track.author}</span>
                        <span>•</span>
                        <span className="flex items-center space-x-1 text-[11px] text-neutral-400">
                          <User className="w-3 h-3 text-neutral-500" />
                          <span>{track.addedBy}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Duration */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="text-xs font-mono text-neutral-400 hidden sm:inline px-2 py-1 rounded bg-neutral-900 border border-neutral-800">
                      {formatDuration(track.duration)}
                    </span>

                    {/* Host Reorder arrows */}
                    {isHost && (
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-orange-400 hover:bg-neutral-800 disabled:opacity-20 transition-colors"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'down')}
                          disabled={idx === queue.length - 1}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-orange-400 hover:bg-neutral-800 disabled:opacity-20 transition-colors"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Remove button */}
                    <button
                      id={`delete-track-${track.uid}`}
                      type="button"
                      onClick={() => handleDelete(track.uid)}
                      disabled={isDeleting === track.uid}
                      className="p-2 rounded-xl text-neutral-500 hover:text-red-400 hover:bg-neutral-900 transition-colors"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History View */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="py-12 text-center text-neutral-500">
              <p className="text-sm font-medium">No played tracks in this session yet</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {history.map((track, idx) => (
                <div
                  key={`${track.uid}-${idx}`}
                  className="p-3 rounded-2xl bg-neutral-950/40 border border-neutral-850 flex items-center justify-between gap-3 opacity-75 hover:opacity-100 transition-opacity"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-xl object-cover border border-neutral-800 flex-shrink-0 grayscale group-hover:grayscale-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium text-neutral-300 truncate">{track.title}</h4>
                      <p className="text-xs text-neutral-500 truncate">{track.author} • Cued by {track.addedBy}</p>
                    </div>
                  </div>

                  <span className="text-xs font-mono text-neutral-500">
                    {formatDuration(track.duration)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
