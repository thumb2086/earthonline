import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: '',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.pwa',
      manifest: {
        name: 'Earth Online',
        short_name: 'EarthOnline',
        description: '全球節點觀測與管理中心',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0e17',
        theme_color: '#00ff41',
        icons: [
          { src: '/favicon.ico', sizes: '64x64', type: 'image/x-icon' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,ttf,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/earthonline\.onrender\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', expiration: { maxEntries: 50, maxAgeSeconds: 300 } }
          }
        ]
      }
    })
  ],
  define: {
    'process.env': {}
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
