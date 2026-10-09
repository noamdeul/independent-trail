/// <reference types="vitest/config" />
import { defineConfig, type Plugin, type ResolvedConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

// Relative base ("./") works on any GitHub Pages path (user site or /repo-name/)
// because the app uses hash routing. BASE_PATH can force an absolute base if needed.
const base = process.env.BASE_PATH || './'

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? listFiles(full) : [full]
  })
}

// Generates dist/sw.js with the exact list of built files, so the whole app
// (UI, stories, tasks, icons) is precached after the first successful visit.
function offlineServiceWorker(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'offline-service-worker',
    apply: 'build',
    enforce: 'post',
    configResolved(resolved) {
      config = resolved
    },
    closeBundle() {
      const outDir = config.build.outDir
      const template = readFileSync(join(config.root, 'src', 'sw-template.js'), 'utf8')
      const files = listFiles(outDir)
        .map((file) => relative(outDir, file).split(sep).join('/'))
        .filter((file) => file !== 'sw.js' && !file.endsWith('.map'))
        .sort()
      const hash = createHash('sha256')
      for (const file of files) hash.update(file).update(readFileSync(join(outDir, file)))
      const version = hash.digest('hex').slice(0, 12)
      const precache = ['./', ...files.map((file) => `./${file}`)]
      const sw = template
        .replace('__CACHE_VERSION__', version)
        .replace('__PRECACHE_LIST__', JSON.stringify(precache, null, 2))
      writeFileSync(join(outDir, 'sw.js'), sw)
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), offlineServiceWorker()],
  build: {
    target: 'es2020',
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
