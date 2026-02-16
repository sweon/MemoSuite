import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/MemoSuite/DailyMemo/',
  server: {
    port: 3005,
    strictPort: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // Disable automatic update checking - updates only when user manually checks
      selfDestroying: false,
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        id: '/MemoSuite/DailyMemo/',
        name: 'DailyMemo',
        short_name: 'DailyMemo',
        description: 'Local-first Daily Journal & Record',
        theme_color: '#cc79a7',
        background_color: '#ffffff',
        start_url: '/MemoSuite/DailyMemo/',
        scope: '/MemoSuite/DailyMemo/',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        categories: ['productivity', 'utilities', 'notes'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
        ],
        prefer_related_applications: false,
        share_target: {
          action: '/MemoSuite/DailyMemo/share-target/',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
            files: [
              {
                name: 'files',
                accept: [
                  'text/plain',
                  'text/markdown',
                  'text/csv',
                  '.md',
                  '.csv',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  'application/vnd.ms-excel'
                ]
              }
            ]
          }
        }
      },
      workbox: {
        importScripts: ['sw-share.js'],
        maximumFileSizeToCacheInBytes: 10000000, // 10MB
        // Claim clients immediately to ensure the service worker is active and registering the manifest features
        skipWaiting: true,
        clientsClaim: true
      }
    })
  ],
})
