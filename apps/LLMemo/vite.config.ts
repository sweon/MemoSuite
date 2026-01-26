import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/MemoSuite/LLMemo/',
  server: {
    port: 3004,
    strictPort: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // Disable automatic update checking - only manual checks via registration.update()
      workbox: {
        maximumFileSizeToCacheInBytes: 10000000,
        skipWaiting: false,
        clientsClaim: false,
      },
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'LLMemo',
        short_name: 'LLMemo',
        description: 'Offline-capable LLM interaction logger',
        theme_color: '#5995E2',
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
      }
    })
  ],
})
