// Serves dist/ under a sub-path, the way GitHub Pages serves a project site
// (https://<user>.github.io/<repo>/). Anything outside the sub-path is a 404.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../dist/', import.meta.url))
const prefix = process.env.BASE_PREFIX ?? '/independent-trail/'
const port = Number(process.env.PORT ?? 4173)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (!path.startsWith(prefix)) {
    res.writeHead(404).end('not found')
    return
  }
  let rel = path.slice(prefix.length)
  if (rel === '' || rel.endsWith('/')) rel += 'index.html'
  rel = normalize(rel).replace(/^[/\\]+/, '')
  if (rel.startsWith('..')) {
    res.writeHead(403).end()
    return
  }
  try {
    const body = await readFile(join(root, rel))
    res.writeHead(200, { 'content-type': types[extname(rel)] ?? 'application/octet-stream', 'cache-control': 'no-cache' })
    res.end(body)
  } catch {
    res.writeHead(404).end('not found')
  }
}).listen(port, () => console.log(`serving dist at http://localhost:${port}${prefix}`))
