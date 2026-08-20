import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// build: 2026-06-16b (force fresh build to bake VITE_DEV_WALLET → real SOL)
export default defineConfig({
  // Solana web3 libraries assume a Node-like environment. Map `global` to
  // `globalThis` and keep the real `buffer` polyfill (instead of Vite's empty
  // browser stub) so wallet calls work in the browser.
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
      // Bubblewrap (and the dApp Store PWA guide) expect the manifest at
      // /manifest.json, not Vite's default /manifest.webmanifest.
      manifestFilename: 'manifest.json',
      workbox: {
        // The main bundle (Phaser + Solana web3) is ~2.3 MB, over Workbox's
        // 2 MiB default precache cap. Raise it so the service worker builds.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Background art can be large; keep it OUT of the precache (so the build
        // never fails on a big backdrop) and cache it on first use instead.
        globIgnores: ['**/assets/*.png', '**/assets/*.jpg', '**/assets/*.jpeg', '**/assets/*.webp'],
        // Digital Asset Links is fetched by Android's verifier, not the page —
        // never let the SPA navigation fallback shadow it.
        navigateFallbackDenylist: [/^\/\.well-known\//, /^\/api\//],
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
        id: '/',
        name: 'NeoContra: Solana Assault',
        short_name: 'NeoContra',
        description: 'Retro run-and-gun shooter on Solana',
        // The game is a 4:3 side-scroller with an on-screen joystick + fire
        // buttons pinned to the screen edges — it is landscape-first, and the
        // TWA build reads this to lock the Android activity's orientation.
        orientation: 'landscape',
        // Black, not white: the game boots into a CRT-black title screen, so a
        // white splash flashes hard on launch.
        background_color: '#000000',
        theme_color: '#00ff00',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['games', 'entertainment'],
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
            // Inset to the 80% safe zone — Android crops adaptive icons to a
            // circle and would otherwise cut off the CONTRA lockup.
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
})
