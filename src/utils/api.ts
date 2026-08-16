import { SyncResponse, TrackItem, PlaybackState, HostAuthResponse } from '../types';

let currentHostToken: string | null =
  localStorage.getItem('crowd_q_host_token') || localStorage.getItem('crowdcue_host_token');

export function setStoredHostToken(token: string | null) {
  currentHostToken = token;
  if (token) {
    localStorage.setItem('crowd_q_host_token', token);
  } else {
    localStorage.removeItem('crowd_q_host_token');
    localStorage.removeItem('crowdcue_host_token');
  }
}

export function getStoredHostToken(): string | null {
  return (
    currentHostToken ||
    localStorage.getItem('crowd_q_host_token') ||
    localStorage.getItem('crowdcue_host_token')
  );
}

export async function fetchSyncState(): Promise<SyncResponse | null> {
  try {
    const res = await fetch('/api/sync.php', {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    if (res.status === 304) {
      return null; // Not modified
    }
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Sync failed:', err);
  }
  return null;
}

export async function authenticateHost(password: string): Promise<HostAuthResponse> {
  try {
    const res = await fetch('/api/auth.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      setStoredHostToken(data.token);
    }
    return data;
  } catch (err) {
    return { success: false, error: 'Network error during authentication' };
  }
}

export async function updatePlaybackState(
  payload: Partial<PlaybackState>
): Promise<{ success: boolean; state?: PlaybackState; error?: string }> {
  const token = getStoredHostToken();
  if (!token) {
    return { success: false, error: 'Host credentials missing' };
  }

  try {
    const res = await fetch('/api/state.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: 'Failed to update state' };
  }
}

export async function addSongToQueue(trackData: {
  id: string;
  url?: string;
  title: string;
  author: string;
  thumbnail?: string;
  duration?: number;
  addedBy?: string;
  playImmediately?: boolean;
}): Promise<{ success: boolean; track?: TrackItem; error?: string }> {
  const token = getStoredHostToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch('/api/queue.php', {
      method: 'POST',
      headers,
      body: JSON.stringify(trackData),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: 'Failed to add song to queue' };
  }
}

export async function removeSongFromQueue(uid: string): Promise<{ success: boolean; error?: string }> {
  const token = getStoredHostToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`/api/queue.php?uid=${encodeURIComponent(uid)}`, {
      method: 'DELETE',
      headers,
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: 'Failed to delete song' };
  }
}

export async function skipTrack(): Promise<{ success: boolean; state?: PlaybackState; error?: string }> {
  const token = getStoredHostToken();
  if (!token) {
    return { success: false, error: 'Host credentials missing' };
  }

  try {
    const res = await fetch('/api/skip.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: 'Failed to skip track' };
  }
}

export async function reorderQueue(queue: TrackItem[]): Promise<{ success: boolean; error?: string }> {
  const token = getStoredHostToken();
  if (!token) {
    return { success: false, error: 'Host credentials missing' };
  }

  try {
    const res = await fetch('/api/queue.php', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ queue }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: 'Failed to reorder queue' };
  }
}
