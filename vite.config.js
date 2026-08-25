import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.json',
      manifest: {
        name: 'Medilio — Soins à domicile',
        short_name: 'Medilio',
        description: 'Mise en relation sécurisée pour les soins à domicile.',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        theme_color: '#1e40af',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
      },
      workbox: {
        // Only the static application shell is precached. Health data and
        // authenticated API responses must never be persisted by Workbox.
        runtimeCaching: []
      }
    })
  ],
});
