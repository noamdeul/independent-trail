import { useEffect, useState } from 'react'

export type OfflineState = 'unsupported' | 'pending' | 'ready'

/** Reports whether the service worker is active, i.e. the app is cached for offline use. */
export function useOfflineReady(): OfflineState {
  const supported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD
  const [state, setState] = useState<OfflineState>(supported ? 'pending' : 'unsupported')
  useEffect(() => {
    if (!supported) return
    let alive = true
    navigator.serviceWorker.ready.then(() => alive && setState('ready')).catch(() => undefined)
    return () => {
      alive = false
    }
  }, [supported])
  return state
}
