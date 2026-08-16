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

let lastSyncETag: string | null = null;

export type SyncFetchResult =
  | { notModified: true }
  | { notModified: false; data: SyncResponse }
  | null;

export async function fetchSyncState(): Promise<SyncFetchResult> {
  try {
    const headers: Record<string, string> = {
      'Cache-Control': 'no-cache',
    };
    if (lastSyncETag) {
      headers['If-None-Match'] = lastSyncETag;
    }

    const res = await fetch('/api/sync', { headers });

    if (res.status === 304) {
      return { notModified: true };
    }

    const etagHeader = res.headers.get('ETag');
    if (etagHeader) {
      lastSyncETag = etagHeader;
    }

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.warn('Sync endpoint returned non-JSON response');
        return null;
      }
      const data: SyncResponse = await res.json();
      return { notModified: false, data };
    }
  } catch (err) {
    console.warn('Sync poll check:', err);
  }
  return null;
}

export async function authenticateHost(password: string): Promise<HostAuthResponse> {
  try {
    const res = await fetch('/api/auth', {
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
    const res = await fetch('/api/state', {
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
    const res = await fetch('/api/queue', {
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
    const res = await fetch(`/api/queue?uid=${encodeURIComponent(uid)}`, {
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
    const res = await fetch('/api/skip', {
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
    const res = await fetch('/api/queue', {
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
