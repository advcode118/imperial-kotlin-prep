import { useMemo, useState } from 'react'
import type {
  FillQuestion,
  McQuestion,
  PredictQuestion,
  Question,
  WriteQuestion,
} from '../content/schema'
import { BLANK, normalizeFragment, normalizeOutput } from '../lib/answers'
import { buildHarness, HARNESS_FILE, parseHarness, SOLUTION_FILE, type CaseResult } from '../lib/harness'
import { useKotlinRunner } from '../lib/runner'
import { usePersistent, useProgress } from '../lib/store'
import { Editor } from './Editor'
import { Code, Markdown } from './Markdown'
import { Diff, ExceptionLine, Messages, RunOutput, Running, Unavailable } from './RunOutput'
import { RUN_KEYS } from './WorkView'

export const TYPE_LABEL: Record<Question['type'], string> = {
  mc: 'Multiple choice',
  fill: 'Fill in the blank',
  predict: 'Predict the output',
  write: 'Write a function',
}

type Verdict = 'none' | 'right' | 'wrong'

function VerdictLine({ verdict, right, wrong }: { verdict: Verdict; right?: string; wrong?: string }) {
  if (verdict === 'none') return null
  return verdict === 'right' ? (
    <p className="verdict verdict-right">✓ {right ?? 'Correct.'}</p>
  ) : (
    <p className="verdict verdict-wrong">{wrong ?? 'Not quite. Try again, or show the solution.'}</p>
  )
}

function Mc({ q, onAttempt }: { q: McQuestion; onAttempt: (ok: boolean) => void }) {
  const [choice, setChoice] = useState<number | null>(null)
  const [verdict, setVerdict] = useState<Verdict>('none')
  return (
    <>
      {q.code && <Code code={q.code} />}
      <ol className="options">
        {q.options.map((o, i) => (
          <li key={i}>
            <label>
              <input
                type="radio"
                name={q.id}
                checked={choice === i}
                onChange={() => {
                  setChoice(i)
                  setVerdict('none')
                }}
              />
              <Markdown md={o} className="inline" />
            </label>
          </li>
        ))}
      </ol>
      <div className="q-actions">
        <button
          className="btn"
          disabled={choice === null}
          onClick={() => {
            const ok = choice === q.answer
            setVerdict(ok ? 'right' : 'wrong')
            onAttempt(ok)
          }}
        >
          Check
        </button>
      </div>
      <VerdictLine verdict={verdict} />
    </>
  )
}

function Fill({ q, onAttempt }: { q: FillQuestion; onAttempt: (ok: boolean) => void }) {
  const [value, setValue] = useState('')
  const [verdict, setVerdict] = useState<Verdict>('none')
  const check = () => {
    const ok = q.accepted.some((a) => normalizeFragment(a) === normalizeFragment(value))
    setVerdict(ok ? 'right' : 'wrong')
    onAttempt(ok)
  }
  return (
    <>
      <Code code={q.code} />
      <form
        className="q-actions"
        onSubmit={(e) => {
          e.preventDefault()
          if (value.trim()) check()
        }}
      >
        <label className="blank-label">
          <span>
            <code>{BLANK}</code> =
          </span>
          <input
            className="blank-input"
            value={value}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            onChange={(e) => {
              setValue(e.target.value)
              setVerdict('none')
            }}
          />
        </label>
        <button className="btn" disabled={!value.trim()}>
          Check
        </button>
      </form>
      <VerdictLine verdict={verdict} />
    </>
  )
}

function Predict({ q, onAttempt }: { q: PredictQuestion; onAttempt: (ok: boolean) => void }) {
  const [value, setValue] = useState('')
  const [verdict, setVerdict] = useState<Verdict>('none')
  const [attempted, setAttempted] = useState(false)
  const { state, run, cancel } = useKotlinRunner()
  const lines = Math.max(2, q.expected.split('\n').length)
  return (
    <>
      <Code code={q.code} />
      <label className="predict-label">
        What does it print?
        <textarea
          className="predict-input"
          rows={lines}
          value={value}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          onChange={(e) => {
            setValue(e.target.value)
            setVerdict('none')
          }}
        />
      </label>
      <div className="q-actions">
        <button
          className="btn"
          disabled={!value.trim()}
          onClick={() => {
            const ok = normalizeOutput(value) === normalizeOutput(q.expected)
            setVerdict(ok ? 'right' : 'wrong')
            setAttempted(true)
            onAttempt(ok)
          }}
        >
          Check
        </button>
        {attempted && (
          <button
            className="btn-link"
            disabled={state.status === 'running'}
            onClick={() => run([{ name: 'Main.kt', text: q.code }])}
          >
            Run it to see
          </button>
        )}
      </div>
      <VerdictLine verdict={verdict} wrong="That is not what it prints. Trace it again, or run it to see." />
      <RunOutput state={state} onCancel={cancel} />
    </>
  )
}

