import { useSyncExternalStore } from 'react'

// Minimal hash router: works on GitHub Pages without server rewrites,
// and keeps the browser back button useful.

export type Screen =
  | { name: 'welcome' }
  | { name: 'station'; id: string }
  | { name: 'stations' }
  | { name: 'finish' }
  | { name: 'about' }

export function parseHash(hash: string): Screen {
  const path = hash.replace(/^#\/?/, '').split('?')[0]
  const [first, second] = path.split('/').map((part) => {
    try {
      return decodeURIComponent(part)
    } catch {
      return part
    }
  })
  switch (first) {
    case 'station':
      return second ? { name: 'station', id: second } : { name: 'stations' }
    case 'stations':
      return { name: 'stations' }
    case 'finish':
      return { name: 'finish' }
    case 'about':
      return { name: 'about' }
    default:
      return { name: 'welcome' }
  }
}

export function hrefFor(screen: Screen): string {
  switch (screen.name) {
    case 'station':
      return `#/station/${encodeURIComponent(screen.id)}`
    case 'welcome':
      return '#/'
    default:
      return `#/${screen.name}`
  }
}

export function navigate(screen: Screen, options: { replace?: boolean } = {}) {
  const href = hrefFor(screen)
  if (options.replace) {
    history.replaceState(history.state, '', href)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else if (window.location.hash !== href) {
    window.location.hash = href
  }
}

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash)
}
