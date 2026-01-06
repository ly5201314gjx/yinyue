import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        // Removed includeAssets to avoid 404s for missing local files
        manifest: {
          name: 'Lg 音乐',
          short_name: 'Lg Music',
          description: '极简 AI 音乐播放器',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              // Using a reliable remote placeholder icon for PWA installability
              src: 'https://cdn-icons-png.flaticon.com/512/1251/1251671.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'https://cdn-icons-png.flaticon.com/512/1251/1251671.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.googlevideo\.com\/.*$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'media-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 30 * 24 * 60 * 60 // 30 Days
                }
              }
            },
            {
              urlPattern: /^https:\/\/.*\.163\.com\/.*$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'music-api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 // 1 Day
                }
              }
            },
            {
              // Cache CDN icons
              urlPattern: /^https:\/\/cdn-icons-png\.flaticon\.com\/.*$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'icon-cache',
                expiration: {
                   maxEntries: 10,
                   maxAgeSeconds: 60 * 60 * 24 * 30 
                }
              }
            }
          ]
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env': {}
    }
  };
});