function CaseList({ results }: { results: CaseResult[] }) {
  return (
    <ul className="cases">
      {results.map((r) => (
        <li key={r.name} className={`case case-${r.status}`}>
          <span className="case-mark" aria-hidden="true">
            {r.status === 'pass' ? '✓' : r.status === 'missing' ? '–' : '✗'}
          </span>
          <span className="case-body">
            <span className="case-name">
              <span className="sr-only">{r.status === 'pass' ? 'Passed: ' : r.status === 'missing' ? 'Did not run: ' : 'Failed: '}</span>
              {r.name}
            </span>
            {r.status === 'fail' && <Diff expected={r.expected ?? ''} actual={r.actual ?? ''} />}
            {r.status === 'error' && (
              <span className="case-detail">
                <span className="case-threw">Threw</span> <code>{r.error}</code>
              </span>
            )}
            {r.status === 'missing' && <span className="case-detail">Did not run</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Everything a write-a-function question needs, whichever layout shows it. */
export function useWriteDrill(q: WriteQuestion, onAttempt: (ok: boolean) => void) {
  const [draft, setDraft] = usePersistent<string>(`draft:${q.id}`, q.starter)
  const { state, run, clear, cancel } = useKotlinRunner()
  const [goto, setGoto] = useState<{ line: number; col: number; n: number }>()

  const submit = async () => {
    const result = await run([
      { name: SOLUTION_FILE, text: draft },
      { name: HARNESS_FILE, text: buildHarness(q.tests, q.support) },
    ])
    if (!result) return // compiler unreachable or cancelled: not an attempt
    const parsed = parseHarness(result.stdout, q.tests)
    onAttempt(!result.hasErrors && parsed.results.every((r) => r.status === 'pass'))
  }
  const reset = () => {
    setDraft(q.starter)
    clear()
  }

  const diagnostics = useMemo(
    () => (state.status === 'done' ? state.result.messages.filter((m) => m.file === SOLUTION_FILE) : []),
    [state],
  )

  let report = null
  let summary: string | undefined
  if (state.status === 'running')
    report = <Running since={state.since} what="Compiling and running the tests…" onCancel={cancel} />
  else if (state.status === 'unavailable') report = <Unavailable reason={state.reason} />
  else if (state.status === 'done') {
    const r = state.result
    const errors = r.messages.filter((m) => m.severity === 'ERROR')
    if (errors.length) {
      const mine = errors.filter((m) => m.file === SOLUTION_FILE)
      summary = 'error'
      report = (
        <div className="out out-bad" role="status">
          <p className="out-title">Does not compile</p>
          <Messages
            messages={mine.length ? mine : errors}
            file={SOLUTION_FILE}
            hiddenFile={HARNESS_FILE}
            onGoto={(m) => setGoto((g) => ({ line: m.line, col: m.col, n: (g?.n ?? 0) + 1 }))}
          />
          {!mine.length && (
            <p className="out-sub">
              Your code compiles on its own, but the tests cannot call it. Check the function name, parameter
              types and return type against the question, and do not define your own <code>main</code>.
            </p>
          )}
        </div>
      )
    } else {
      const parsed = parseHarness(r.stdout, q.tests)
      const passed = parsed.results.filter((c) => c.status === 'pass').length
      const all = passed === q.tests.length
      summary = `${passed}/${q.tests.length}`
      report = (
        <div className={`out ${all ? 'out-good' : 'out-bad'}`} role="status">
          <p className="out-title">
            {all ? '✓ ' : ''}
            {passed} of {q.tests.length} tests pass
          </p>
          <CaseList results={parsed.results} />
          {!parsed.finished && (
            <p className="out-sub">The run stopped before all tests finished (time limit or a crash).</p>
          )}
          <ExceptionLine result={r} />
          {parsed.output && (
            <>
              <p className="out-label">Your program’s own output</p>
              <pre className="out-text">{parsed.output}</pre>
            </>
          )}
        </div>
      )
    }
  }

  return {
    draft,
    setDraft,
    running: state.status === 'running',
    changed: draft !== q.starter,
    submit,
    reset,
    cancel,
    report,
    summary,
    diagnostics,
    goto,
  }
}

export type WriteDrill = ReturnType<typeof useWriteDrill>

export function WriteEditor({ q, w }: { q: WriteQuestion; w: WriteDrill }) {
  return (
    <div className="editor-box">
      <Editor
        fill
        value={w.draft}
        onChange={w.setDraft}
        onRun={w.submit}
        diagnostics={w.diagnostics}
        goto={w.goto}
        label={`Your answer to ${q.title}`}
      />
    </div>
  )
}

export function WriteActions({ q, w, hint = true }: { q: WriteQuestion; w: WriteDrill; hint?: boolean }) {
  return (
    <div className="q-actions">
      <button className="btn" disabled={w.running} onClick={w.submit}>
        {w.running ? 'Running…' : 'Run tests'}
        {!w.running && hint && <kbd className="btn-kbd">{RUN_KEYS}</kbd>}
      </button>
      {w.changed && !w.running && (
        <button
          className="btn-link"
          onClick={() => {
            if (window.confirm('Replace your code with the starter?')) w.reset()
          }}
        >
          Reset to starter
        </button>
      )}
      <span className="q-hint">
        {q.tests.length} hidden tests{w.changed ? ' · draft saved' : ''}
      </span>
    </div>
  )
}

function Write({ q, onAttempt }: { q: WriteQuestion; onAttempt: (ok: boolean) => void }) {
  const w = useWriteDrill(q, onAttempt)
  return (
    <>
      <WriteEditor q={q} w={w} />
      <WriteActions q={q} w={w} />
      {w.report}
    </>
  )
}

function solutionMarkdown(q: Question): string {
  switch (q.type) {
    case 'mc':
      return `**Answer: ${String.fromCharCode(65 + q.answer)}.** ${q.explanation}`
    case 'fill':
      return `**Answer:** \`${q.accepted[0]}\`\n\n${q.explanation}`
    case 'predict':
      return `**Output:**\n\n\`\`\`text\n${q.expected}\n\`\`\`\n\n${q.explanation}`
    case 'write':
      return `**Reference solution:**\n\n\`\`\`kotlin\n${q.solution.trim()}\n\`\`\`\n\n${q.explanation}`
  }
}

export const STATUS_LABEL = { passed: 'Answered correctly', tried: 'Attempted', none: 'Not attempted' } as const

/** Small text chip: status is always words, never colour alone. */
export function StatusChip({ status }: { status: 'passed' | 'tried' | undefined }) {
  if (!status) return null
  return <span className={`chip chip-${status}`}>{status === 'passed' ? '✓ Correct' : 'Attempted'}</span>
}

export function SolutionReveal({
  q,
  attempted,
  revealed,
  onToggle,
}: {
  q: Question
  attempted: boolean
  revealed: boolean
  onToggle: () => void
}) {
  return (
    <>
      <button className="btn-link" aria-expanded={revealed} onClick={onToggle}>
        {revealed ? 'Hide solution' : attempted ? 'Show solution' : 'Show solution without attempting'}
      </button>
      {revealed && (
        <div className="solution">
          <Markdown md={solutionMarkdown(q)} />
        </div>
      )}
    </>
  )
}

export function QuestionCard({
  q,
  number,
  lessonLink,
  openLink,
  heading = 'h3',
}: {
  q: Question
  number?: string
  lessonLink?: { href: string; title: string }
  /** Link to the one-at-a-time work view, shown in list mode. */
  openLink?: string
  heading?: 'h2' | 'h3'
}) {
  const { progress, recordQuestion } = useProgress()
  const [attempted, setAttempted] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const status = progress.questions[q.id]
  const H = heading
  const onAttempt = (ok: boolean) => {
    setAttempted(true)
    if (ok) setRevealed(true)
    recordQuestion(q.id, ok)
  }
  return (
    <section className="question" id={q.id} aria-labelledby={`${q.id}-title`}>
      <header className="q-head">
        <H id={`${q.id}-title`}>
          {number && <span className="q-number">{number}</span>}
          {openLink ? <a href={openLink}>{q.title}</a> : q.title}
        </H>
        <span className="q-meta">
          {TYPE_LABEL[q.type]}
          <StatusChip status={status} />
        </span>
      </header>
      <Markdown md={q.prompt} />
      {q.type === 'mc' && <Mc q={q} onAttempt={onAttempt} />}
      {q.type === 'fill' && <Fill q={q} onAttempt={onAttempt} />}
      {q.type === 'predict' && <Predict q={q} onAttempt={onAttempt} />}
      {q.type === 'write' && <Write q={q} onAttempt={onAttempt} />}
      <div className="q-foot">
        <SolutionReveal q={q} attempted={attempted} revealed={revealed} onToggle={() => setRevealed((r) => !r)} />
        {lessonLink && (
          <a className="q-lesson" href={lessonLink.href}>
            Lesson: {lessonLink.title}
          </a>
        )}
      </div>
    </section>
  )
}
