const API_BASE = '/api';

/**
 * Fetch full state object ({ queue, playback }).
 */
export async function fetchState() {
  const response = await fetch(`${API_BASE}/state`, {
    headers: { 'Accept': 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to load state (${response.status})`);
  }
  return response.json();
}

/**
 * Post a playback event update (Host only).
 */
export async function postPlaybackState({ currentVideoId, isPlaying, elapsedMs }) {
  const response = await fetch(`${API_BASE}/playback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ currentVideoId, isPlaying, elapsedMs }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to update playback state');
  }
  return data;
}

/**
 * Post a lightweight periodic playback position sync (Host only).
 */
export async function syncPlaybackPosition(elapsedMs) {
  try {
    await fetch(`${API_BASE}/playback/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ elapsedMs }),
    });
  } catch (err) {
    console.warn('Failed to sync playback position:', err);
  }
}
