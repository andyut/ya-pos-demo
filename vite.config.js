import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'
import { VitePWA } from 'vite-plugin-pwa'
const base = process.env.BASE || '/ya-pos-demo/'
export default defineConfig({
  base,
  plugins: [
    vue({ template: { transformAssetUrls } }),
    quasar(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'YA POS – Kasir Offline', short_name: 'YA POS',
        description: 'Aplikasi kasir offline by YA Consulting (Yohanes Andy)',
        theme_color: '#127475', background_color: '#ffffff', display: 'standalone',
        start_url: base, scope: base, lang: 'id',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,woff,woff2}'], maximumFileSizeToCacheInBytes: 5e6, navigateFallback: base + 'index.html' }
    })
  ]
})
