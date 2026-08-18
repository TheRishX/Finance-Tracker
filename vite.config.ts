import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg'],
    manifest: {
      name: 'Paisa — Finance Tracker', short_name: 'Paisa', description: 'A calm, private finance tracker.',
      theme_color: '#f7f6f1', background_color: '#f7f6f1', display: 'standalone', orientation: 'portrait',
      icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
    }
  })]
})
