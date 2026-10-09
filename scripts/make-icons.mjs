// Renders public/icons/icon.svg into the PNG icons that iOS and Android need.
// Usage: npm run icons  (uses Playwright's Chromium; set CHROMIUM_PATH to override)
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('../public/icons/', import.meta.url))
const svg = readFileSync(dir + 'icon.svg', 'utf8')
const square = svg.replace('rx="112"', 'rx="0"')
const dataUrl = (s) => `data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}`

const targets = [
  { file: 'icon-192.png', size: 192, src: svg, inset: 0, bg: 'transparent' },
  { file: 'icon-512.png', size: 512, src: svg, inset: 0, bg: 'transparent' },
  // iOS masks the corners itself and shows transparency as black, so full-bleed.
  { file: 'apple-touch-icon.png', size: 180, src: square, inset: 0, bg: '#f6efe3' },
  // Maskable: keep the artwork inside the central safe zone.
  { file: 'icon-maskable-512.png', size: 512, src: square, inset: 0.1, bg: '#f6efe3' },
]

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const page = await browser.newPage({ deviceScaleFactor: 1 })
for (const t of targets) {
  const inner = Math.round(t.size * (1 - 2 * t.inset))
  await page.setViewportSize({ width: t.size, height: t.size })
  await page.setContent(
    `<html><body style="margin:0;background:${t.bg};display:grid;place-items:center;width:${t.size}px;height:${t.size}px">` +
      `<img src="${dataUrl(t.src)}" width="${inner}" height="${inner}" style="display:block"></body></html>`,
  )
  await page.waitForFunction(() => document.images[0]?.complete)
  await page.screenshot({ path: dir + t.file, omitBackground: t.bg === 'transparent' })
  console.log('wrote', t.file)
}
await browser.close()
