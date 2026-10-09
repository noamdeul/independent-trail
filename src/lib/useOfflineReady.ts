import { useEffect, useState } from 'react'
import { serviceWorkerRegistration } from './serviceWorker'

export type OfflineState = 'unsupported' | 'pending' | 'ready' | 'failed'

/** Reports whether the service worker is active, i.e. the app is cached for offline use. */
export function useOfflineReady(): OfflineState {
  const registration = serviceWorkerRegistration()
  const [state, setState] = useState<OfflineState>(registration ? 'pending' : 'unsupported')
  useEffect(() => {
    if (!registration) return
    let alive = true
    registration
      .then(() => navigator.serviceWorker.ready)
      .then(() => alive && setState('ready'))
      .catch(() => alive && setState('failed'))
    return () => {
      alive = false
    }
  }, [registration])
  return state
}
