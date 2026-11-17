import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.API_URL?.trim();

  if (mode === 'production' && !apiUrl) {
    throw new Error('API_URL is required for production builds. Set it to the backend origin without /api.');
  }

  if (apiUrl) {
    let parsedApiUrl: URL;
    try {
      parsedApiUrl = new URL(apiUrl);
    } catch {
      throw new Error('API_URL must be a valid absolute URL.');
    }

    if (
      !['http:', 'https:'].includes(parsedApiUrl.protocol) ||
      (mode === 'production' && parsedApiUrl.protocol !== 'https:') ||
      parsedApiUrl.pathname !== '/' ||
      parsedApiUrl.search ||
      parsedApiUrl.hash
    ) {
      throw new Error('API_URL must be an HTTP(S) origin without a path, query, or fragment.');
    }
  }

  return {
    plugins: [react()],
    define: {
      'import.meta.env.API_URL': JSON.stringify(apiUrl || ''),
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  };
});
