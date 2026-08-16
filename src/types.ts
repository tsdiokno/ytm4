export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'buffering' | 'ended';

export interface TrackItem {
  id: string; // YouTube video ID
  url: string;
  title: string;
  author: string;
  thumbnail: string;
  duration: number; // in seconds
  addedBy: string;
  addedAt: number;
  uid: string; // unique item identifier
}

export interface PlaybackState {
  status: PlaybackStatus;
  currentTrack: TrackItem | null;
  referenceTime: number; // in seconds
  epochTimestamp: number; // in seconds (float or int)
  playbackRate: number;
  version: number;
  updatedAt: number;
}

export interface PlaylistData {
  queue: TrackItem[];
  history: TrackItem[];
  settings: {
    roomName: string;
    allowGuestDelete?: boolean;
    maxQueueSize?: number;
  };
}

export interface SyncResponse {
  serverTime: number;
  state: PlaybackState;
  playlist: PlaylistData;
}

export interface HostAuthResponse {
  success: boolean;
  token?: string;
  error?: string;
  message?: string;
}
