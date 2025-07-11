import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'phaseloop',
        short_name: 'phaseloop',
        description: 'A client-side audio loop re-aligner for the Endlesss app.',
        theme_color: '#1f2937',
        background_color: '#111827',
        display: 'standalone',
        icons: [
          {
            src: 'android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      // --- FIX ---
      // Add a workbox configuration to make the PWA more robust on cold starts.
      workbox: {
        // This ensures the service worker takes control of the page as soon as it's activated.
        clientsClaim: true,
        // This ensures the new service worker activates immediately, without waiting for old tabs to close.
        skipWaiting: true,
      },
    }),
  ],
});