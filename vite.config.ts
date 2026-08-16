import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  const backendTarget =
    env.VITE_PHP_BACKEND_URL ||
    env.PHP_BACKEND_URL ||
    process.env.VITE_PHP_BACKEND_URL ||
    process.env.PHP_BACKEND_URL ||
    'http://127.0.0.1:8000';

  console.log(`[Vite Proxy] Forwarding /api requests to: ${backendTarget}`);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/data/**', '**/storage/**', '**/*.json'],
      },
    },
  };
});
