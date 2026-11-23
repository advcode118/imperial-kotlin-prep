import { useMemo, useState } from 'react'
import { Editor } from '../components/Editor'
import { Code, Markdown } from '../components/Markdown'
import { Messages, Unavailable } from '../components/RunOutput'
import { Timer } from '../components/Timer'
import type { PptTest, PrePpt } from '../content/schema'
import type { JUnitResult } from '../lib/kotlin'
import { buildDownloadTestFile, buildTestFile } from '../lib/preppt'
import { useKotlinRunner } from '../lib/runner'
import { usePersistent, useProgress } from '../lib/store'
import { downloadZip } from '../lib/zip'
import { MissingWeek, useWeek } from './common'

type Tab = 'starter' | 'given' | 'tests'

function testSource(t: PptTest) {
  return `@Test\nfun \`${t.name}\`() {\n${t.body
    .split('\n')
    .map((l) => (l ? '    ' + l : l))
    .join('\n')}\n}`
}

function Workspace({ p }: { p: PrePpt }) {
  const { progress, markPart } = useProgress()
  const [code, setCode] = usePersistent<string>(`preppt:${p.id}:code`, p.starter.content)
  const [enabled, setEnabled] = usePersistent<string[]>(`preppt:${p.id}:tests`, [p.tests[0].id])
  const [results, setResults] = usePersistent<Record<string, JUnitResult>>(`preppt:${p.id}:results`, {})
  const [tab, setTab] = useState<Tab>('starter')
  const [shown, setShown] = useState<string | null>(null)
  const { state, run } = useKotlinRunner()
  const on = useMemo(() => new Set(enabled), [enabled])
  const nextLocked = p.tests.find((t) => !on.has(t.id))

  const toggle = (id: string) =>
    setEnabled((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const runTests = async () => {
    const result = await run(
      [
        { name: p.given.name, text: p.given.content },
        { name: p.starter.name, text: code },
        { name: p.testFile.name, text: buildTestFile(p, (t) => on.has(t.id)) },
      ],
      'test',
    )
    if (!result || result.hasErrors) return
    const byName: Record<string, JUnitResult> = {}
    for (const r of result.tests) {
      const t = p.tests.find((x) => x.name === r.name)
      if (t) byName[t.id] = r
    }
    setResults(byName)
    for (const part of p.parts) {
      const ts = p.tests.filter((t) => t.part === part.id)
      const done = ts.length > 0 && ts.every((t) => byName[t.id]?.status === 'OK')
      if (done !== !!progress.parts[part.id]) markPart(part.id, done)
    }
  }

  const compileErrors =
    state.status === 'done' ? state.result.messages.filter((m) => m.severity === 'ERROR') : []
  const ran = p.tests.filter((t) => on.has(t.id) && results[t.id])
  const passing = ran.filter((t) => results[t.id].status === 'OK').length

  return (
    <section className="workspace" id="workspace">
      <h2>Workspace</h2>
      <p>
        Edit <code>{p.starter.name}</code>, enable tests one at a time (the equivalent of uncommenting them),
        and run them. Your code is saved in this browser as you type.
      </p>
      <Timer id={p.id} minutes={p.durationMinutes} />

      <div className="tabs" role="tablist">
        {(
          [
            ['starter', p.starter.name],
            ['given', p.given.name],
            ['tests', p.testFile.name],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className="tab" onClick={() => setTab(id)}>
            {label}
            {id === 'given' && <span className="tab-note"> read-only</span>}
          </button>
        ))}
      </div>
      <div className="editor-frame">
        {tab === 'starter' && <Editor value={code} onChange={setCode} maxHeight="38rem" label={p.starter.name} />}
        {tab === 'given' && <Editor value={p.given.content} readOnly label={p.given.name} />}
        {tab === 'tests' && (
          <Editor
            value={buildTestFile(p, (t) => on.has(t.id))}
            readOnly
            maxHeight="38rem"
            label={p.testFile.name}
          />
        )}
      </div>

      <div className="q-actions">
        <button className="btn" disabled={state.status === 'running' || on.size === 0} onClick={runTests}>
          {state.status === 'running' ? 'Running…' : `Run ${on.size} enabled test${on.size === 1 ? '' : 's'}`}
        </button>
        {nextLocked && (
          <button className="btn btn-quiet" onClick={() => toggle(nextLocked.id)}>
            Enable next test
          </button>
        )}
        <button
          className="btn-link"
          onClick={() =>
            downloadZip(`${p.id}.zip`, [
              { path: `${p.id}/${p.given.path}`, content: p.given.content },
              { path: `${p.id}/${p.starter.path}`, content: p.starter.content },
              { path: `${p.id}/${p.testFile.path}`, content: buildDownloadTestFile(p) },
              ...p.extraFiles.map((f) => ({ path: `${p.id}/${f.path}`, content: f.content })),
            ])
          }
        >
          Download starter project (.zip)
        </button>
        {code !== p.starter.content && (
          <button
            className="btn-link"
            onClick={() => {
              if (window.confirm('Replace your code with the original starter file?')) setCode(p.starter.content)
            }}
          >
            Reset to starter
          </button>
        )}
      </div>

      {state.status === 'running' && <div className="out out-quiet">Compiling and running the tests…</div>}
      {state.status === 'unavailable' && <Unavailable reason={state.reason} />}
      {compileErrors.length > 0 && (
        <div className="out out-bad" role="status">
          <p className="out-title">Does not compile</p>
          <Messages messages={compileErrors} file={p.starter.name} />
          {compileErrors.every((m) => m.file === p.testFile.name) && (
            <p className="out-sub">
              The errors are in the test file: an enabled test calls something your code does not define yet
              (or defines with a different signature). Read the test, then write what it needs.
            </p>
          )}
        </div>
      )}
      {state.status === 'done' && !compileErrors.length && (
        <div className={`out ${passing === ran.length ? 'out-good' : 'out-bad'}`} role="status">
          <p className="out-title">
            {passing} of {ran.length} enabled tests pass
          </p>
        </div>
      )}

      <div className="test-groups">
        {p.parts.map((part) => {
          const ts = p.tests.filter((t) => t.part === part.id)
          return (
            <div key={part.id} className="test-group">
              <p className="test-group-title">
                {part.title}
                {progress.parts[part.id] && <span className="tick"> ✓</span>}
              </p>
              <ul className="cases">
                {ts.map((t) => {
                  const r = on.has(t.id) ? results[t.id] : undefined
                  const cls = !r ? 'missing' : r.status === 'OK' ? 'pass' : 'fail'
                  return (
                    <li key={t.id} className={`case case-${cls} ${on.has(t.id) ? '' : 'case-off'}`}>
                      <input
                        type="checkbox"
                        checked={on.has(t.id)}
                        onChange={() => toggle(t.id)}
                        aria-label={`Enable test: ${t.name}`}
                      />
                      <span className="case-mark">{!r ? '·' : r.status === 'OK' ? '✓' : '✗'}</span>
                      <span className="case-body">
                        <button className="case-name btn-plain" onClick={() => setShown(shown === t.id ? null : t.id)}>
                          {t.name}
                        </button>
                        {r && r.status !== 'OK' && <span className="case-detail">{r.message}</span>}
                        {shown === t.id && <Code code={testSource(t)} />}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function PrePptPage() {
  const week = useWeek()
  if (!week) return <MissingWeek />
  const p = week.content.prePpt
  return (
    <article className="page page-wide">
      <p className="eyebrow">Week {week.number} · pre-PPT exercise</p>
      <h1>{p.title}</h1>
      <p className="lede">{p.subtitle}</p>
      <div className="spec">
        {p.preamble.map((s) => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            <Markdown md={s.md} />
          </section>
        ))}
        {p.parts.map((part) => (
          <section key={part.id} id={part.id}>
            <h2>
              {part.title}
              {part.kind === 'extension' && <span className="source source-advice">Extension</span>}
            </h2>
            <Markdown md={part.spec} />
          </section>
        ))}
        {p.closing.map((s) => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            <Markdown md={s.md} />
          </section>
        ))}
      </div>

      <Workspace p={p} />

      <section className="solutions">
        <h2>Worked solutions</h2>
        <p>
          One per part, each behind its own reveal. Open a solution only after you have a passing version of
          that part, or after the timer has run out.
        </p>
        {p.parts.map((part) => (
          <details key={part.id} className="reveal">
            <summary>Reveal the worked solution for {part.title}</summary>
            <Markdown md={part.solution} />
          </details>
        ))}
      </section>
    </article>
  )
}
