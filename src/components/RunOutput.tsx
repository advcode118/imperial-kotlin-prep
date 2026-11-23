import type { CompilerMessage, RunResult } from '../lib/kotlin'
import type { RunState } from '../lib/runner'

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

export function Messages({
  messages,
  file,
  hiddenFile,
}: {
  messages: CompilerMessage[]
  /** Only show line numbers for this file. */
  file?: string
  hiddenFile?: string
}) {
  if (!messages.length) return null
  return (
    <ul className="msgs">
      {messages.map((m, i) => {
        const hidden = hiddenFile !== undefined && m.file === hiddenFile
        return (
          <li key={i} className={m.severity === 'ERROR' ? 'msg-error' : 'msg-warning'}>
            <span className="msg-where">
              {hidden
                ? 'in the hidden tests'
                : `${file && m.file !== file ? m.file + ' ' : ''}line ${m.line}:${m.col}`}
            </span>
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

/** Output panel for a plain "Run". */
export function RunOutput({ state }: { state: RunState }) {
  if (state.status === 'idle') return null
  if (state.status === 'running') return <div className="out out-quiet">Compiling and running…</div>
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
