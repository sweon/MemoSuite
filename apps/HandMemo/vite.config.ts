import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/MemoSuite/HandMemo/',
  server: {
    port: 3001,
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
        id: '/MemoSuite/HandMemo/',
        name: 'HandMemo',
        short_name: 'HandMemo',
        description: 'Local-first Note-taking & Drawing',
        theme_color: '#ef8e13',
        background_color: '#ffffff',
        start_url: '/MemoSuite/HandMemo/',
        scope: '/MemoSuite/HandMemo/',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'any',
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
          {
            src: 'maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        prefer_related_applications: false,
        share_target: {
          action: '/MemoSuite/HandMemo/share-target/',
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
