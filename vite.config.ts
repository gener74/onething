import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      pwaAssets: { config: true },
      manifest: {
        name: 'Onething — una cosa a la vegada',
        short_name: 'Onething',
        description: 'Una eina de focus calmada. Una sola cosa, ara.',
        lang: 'ca',
        theme_color: '#6b8f71',
        background_color: '#fbfaf7',
        display: 'standalone',
        orientation: 'portrait',
        // Les icones les injecta @vite-pwa/assets-generator (pwa-assets.config.ts)
      },
    }),
  ],
})
