import { defineConfig } from 'vitest/config';
import { loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

/** Local stand-in for Vercel: serves api/ai.ts at /api/ai, reading GEMINI_API_KEY from .env.local (git-ignored). */
function devAiProxy(env: Record<string, string>): Plugin {
  return {
    name: 'aster-dev-ai-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const { handle } = (await server.ssrLoadModule('/api/ai.ts')) as typeof import('./api/ai');
        const origin = `http://${req.headers.host}`;
        const request = new Request(`${origin}/api/ai`, {
          method: req.method,
          headers: { ...(req.headers as Record<string, string>), origin },
          body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
        });
        const out = await handle(request, env);
        res.statusCode = out.status;
        res.setHeader('content-type', 'application/json');
        res.end(await out.text());
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  plugins: [
    devAiProxy(loadEnv(mode, process.cwd(), '')),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/favicon.svg'],
      manifest: {
        name: 'Aster',
        short_name: 'Aster',
        description: 'Know what to study next.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        theme_color: '#0a0914',
        background_color: '#0a0914',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  // PORT is set by the preview tool; otherwise Vite's default (and it moves to the next free port if taken).
  server: { host: true, port: Number(process.env.PORT) || 5173 },
  test: { include: ['tests/**/*.test.ts'] },
}));
