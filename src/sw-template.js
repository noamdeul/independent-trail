/* Service worker for "הרפתקה בשדרה".
 * Generated at build time from src/sw-template.js (see vite.config.ts).
 * All paths are relative to the service worker location, so it works
 * under any GitHub Pages repository path. */

const CACHE_PREFIX = 'shdera-'
const CACHE_NAME = CACHE_PREFIX + '__CACHE_VERSION__'
const PRECACHE = __PRECACHE_LIST__

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(PRECACHE.map((path) => new Request(new URL(path, self.location).href, { cache: 'reload' }))),
      )
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

function appShell() {
  const scope = self.registration.scope
  return caches
    .match(scope, { cacheName: CACHE_NAME })
    .then((res) => res || caches.match(new URL('index.html', scope).href, { cacheName: CACHE_NAME }))
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // Network first so updates arrive quickly. On a weak outdoor signal we fall
    // back to the cached shell after a short wait instead of hanging.
    const fromCache = () => caches.match(request, { ignoreSearch: true }).then((res) => res || appShell())
    event.respondWith(
      new Promise((resolve) => {
        let settled = false
        const finish = (response) => {
          if (!settled && response) {
            settled = true
            resolve(response)
          }
        }
        const timer = setTimeout(() => fromCache().then(finish), 3500)
        fetch(request)
          .then((response) => {
            clearTimeout(timer)
            if (response.ok) {
              const copy = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
            }
            finish(response)
          })
          .catch(() => {
            clearTimeout(timer)
            fromCache().then((res) => finish(res || Response.error()))
          })
      }),
    )
    return
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})
