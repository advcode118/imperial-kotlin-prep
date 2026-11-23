import { useCallback, useSyncExternalStore } from 'react'

/** All site state lives in localStorage under this prefix. */
const PREFIX = 'ikp:'
const listeners = new Set<() => void>()
const cache = new Map<string, { raw: string | null; value: unknown }>()

function read<T>(key: string, initial: T): T {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(PREFIX + key)
  } catch {
    /* storage unavailable */
  }
  const hit = cache.get(key)
  if (hit && hit.raw === raw) return hit.value as T
  let value = initial
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T
    } catch {
      value = initial
    }
  }
  cache.set(key, { raw, value })
  return value
}

function write<T>(key: string, value: T) {
  const raw = JSON.stringify(value)
  cache.set(key, { raw, value })
  try {
    localStorage.setItem(PREFIX + key, raw)
  } catch {
    /* storage unavailable: keep in memory only */
  }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  window.addEventListener('storage', l)
  return () => {
    listeners.delete(l)
    window.removeEventListener('storage', l)
  }
}

export function usePersistent<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const value = useSyncExternalStore(subscribe, () => read(key, initial))
  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      const prev = read(key, initial)
      write(key, typeof v === 'function' ? (v as (p: T) => T)(prev) : v)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )
  return [value, set]
}

export interface Progress {
  read: Record<string, true>
  /** Question id -> outcome of the best attempt. */
  questions: Record<string, 'passed' | 'tried'>
  parts: Record<string, true>
}

const EMPTY: Progress = { read: {}, questions: {}, parts: {} }

export function useProgress() {
  const [progress, set] = usePersistent<Progress>('progress', EMPTY)
  const markRead = useCallback(
    (id: string, on = true) =>
      set((p) => {
        const read = { ...p.read }
        if (on) read[id] = true
        else delete read[id]
        return { ...p, read }
      }),
    [set],
  )
  const recordQuestion = useCallback(
    (id: string, passed: boolean) =>
      set((p) =>
        p.questions[id] === 'passed'
          ? p
          : { ...p, questions: { ...p.questions, [id]: passed ? 'passed' : 'tried' } },
      ),
    [set],
  )
  const markPart = useCallback(
    (id: string, on: boolean) =>
      set((p) => {
        const parts = { ...p.parts }
        if (on) parts[id] = true
        else delete parts[id]
        return { ...p, parts }
      }),
    [set],
  )
  return { progress, markRead, recordQuestion, markPart }
}

/** Forget everything except the colour theme. */
export function resetAll() {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX) && k !== PREFIX + 'theme') keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
  cache.clear()
  listeners.forEach((l) => l())
}
