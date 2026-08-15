import React, { useState } from 'react';
import { Plus, RefreshCw, Clipboard, X, Loader2 } from 'lucide-react';

export function AddSongForm({ onAddSong, onRefresh, isRefreshing }) {
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!url.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const success = await onAddSong(url.trim());
    setIsSubmitting(false);

    if (success) {
      setUrl('');
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
      }
    } catch {
      // Clipboard permissions denied
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-6">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
        {/* Input Wrapper */}
        <div className="relative flex-1 group">
          <input
            type="text"
            id="youtube-url-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube or YouTube Music URL..."
            className="w-full bg-zinc-900/90 text-zinc-100 placeholder-zinc-500 text-sm sm:text-base px-4 py-3.5 pr-20 rounded-xl border border-zinc-800 focus:border-amber-500/80 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all duration-200 shadow-inner"
            disabled={isSubmitting}
          />

          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {url ? (
              <button
                type="button"
                onClick={() => setUrl('')}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              navigator.clipboard && (
                <button
                  type="button"
                  onClick={handlePaste}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/80 px-2 py-1 rounded-md transition-colors"
                  title="Paste from clipboard"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Paste</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!url.trim() || isSubmitting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-zinc-950 font-semibold px-5 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/10 cursor-pointer disabled:cursor-not-allowed text-sm sm:text-base whitespace-nowrap active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                <span>Adding...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add to Queue</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 px-4 py-3.5 rounded-xl transition-all text-sm font-medium cursor-pointer active:scale-[0.98]"
            title="Refresh queue"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden md:inline">Refresh</span>
          </button>
        </div>
      </form>
    </div>
  );
}
