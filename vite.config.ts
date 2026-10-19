import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Publiée sur GitHub Pages sous /threeofheart/
export default defineConfig({
  base: '/threeofheart/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['apple-touch-icon.png', 'favicon.png'],
      manifest: {
        name: 'Three of Heart',
        short_name: 'Three of Heart',
        description: 'Nos idées à deux : restos, sorties, films, séries.',
        lang: 'fr',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FFF6F1',
        theme_color: '#FFF6F1',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        importScripts: ['push-sw.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org',
            handler: 'CacheFirst',
            options: { cacheName: 'map-tiles', expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: ({ url }) => url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com'),
            handler: 'CacheFirst',
            options: { cacheName: 'fonts' },
          },
        ],
      },
    }),
  ],
})
