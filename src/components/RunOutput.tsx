import type { CompilerMessage, RunResult } from '../lib/kotlin'
import { useElapsed, type RunState } from '../lib/runner'

export function Unavailable({ reason }: { reason: string }) {
  return (
    <div className="out out-warn" role="status">
      <p className="out-title">Couldn’t reach the Kotlin compiler – try again.</p>
      <p className="out-sub">
        Nothing has been marked. The code runs on JetBrains’ public playground server, which needs a network
        connection ({reason}).
      </p>
    </div>
  )
}

/** Calm, explicit progress for the 2–8 seconds a remote compile takes. */
export function Running({ since, what, onCancel }: { since: number; what: string; onCancel?: () => void }) {
  const s = useElapsed(since)
  return (
    <div className="out out-running" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>
        {what}
        <span className="out-elapsed"> {s > 0 ? `${s} s` : ''}</span>
        {s >= 8 && <span className="out-sub"> The compiler server is slow just now; it usually answers within ten seconds.</span>}
      </span>
      {onCancel && (
        <button className="btn-link" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  )
}

export function Messages({
  messages,
  file,
  hiddenFile,
  onGoto,
}: {
  messages: CompilerMessage[]
  /** Only show line numbers for this file. */
  file?: string
  hiddenFile?: string
  /** If given, messages in `file` become buttons that move the cursor to the line. */
  onGoto?: (m: CompilerMessage) => void
}) {
  if (!messages.length) return null
  return (
    <ul className="msgs">
      {messages.map((m, i) => {
        const hidden = hiddenFile !== undefined && m.file === hiddenFile
        const where = hidden
          ? 'in the hidden tests'
          : `${file && m.file !== file ? m.file + ' ' : ''}line ${m.line}:${m.col}`
        const linked = onGoto && !hidden && (!file || m.file === file)
        return (
          <li key={i} className={m.severity === 'ERROR' ? 'msg-error' : 'msg-warning'}>
            {linked ? (
              <button className="msg-where msg-goto" onClick={() => onGoto(m)} title="Go to this line in the editor">
                {where}
              </button>
            ) : (
              <span className="msg-where">{where}</span>
            )}
            <span className="msg-text">
              {m.severity === 'WARNING' ? 'warning: ' : ''}
              {m.message}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function ExceptionLine({ result }: { result: RunResult }) {
  const ex = result.exception
  if (!ex) return null
  return (
    <p className="out-exception">
      Exception: <code>{ex.name}</code>
      {ex.message ? `: ${ex.message}` : ''}
      {ex.line ? ` (line ${ex.line})` : ''}
    </p>
  )
}

/**
 * Expected and actual on two aligned lines, with the part that differs marked.
 * (Common prefix and suffix are left plain, so the eye lands on the difference.)
 */
export function Diff({ expected, actual }: { expected: string; actual: string }) {
  let a = 0
  while (a < expected.length && a < actual.length && expected[a] === actual[a]) a++
  let b = 0
  while (b < expected.length - a && b < actual.length - a && expected[expected.length - 1 - b] === actual[actual.length - 1 - b]) b++
  const row = (label: string, s: string, cls: string) => (
    <div className={`diff-row ${cls}`}>
      <span className="diff-label">{label}</span>
      <code className="diff-value">
        {s.slice(0, a)}
        {s.length - b > a && <mark>{s.slice(a, s.length - b)}</mark>}
        {s.slice(s.length - b)}
        {s === '' && <span className="diff-empty">(empty)</span>}
      </code>
    </div>
  )
  return (
    <div className="diff">
      {row('Expected', expected, 'diff-expected')}
      {row('Got', actual, 'diff-actual')}
    </div>
  )
}

/** Output panel for a plain "Run". */
export function RunOutput({ state, onCancel }: { state: RunState; onCancel?: () => void }) {
  if (state.status === 'idle') return null
  if (state.status === 'running') return <Running since={state.since} what="Compiling and running…" onCancel={onCancel} />
  if (state.status === 'unavailable') return <Unavailable reason={state.reason} />
  const r = state.result
  const errors = r.messages.filter((m) => m.severity === 'ERROR')
  const warnings = r.messages.filter((m) => m.severity !== 'ERROR')
  return (
    <div className={`out ${errors.length || r.exception ? 'out-bad' : ''}`} role="status">
      {errors.length > 0 && <p className="out-title">Does not compile</p>}
      <Messages messages={errors.length ? errors : warnings} />
      {!errors.length && (
        <>
          <p className="out-label">Output</p>
          <pre className="out-text">{r.stdout || (r.exception ? '' : '(no output)')}</pre>
          {r.stderr && <pre className="out-text out-stderr">{r.stderr}</pre>}
          <ExceptionLine result={r} />
        </>
      )}
    </div>
  )
}
