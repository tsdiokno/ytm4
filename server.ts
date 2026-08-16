import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

const DATA_DIR = path.resolve('data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const PLAYLIST_FILE = path.join(DATA_DIR, 'playlist.json');
const DEFAULT_PASSWORD_HASH = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'; // "password"

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STATE_FILE)) {
    const initialState = {
      status: 'idle',
      currentTrack: null,
      currentTime: 0,
      version: 1,
      updatedAt: Math.floor(Date.now() / 1000),
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(initialState, null, 2));
  }
  if (!fs.existsSync(PLAYLIST_FILE)) {
    const initialPlaylist = {
      queue: [],
      history: [],
      settings: {
        roomName: 'Crowd-Q Lounge',
        hostPasswordHash: DEFAULT_PASSWORD_HASH,
        allowGuestDelete: true,
        maxQueueSize: 50,
      },
    };
    fs.writeFileSync(PLAYLIST_FILE, JSON.stringify(initialPlaylist, null, 2));
  }
}

ensureDataFiles();

function readState() {
  try {
    ensureDataFiles();
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {
      status: 'idle',
      currentTrack: null,
      currentTime: 0,
      version: 1,
      updatedAt: Math.floor(Date.now() / 1000),
    };
  }
}

function writeState(data: any) {
  ensureDataFiles();
  fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
}

function readPlaylist() {
  try {
    ensureDataFiles();
    const raw = fs.readFileSync(PLAYLIST_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {
      queue: [],
      history: [],
      settings: {
        roomName: 'Crowd-Q Lounge',
        hostPasswordHash: DEFAULT_PASSWORD_HASH,
        allowGuestDelete: true,
      },
    };
  }
}

function writePlaylist(data: any) {
  ensureDataFiles();
  fs.writeFileSync(PLAYLIST_FILE, JSON.stringify(data, null, 2));
}

function verifyHostAuth(req: express.Request): boolean {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/Bearer\s+(.*)$/i);
  if (!match) return false;
  const token = match[1].trim();
  const playlist = readPlaylist();
  const expectedHash = playlist.settings?.hostPasswordHash || DEFAULT_PASSWORD_HASH;
  return token === expectedHash;
}

// -------------------------------------------------------------
// PHP Development Shim API Routes
// -------------------------------------------------------------

// Sync state + queue endpoint
const handleSync = (req: express.Request, res: express.Response) => {
  const state = readState();
  const playlist = readPlaylist();
  const safeSettings = { ...(playlist.settings || {}) };
  delete safeSettings.hostPasswordHash;

  const queueSig = (playlist.queue || []).map((q: any) => q.uid).join(',');
  const etag = `"${crypto.createHash('md5').update(`${state.version}-${state.updatedAt}-${queueSig}`).digest('hex')}"`;
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'private, no-cache, no-transform');

  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }

  res.json({
    state,
    playlist: {
      queue: playlist.queue || [],
      history: playlist.history || [],
      settings: safeSettings,
    },
    timestamp: Math.floor(Date.now() / 1000),
  });
};

app.get('/api/sync.php', handleSync);
app.get('/api/sync', handleSync);

// Auth endpoint
const handleAuth = (req: express.Request, res: express.Response) => {
  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const playlist = readPlaylist();
  const expectedHash = playlist.settings?.hostPasswordHash || DEFAULT_PASSWORD_HASH;
  const providedHash = crypto.createHash('sha256').update(password).digest('hex');

  if (providedHash === expectedHash) {
    return res.json({
      success: true,
      token: providedHash,
      message: 'Host mode authenticated successfully',
    });
  } else {
    return res.status(401).json({ error: 'Incorrect host password' });
  }
};

app.post('/api/auth.php', handleAuth);
app.post('/api/auth', handleAuth);

// State update endpoint (Host only)
const handleState = (req: express.Request, res: express.Response) => {
  if (!verifyHostAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Host credentials required' });
  }

  const input = req.body || {};
  const state = readState();
  const now = Math.floor(Date.now() / 1000);

  if (input.status && ['playing', 'paused', 'idle', 'buffering', 'ended'].includes(input.status)) {
    state.status = input.status;
  }
  if (typeof input.currentTime === 'number') {
    state.currentTime = Math.max(0, input.currentTime);
  } else if (typeof input.referenceTime === 'number') {
    state.currentTime = Math.max(0, input.referenceTime);
  }
  if (input.currentTrack !== undefined) {
    state.currentTrack = input.currentTrack;
  }

  state.version = (state.version || 0) + 1;
  state.updatedAt = now;

  writeState(state);

  res.json({
    success: true,
    state,
  });
};

app.post('/api/state.php', handleState);
app.post('/api/state', handleState);

