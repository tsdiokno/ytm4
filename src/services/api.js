const API_BASE = '/api';

/**
 * Fetch the current song queue.
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
 * Fetch the current song queue.
 */
export async function fetchQueue() {
  const response = await fetch(`${API_BASE}/queue`, {
    headers: { 'Accept': 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to load queue (${response.status})`);
  }
  return response.json();
}

/**
 * Add a song to the queue.
 */
export async function addSongToQueue(song) {
  const response = await fetch(`${API_BASE}/queue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ song }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to add song to queue');
  }
  return data;
}

/**
 * Remove a song from the queue by index.
 */
export async function removeSongFromQueue(index) {
  const response = await fetch(`${API_BASE}/queue`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ index }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to remove song');
  }
  return data;
}

/**
 * Advance to the next song in the queue.
 */
export async function advanceNextSong() {
  const response = await fetch(`${API_BASE}/queue/next`, {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to advance next song');
  }
  return data;
}

/**
 * Clear the entire queue.
 */
export async function clearQueue() {
  const response = await fetch(`${API_BASE}/queue/clear`, {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to clear queue');
  }
  return data;
}

/**
 * Load server configuration.
 */
export async function fetchConfig() {
  try {
    const response = await fetch(`${API_BASE}/config`);
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('Failed to load server config:', err);
  }
  return { hasApiKey: false, youtube_api_key: null };
}
