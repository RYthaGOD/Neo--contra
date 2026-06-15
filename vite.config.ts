import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Solana web3 libraries assume a Node-like environment. Map `global` to
  // `globalThis` and keep the real `buffer` polyfill (instead of Vite's empty
  // browser stub) so wallet/token calls work in the browser.
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      workbox: {
        // The main bundle (Phaser + Solana web3) is ~2.3 MB, over Workbox's
        // 2 MiB default precache cap. Raise it so the service worker builds.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Background art can be large; keep it OUT of the precache (so the build
        // never fails on a big backdrop) and cache it on first use instead.
        globIgnores: ['**/assets/*.png', '**/assets/*.jpg', '**/assets/*.jpeg', '**/assets/*.webp'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/assets\/.*\.(png|jpe?g|webp)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'neocontra-backdrops',
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: 'NeoContra: Solana Assault',
        short_name: 'NeoContra',
        description: 'Retro run-and-gun shooter on Solana',
        theme_color: '#00ff00',
        icons: [
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
})
