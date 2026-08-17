import { PlaybackState } from '../types';

/**
 * Calculates inferred playhead in seconds using epoch mathematics.
 * Zero-API, drift-free, 60fps calculation.
 */
export function calculatePlayhead(state: PlaybackState | null, clientNowSec: number = Date.now() / 1000): number {
  if (!state || !state.currentTrack) {
    return 0;
  }

  const duration = state.currentTrack.duration || 180;
  const refTime = state.referenceTime || 0;

  if (state.status === 'playing') {
    const elapsed = Math.max(0, clientNowSec - state.epochTimestamp);
    const rate = state.playbackRate || 1.0;
    const inferred = refTime + elapsed * rate;
    return Math.min(duration, Math.max(0, inferred));
  }

  // If paused or buffering, playhead remains anchored at referenceTime
  return Math.min(duration, Math.max(0, refTime));
}

/**
 * Checks if the track has naturally elapsed based on epoch inference
 */
export function isTrackFinished(state: PlaybackState | null, clientNowSec: number = Date.now() / 1000): boolean {
  if (!state || !state.currentTrack || state.status !== 'playing') {
    return false;
  }
  const playhead = calculatePlayhead(state, clientNowSec);
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