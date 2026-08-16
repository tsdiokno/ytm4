import React, { useState } from 'react';
import { extractYouTubeId, fetchYouTubeMetadata } from '../utils/youtube';
import { addSongToQueue } from '../utils/api';
import { Link2, Plus, Sparkles, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface AddSongDrawerProps {
  isHost: boolean;
  onSongAdded?: () => void;
}

export const AddSongDrawer: React.FC<AddSongDrawerProps> = ({ isHost }) => {
  const [urlInput, setUrlInput] = useState<string>('');
  const [submitterName, setSubmitterName] = useState<string>(
    () => localStorage.getItem('crowd_q_user_name') || localStorage.getItem('crowdcue_user_name') || 'Guest'
  );
  const [preview, setPreview] = useState<{
    id: string;
    title: string;
    author: string;
    thumbnail: string;
  } | null>(null);

  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrlInput(val);
    setFeedback(null);

    const videoId = extractYouTubeId(val);
    if (videoId) {
      setIsLoadingPreview(true);
      try {
        const meta = await fetchYouTubeMetadata(videoId, val);
        setPreview({
          id: videoId,
          title: meta.title,
          author: meta.author,
          thumbnail: meta.thumbnail,
        });
      } catch {
        setPreview({
          id: videoId,
          title: 'YouTube Track',
          author: 'YouTube',
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        });
      } finally {
        setIsLoadingPreview(false);
      }
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent, playImmediately: boolean = false) => {
    e.preventDefault();
    console.log('%c[EVENT] AddSong: Form Submitted', 'color: #ef4444; font-weight: bold;', {
      urlInput,
      preview,
      playImmediately,
      submitterName,
    });

    if (!preview) {
      setFeedback({ type: 'error', message: 'Please enter a valid YouTube or YouTube Music link.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    localStorage.setItem('crowd_q_user_name', submitterName);

    try {
      console.log('%c[API] POST /api/queue -> Sending request', 'color: #3b82f6;');
      const res = await addSongToQueue({
        id: preview.id,
        url: urlInput,
        title: preview.title,
        author: preview.author,
        thumbnail: preview.thumbnail,
        duration: 200, // estimated duration default, updated when host loads
        addedBy: submitterName || 'Guest',
        playImmediately,
      });
      console.log('%c[API] POST /api/queue -> Response received', 'color: #10b981; font-weight: bold;', res);

      if (res.success) {
        setFeedback({
          type: 'success',
          message: playImmediately ? 'Track sent to live playback!' : 'Song queued successfully!',
        });
        setUrlInput('');
        setPreview(null);
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to cue song' });
      }
    } catch (err) {
      console.error('[API] POST /api/queue -> Network error', err);
      setFeedback({ type: 'error', message: 'Network error adding song' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-neutral-100 text-lg">Cue a Track</h3>
            <p className="text-xs text-neutral-400">Accepts all YouTube, YouTube Music, & Shorts links</p>
          </div>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
        {/* URL Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
            YouTube / YouTube Music URL
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-neutral-500 pointer-events-none">
              <Link2 className="w-4 h-4" />
            </div>
            <input
              id="song-url-input"
              type="text"
              value={urlInput}
              onChange={handleUrlChange}
              placeholder="e.g. https://music.youtube.com/watch?v=... or https://youtu.be/..."
              className="w-full pl-10 pr-10 py-3 bg-neutral-950/80 border border-neutral-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl text-sm text-neutral-200 placeholder-neutral-500 transition-colors"
            />
            {isLoadingPreview && (
              <div className="absolute right-3.5 text-orange-400 animate-spin">
                <Loader2 className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>

        {/* Submitter Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Your Name / Handle
          </label>
          <input
            id="submitter-name-input"
            type="text"
            value={submitterName}
            onChange={(e) => setSubmitterName(e.target.value)}
            placeholder="e.g. Maya, DJ Alex, Guest 42"
            maxLength={30}
            className="w-full px-4 py-2.5 bg-neutral-950/80 border border-neutral-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl text-sm text-neutral-200 placeholder-neutral-500 transition-colors"
          />
        </div>

        {/* Instant Preview Card */}
        {preview && (
          <div className="p-3.5 rounded-2xl bg-neutral-950/90 border border-orange-500/30 flex items-center space-x-4 animate-in fade-in zoom-in-95 duration-200">
            <img
              src={preview.thumbnail}
              alt={preview.title}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-xl object-cover border border-neutral-800 flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-mono text-orange-400 font-semibold tracking-wide">
                Detected YouTube Track
              </span>
              <h4 className="text-sm font-semibold text-neutral-100 truncate">{preview.title}</h4>
              <p className="text-xs text-neutral-400 truncate">{preview.author}</p>
            </div>
          </div>
        )}

        {/* Feedback message */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
              feedback.type === 'success'
                ? 'bg-neutral-950 border border-orange-500/40 text-orange-300'
                : 'bg-neutral-950 border border-red-800 text-red-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Submit Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            id="add-to-queue-btn"
            type="submit"
            disabled={!preview || isSubmitting}
            className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:opacity-40 disabled:hover:from-orange-500 text-neutral-950 font-bold text-sm flex items-center justify-center space-x-2 transition-colors shadow-lg shadow-orange-600/20"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add to Crowd Queue</span>
              </>
            )}
          </button>

          {isHost && (
            <button
              id="host-play-now-btn"
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={!preview || isSubmitting}
              className="py-3 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 disabled:opacity-40 text-neutral-200 font-medium text-xs flex items-center space-x-1.5 transition-colors border border-neutral-800 hover:border-orange-500/40"
              title="Play this track right now and bump to history"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>Play Now (Host)</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
