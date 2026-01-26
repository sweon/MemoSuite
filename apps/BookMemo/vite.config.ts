import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/MemoSuite/BookMemo/',
  server: {
    port: 3002,
    strictPort: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // Disable automatic update checking - updates only when user manually checks
      selfDestroying: false,
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'BookMemo',
        short_name: 'BookMemo',
        theme_color: '#2D6E7E',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10000000, // 10MB
        // Disable automatic updates on navigation
        skipWaiting: false,
        clientsClaim: false
      }
    })
  ],
})
