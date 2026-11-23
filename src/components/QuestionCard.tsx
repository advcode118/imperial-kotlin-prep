import { useState } from 'react'
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
import { ExceptionLine, Messages, RunOutput, Unavailable } from './RunOutput'

const TYPE_LABEL: Record<Question['type'], string> = {
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
      <ol className="options" type="A">
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
  const { state, run } = useKotlinRunner()
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
      <RunOutput state={state} />
    </>
  )
}

function CaseList({ results }: { results: CaseResult[] }) {
  return (
    <ul className="cases">
      {results.map((r) => (
        <li key={r.name} className={`case case-${r.status}`}>
          <span className="case-mark">{r.status === 'pass' ? '✓' : r.status === 'missing' ? '–' : '✗'}</span>
          <span className="case-body">
            <span className="case-name">{r.name}</span>
            {r.status === 'fail' && (
              <span className="case-detail">
                expected <code>{r.expected}</code> but got <code>{r.actual}</code>
              </span>
            )}
            {r.status === 'error' && (
              <span className="case-detail">
                threw <code>{r.error}</code>
              </span>
            )}
            {r.status === 'missing' && <span className="case-detail">did not run</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

function Write({ q, onAttempt }: { q: WriteQuestion; onAttempt: (ok: boolean) => void }) {
  const [draft, setDraft] = usePersistent<string>(`draft:${q.id}`, q.starter)
  const { state, run, clear } = useKotlinRunner()

  const submit = async () => {
    const result = await run([
      { name: SOLUTION_FILE, text: draft },
      { name: HARNESS_FILE, text: buildHarness(q.tests, q.support) },
    ])
    if (!result) return // compiler unreachable: not an attempt
    const parsed = parseHarness(result.stdout, q.tests)
    onAttempt(!result.hasErrors && parsed.results.every((r) => r.status === 'pass'))
  }

  let report = null
  if (state.status === 'running') report = <div className="out out-quiet">Compiling and running the tests…</div>
  else if (state.status === 'unavailable') report = <Unavailable reason={state.reason} />
  else if (state.status === 'done') {
    const r = state.result
    const errors = r.messages.filter((m) => m.severity === 'ERROR')
    if (errors.length) {
      const mine = errors.filter((m) => m.file === SOLUTION_FILE)
      report = (
        <div className="out out-bad" role="status">
          <p className="out-title">Does not compile</p>
          <Messages messages={mine.length ? mine : errors} file={SOLUTION_FILE} hiddenFile={HARNESS_FILE} />
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

  return (
    <>
      <div className="editor-frame">
        <Editor value={draft} onChange={setDraft} label={`Your answer to ${q.title}`} />
      </div>
      <div className="q-actions">
        <button className="btn" disabled={state.status === 'running'} onClick={submit}>
          {state.status === 'running' ? 'Running…' : 'Run tests'}
        </button>
        {draft !== q.starter && (
          <button
            className="btn-link"
            onClick={() => {
              setDraft(q.starter)
              clear()
            }}
          >
            Reset to starter
          </button>
        )}
        <span className="q-hint">{q.tests.length} hidden tests</span>
      </div>
      {report}
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

export function QuestionCard({
  q,
  number,
  lessonLink,
}: {
  q: Question
  number?: string
  lessonLink?: { href: string; title: string }
}) {
  const { progress, recordQuestion } = useProgress()
  const [attempted, setAttempted] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const status = progress.questions[q.id]
  const onAttempt = (ok: boolean) => {
    setAttempted(true)
    if (ok) setRevealed(true)
    recordQuestion(q.id, ok)
  }
  return (
    <section className="question" id={q.id}>
      <header className="q-head">
        <h3>
          {number && <span className="q-number">{number}</span>}
          {q.title}
        </h3>
        <span className="q-meta">
          {TYPE_LABEL[q.type]}
          {status === 'passed' && (
            <span className="tick" title="Answered correctly">
              {' '}
              ✓
            </span>
          )}
        </span>
      </header>
      <Markdown md={q.prompt} />
      {q.type === 'mc' && <Mc q={q} onAttempt={onAttempt} />}
      {q.type === 'fill' && <Fill q={q} onAttempt={onAttempt} />}
      {q.type === 'predict' && <Predict q={q} onAttempt={onAttempt} />}
      {q.type === 'write' && <Write q={q} onAttempt={onAttempt} />}
      <div className="q-foot">
        <button className="btn-link" onClick={() => setRevealed((r) => !r)}>
          {revealed ? 'Hide solution' : attempted ? 'Show solution' : 'Show solution without attempting'}
        </button>
        {lessonLink && (
          <a className="q-lesson" href={lessonLink.href}>
            Lesson: {lessonLink.title}
          </a>
        )}
      </div>
      {revealed && (
        <div className="solution">
          <Markdown md={solutionMarkdown(q)} />
        </div>
      )}
    </section>
  )
}
