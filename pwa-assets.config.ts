import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Genera el joc d'icones PWA (192/512/maskable/apple-touch/favicon)
// a partir de public/logo.svg. El fons de farciment és paper càlid
// perquè la versió maskable quedi com una rajola contínua, sense vora blanca.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: { background: '#fbfaf7' },
    },
    apple: {
      ...minimal2023Preset.apple,
      resizeOptions: { background: '#fbfaf7' },
    },
  },
  images: ['public/logo.svg'],
})
