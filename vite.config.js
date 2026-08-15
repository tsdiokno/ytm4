import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

/**
 * Embedded Dev API Plugin
 * Allows full local development with zero external dependencies (reads/writes state.json).
 * When running in production or with PHP, PHP handles the requests.
 */
function crowdQueueApiPlugin() {
  const stateFilePath = path.resolve(__dirname, 'state.json');
  const configFilePath = path.resolve(__dirname, 'config.json');

  const defaultState = {
    queue: [],
    playback: {
      currentVideoId: null,
      isPlaying: false,
      elapsedMs: 0,
      updatedAt: 0,
    },
  };

  const readState = () => {
    try {
      if (fs.existsSync(stateFilePath)) {
        const content = fs.readFileSync(stateFilePath, 'utf-8');
        const data = JSON.parse(content || '{}');
        if (Array.isArray(data)) {
          return { ...defaultState, queue: data };
        }
        return {
          queue: Array.isArray(data.queue) ? data.queue : [],
          playback: { ...defaultState.playback, ...(data.playback || {}) },
        };
      }
    } catch (e) {
      console.error('Error reading state.json:', e);
    }
    return defaultState;
  };

  const writeState = (state) => {
    try {
      fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('Error writing state.json:', e);
      return false;
    }
  };

  const readConfig = () => {
    try {
      if (fs.existsSync(configFilePath)) {
        const content = fs.readFileSync(configFilePath, 'utf-8');
        const data = JSON.parse(content || '{}');
        const apiKey = data.youtube_api_key && data.youtube_api_key !== 'YOUR_API_KEY' ? data.youtube_api_key : null;
        return { hasApiKey: !!apiKey, youtube_api_key: apiKey };
      }
    } catch (e) {
      console.error('Error reading config.json:', e);
    }
    return { hasApiKey: false, youtube_api_key: null };
  };

  return {
    name: 'crowd-q-dev-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url.split('?')[0];

        // 1. GET /api/config
        if (url === '/api/config' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(readConfig()));
          return;
        }

        // 2. GET /api/state
        if (url === '/api/state' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(readState()));
          return;
        }

        // 3. GET /api/playback
        if (url === '/api/playback' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(readState().playback));
          return;
        }

        // 4. POST /api/playback
        if (url === '/api/playback' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const currentState = readState();
              currentState.playback = {
                currentVideoId: data.currentVideoId !== undefined ? data.currentVideoId : currentState.playback.currentVideoId,
                isPlaying: !!data.isPlaying,
                elapsedMs: Math.max(0, parseInt(data.elapsedMs || 0, 10)),
                updatedAt: Date.now(),
              };
              writeState(currentState);
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ success: true, data: currentState, message: 'Playback state updated' }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 5. POST /api/playback/sync
        if (url === '/api/playback/sync' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const currentState = readState();
              currentState.playback.elapsedMs = Math.max(0, parseInt(data.elapsedMs || 0, 10));
              currentState.playback.updatedAt = Date.now();
              writeState(currentState);
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ success: true, data: currentState, message: 'Playback position synced' }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 6. GET /api/queue or /api/get_queue.php or /get_queue.php
        if ((url === '/api/queue' || url === '/api/get_queue.php' || url === '/get_queue.php') && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(readState().queue));
          return;
        }

        // 7. POST /api/queue or /api/save_queue.php or /save_queue.php
        if ((url === '/api/queue' || url === '/api/save_queue.php' || url === '/save_queue.php') && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const currentState = readState();

              if (Array.isArray(data.queue)) {
                currentState.queue = data.queue;
                writeState(currentState);
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ success: true, data: currentState.queue, message: 'Queue updated' }));
                return;
              }

              if (data.song && data.song.videoId) {
                const isDuplicate = currentState.queue.some(
                  (item) => item.videoId === data.song.videoId || item.url === data.song.url
                );

                if (isDuplicate) {
                  res.statusCode = 409;
                  res.setHeader('Content-Type', 'application/json; charset=utf-8');
                  res.end(JSON.stringify({ success: false, error: 'Song is already in queue', queue: currentState.queue }));
                  return;
                }

                currentState.queue.push({ ...data.song, addedAt: Math.floor(Date.now() / 1000) });
                writeState(currentState);
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ success: true, data: currentState.queue, message: 'Song added successfully' }));
                return;
              }

              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ success: false, error: 'Invalid payload' }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 8. DELETE /api/queue
        if (url === '/api/queue' && req.method === 'DELETE') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const currentState = readState();
              const index = typeof data.index === 'number' ? data.index : 0;
              currentState.queue.splice(index, 1);
              writeState(currentState);
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ success: true, data: currentState.queue, message: 'Song removed' }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 9. POST /api/queue/next
        if (url === '/api/queue/next' && req.method === 'POST') {
          const currentState = readState();
          currentState.queue.shift();
          writeState(currentState);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ success: true, data: currentState.queue, message: 'Advanced to next song' }));
          return;
        }

        // 10. POST /api/queue/clear
        if (url === '/api/queue/clear' && req.method === 'POST') {
          const currentState = readState();
          currentState.queue = [];
          currentState.playback = { currentVideoId: null, isPlaying: false, elapsedMs: 0, updatedAt: Date.now() };
          writeState(currentState);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ success: true, data: [], message: 'Queue cleared' }));
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    crowdQueueApiPlugin(),
  ],
  server: {
    port: 5173,
  },
});
