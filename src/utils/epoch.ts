import { PlaybackState } from '../types';

/**
 * Returns the authoritative playhead position from the playback state.
 * Direct, deterministic, and free of client-side clock drift.
 */
export function calculatePlayhead(state: PlaybackState | null): number {
  if (!state || !state.currentTrack) {
    return 0;
  }
  const duration = state.currentTrack.duration || 180;
  if (state.status === 'playing') {
    const now = Math.floor(Date.now() / 1000);
    const elapsed = Math.max(0, now - (state.updatedAt || now));
    return Math.min(duration, (state.currentTime || 0) + elapsed);
  }
  const current = state.currentTime || 0;
  return Math.min(duration, Math.max(0, current));
}

/**
 * Checks if the track duration has elapsed
 */
export function isTrackFinished(state: PlaybackState | null): boolean {
  if (!state || !state.currentTrack || state.status !== 'playing') {
    return false;
  }
  const playhead = calculatePlayhead(state);
  const duration = state.currentTrack.duration || 180;
  return playhead >= duration - 0.5;
}

/**
 * Formats seconds into MM:SS or HH:MM:SS string
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const pad = (num: number) => num.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

