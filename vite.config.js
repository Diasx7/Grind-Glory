import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Grind & Glory',
        short_name: 'Grind & Glory',
        description: 'seu progresso na vida real vira poder no jogo',
        lang: 'pt-BR',
        theme_color: '#1b1330',
        background_color: '#1b1330',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icone-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icone-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icone-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
