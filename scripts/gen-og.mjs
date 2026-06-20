// Genera la imatge Open Graph (public/og.png, 1200×630) per a les previsualitzacions
// d'enllaços compartits. Regenera-la amb: npm run generate-og
import sharp from 'sharp'

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#fbfaf7"/>
  <rect width="1200" height="630" fill="url(#g)"/>
  <defs>
    <radialGradient id="g" cx="50%" cy="0%" r="90%">
      <stop offset="0%" stop-color="#6b8f71" stop-opacity="0.12"/>
      <stop offset="60%" stop-color="#6b8f71" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g transform="translate(600,190)">
    <circle r="64" fill="none" stroke="#6b8f71" stroke-width="9"/>
    <circle r="15" fill="#6b8f71"/>
  </g>
  <text x="600" y="350" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="92" font-weight="600" fill="#2a2a2e">OneThing</text>
  <text x="600" y="420" text-anchor="middle" font-family="system-ui, Segoe UI, Arial, sans-serif" font-size="36" fill="#4f7256">Not another to-do list. A coach that helps you begin.</text>
  <text x="600" y="500" text-anchor="middle" font-family="system-ui, Segoe UI, Arial, sans-serif" font-size="24" fill="#8a8a93">una cosa a la vegada</text>
</svg>`

await sharp(Buffer.from(svg)).png().toFile('public/og.png')
console.log('✓ public/og.png generat')
