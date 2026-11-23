import { useCallback, useRef, useState } from 'react'
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
  | { status: 'running' }
  | { status: 'done'; result: RunResult }
  | { status: 'unavailable'; reason: string }

/** Run Kotlin with a busy flag; ignores clicks while a run is in flight. */
export function useKotlinRunner() {
  const [state, setState] = useState<RunState>({ status: 'idle' })
  const busy = useRef(false)
  const run = useCallback(async (files: SourceFile[], mode: 'run' | 'test' = 'run') => {
    if (busy.current) return null
    busy.current = true
    setState({ status: 'running' })
    try {
      const result = await schedule(() => execute(files, mode))
      setState({ status: 'done', result })
      return result
    } catch (e) {
      const reason = e instanceof CompilerUnavailable ? e.message : String(e)
      setState({ status: 'unavailable', reason })
      return null
    } finally {
      busy.current = false
    }
  }, [])
  const clear = useCallback(() => setState({ status: 'idle' }), [])
  return { state, run, clear }
}