// Queue endpoint (Add / Delete / Reorder)
const handleQueueAdd = (req: express.Request, res: express.Response) => {
  const playlist = readPlaylist();
  const { id, url, title, author, thumbnail, duration, addedBy, playImmediately } = req.body || {};
  if (!id) {
    return res.status(400).json({ error: 'Invalid YouTube track ID' });
  }

  const trackItem = {
    id: String(id).trim(),
    url: String(url || `https://www.youtube.com/watch?v=${id}`).trim(),
    title: String(title || 'YouTube Track').trim(),
    author: String(author || 'YouTube Creator').trim(),
    thumbnail: String(thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`).trim(),
    duration: Number(duration) > 0 ? Number(duration) : 180,
    addedBy: String(addedBy || 'Guest').trim(),
    addedAt: Date.now(),
    uid: `track_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
  };

  if (playImmediately && verifyHostAuth(req)) {
    const state = readState();
    if (state.currentTrack) {
      playlist.history = [state.currentTrack, ...(playlist.history || [])].slice(0, 30);
    }
    const now = Math.floor(Date.now() / 1000);
    state.currentTrack = trackItem;
    state.status = 'playing';
    state.currentTime = 0;
    state.version = (state.version || 0) + 1;
    state.updatedAt = now;

    writeState(state);
    writePlaylist(playlist);

    return res.json({
      success: true,
      message: 'Playing immediately',
      track: trackItem,
      state,
      playlist,
    });
  }

  playlist.queue = [...(playlist.queue || []), trackItem];
  writePlaylist(playlist);

  return res.json({
    success: true,
    track: trackItem,
    queue: playlist.queue,
  });
};

const handleQueueDelete = (req: express.Request, res: express.Response) => {
  const playlist = readPlaylist();
  const uid = req.query.uid as string;
  if (!uid) {
    return res.status(400).json({ error: 'Missing track UID' });
  }

  const isHost = verifyHostAuth(req);
  const allowGuestDelete = playlist.settings?.allowGuestDelete ?? true;

  if (!isHost && !allowGuestDelete) {
    return res.status(403).json({ error: 'Unauthorized: Only host can remove items from queue' });
  }

  playlist.queue = (playlist.queue || []).filter((item: any) => item.uid !== uid);
  writePlaylist(playlist);

  return res.json({
    success: true,
    queue: playlist.queue,
  });
};

const handleQueuePatch = (req: express.Request, res: express.Response) => {
  if (!verifyHostAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Host credentials required' });
  }
  const playlist = readPlaylist();
  const { queue } = req.body || {};
  if (Array.isArray(queue)) {
    playlist.queue = queue;
    writePlaylist(playlist);
    return res.json({ success: true, queue: playlist.queue });
  }
  return res.status(400).json({ error: 'Invalid queue payload' });
};

app.post('/api/queue.php', handleQueueAdd);
app.post('/api/queue', handleQueueAdd);
app.delete('/api/queue.php', handleQueueDelete);
app.delete('/api/queue', handleQueueDelete);
app.patch('/api/queue.php', handleQueuePatch);
app.patch('/api/queue', handleQueuePatch);

// Skip to next track endpoint (Host only)
const handleSkip = (req: express.Request, res: express.Response) => {
  if (!verifyHostAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Host credentials required' });
  }

  const state = readState();
  const playlist = readPlaylist();

  if (state.currentTrack) {
    playlist.history = [state.currentTrack, ...(playlist.history || [])].slice(0, 30);
  }

  const queue = playlist.queue || [];
  const now = Math.floor(Date.now() / 1000);

  if (queue.length > 0) {
    const nextTrack = queue.shift();
    playlist.queue = queue;

    state.currentTrack = nextTrack;
    state.status = 'playing';
    state.currentTime = 0;
    state.version = (state.version || 0) + 1;
    state.updatedAt = now;
  } else {
    state.currentTrack = null;
    state.status = 'idle';
    state.currentTime = 0;
    state.version = (state.version || 0) + 1;
    state.updatedAt = now;
  }

  writeState(state);
  writePlaylist(playlist);

  res.json({
    success: true,
    state,
    playlist,
  });
};

app.post('/api/skip.php', handleSkip);
app.post('/api/skip', handleSkip);

// YouTube oEmbed proxy
app.get(['/api/oembed.php', '/api/oembed'], async (req, res) => {
  const videoUrl = req.query.url as string;
  if (!videoUrl) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const targetUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    const response = await fetch(targetUrl);
    if (response.ok) {
      const data = await response.json();
      return res.json(data);
    }
    return res.json({
      title: 'YouTube Video',
      author_name: 'YouTube Creator',
      thumbnail_url: '',
    });
  } catch (err) {
    return res.json({
      title: 'YouTube Video',
      author_name: 'YouTube Creator',
      thumbnail_url: '',
    });
  }
});

// Settings update endpoint (Host only)
const handleSettings = (req: express.Request, res: express.Response) => {
  if (!verifyHostAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Host credentials required' });
  }

  const playlist = readPlaylist();
  const settings = playlist.settings || {};
  const input = req.body || {};

  if (typeof input.roomName === 'string') {
    settings.roomName = input.roomName.trim();
  }
  if (typeof input.maxQueueSize === 'number') {
    settings.maxQueueSize = Math.max(5, Math.min(200, input.maxQueueSize));
  }
  if (typeof input.allowGuestDelete === 'boolean') {
    settings.allowGuestDelete = input.allowGuestDelete;
  }
  if (input.password) {
    settings.hostPasswordHash = crypto.createHash('sha256').update(String(input.password)).digest('hex');
  }

  playlist.settings = settings;
  writePlaylist(playlist);

  const safeSettings = { ...settings };
  delete safeSettings.hostPasswordHash;

  res.json({
    success: true,
    settings: safeSettings,
  });
};

app.post('/api/settings.php', handleSettings);
app.post('/api/settings', handleSettings);

// Vite middleware & Production Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ['**/data/**', '**/storage/**', '**/*.json'],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Crowd-Q server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
