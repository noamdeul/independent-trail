// Safe wrapper around localStorage. Private browsing, disabled storage or a
// full quota must never break the app, so everything falls back to memory.

export interface SafeStorage {
  readonly persistent: boolean
  get(key: string): string | null
  set(key: string, value: string): boolean
  remove(key: string): void
}

function probe(): Storage | null {
  try {
    const store = window.localStorage
    const testKey = '__shdera_probe__'
    store.setItem(testKey, '1')
    store.removeItem(testKey)
    return store
  } catch {
    return null
  }
}

export function createStorage(): SafeStorage {
  const memory = new Map<string, string>()
  const store = typeof window === 'undefined' ? null : probe()
  let persistent = store !== null

  return {
    get persistent() {
      return persistent
    },
    get(key) {
      // Every write of this session is in memory, so it is never older than the store.
      if (memory.has(key)) return memory.get(key) ?? null
      if (store) {
        try {
          return store.getItem(key)
        } catch {
          // fall through to memory
        }
      }
      return memory.get(key) ?? null
    },
    set(key, value) {
      memory.set(key, value)
      if (!store) return false
      try {
        store.setItem(key, value)
        return true
      } catch {
        persistent = false
        return false
      }
    },
    remove(key) {
      memory.delete(key)
      try {
        store?.removeItem(key)
      } catch {
        // ignore
      }
    },
  }
}

export function readJson<T>(storage: SafeStorage, key: string): T | null {
  const raw = storage.get(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
