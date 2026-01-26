import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/MemoSuite/WordMemo/',
  server: {
    port: 3003,
    strictPort: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'WordMemo',
        short_name: 'WordMemo',
        description: 'WordMemo - A vocabulary memo for learning',
        theme_color: '#ABDF94',
        display: 'standalone',
        background_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10000000,
        cleanupOutdatedCaches: true,
        // Disable automatic updates on navigation
        skipWaiting: false,
        clientsClaim: false
      }
    })
  ],
})
