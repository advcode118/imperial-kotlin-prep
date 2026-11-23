import { useCallback, useEffect, useRef, useState } from 'react'
import { CompilerUnavailable, execute, type RunResult, type SourceFile } from './kotlin'

/** One request at a time, and at least this long between requests, site-wide. */
const MIN_GAP_MS = 1500
let chain: Promise<unknown> = Promise.resolve()
let lastFinished = 0

function schedule<T>(job: () => Promise<T>): Promise<T> {
  const run = async () => {
    const wait = lastFinished + MIN_GAP_MS - Date.now()
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    try {
      return await job()
    } finally {
      lastFinished = Date.now()
    }
  }
  const p = chain.then(run, run)
  chain = p.catch(() => undefined)
  return p
}

export type RunState =
  | { status: 'idle' }
  | { status: 'running'; since: number }
  | { status: 'done'; result: RunResult }
  | { status: 'unavailable'; reason: string }

/**
 * Run Kotlin with a busy flag; ignores clicks while a run is in flight.
 * `cancel` drops the request: nothing is marked and the state returns to idle.
 */
export function useKotlinRunner() {
  const [state, setState] = useState<RunState>({ status: 'idle' })
  const busy = useRef(false)
  const abort = useRef<AbortController | null>(null)

  const run = useCallback(async (files: SourceFile[], mode: 'run' | 'test' = 'run') => {
    if (busy.current) return null
    busy.current = true
    const ctrl = new AbortController()
    abort.current = ctrl
    setState({ status: 'running', since: Date.now() })
    try {
      const result = await schedule(() => {
        if (ctrl.signal.aborted) throw new CompilerUnavailable('cancelled')
        return execute(files, mode, { signal: ctrl.signal })
      })
      if (ctrl.signal.aborted) return null
      setState({ status: 'done', result })
      return result
    } catch (e) {
      if (ctrl.signal.aborted) return null
      const reason = e instanceof CompilerUnavailable ? e.message : String(e)
      setState({ status: 'unavailable', reason })
      return null
    } finally {
      busy.current = false
      if (abort.current === ctrl) abort.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    abort.current?.abort()
    setState((s) => (s.status === 'running' ? { status: 'idle' } : s))
  }, [])
  const clear = useCallback(() => setState({ status: 'idle' }), [])

  useEffect(() => () => abort.current?.abort(), [])
  return { state, run, clear, cancel }
}

/** Whole seconds since a run started, for the "Compiling… 3 s" line. */
export function useElapsed(since: number | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (since === null) return
    setNow(Date.now())
    const h = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(h)
  }, [since])
  return since === null ? 0 : Math.max(0, Math.floor((now - since) / 1000))
}
