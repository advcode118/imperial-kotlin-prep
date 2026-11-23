import { useEffect, useMemo, useState } from 'react'
import { Editor } from '../components/Editor'
import { Code, Markdown } from '../components/Markdown'
import { Pager } from '../components/Pager'
import { Messages, Running, Unavailable } from '../components/RunOutput'
import { Timer } from '../components/Timer'
import { RUN_KEYS, useWorkTab, WorkView } from '../components/WorkView'
import type { PptTest, PrePpt } from '../content/schema'
import type { JUnitResult } from '../lib/kotlin'
import { buildDownloadTestFile, buildTestFile } from '../lib/preppt'
import { useKotlinRunner } from '../lib/runner'
import { usePersistent, useProgress } from '../lib/store'
import { downloadZip } from '../lib/zip'
import { MissingWeek, useWeek, type LoadedWeek } from './common'

type FileTab = 'starter' | 'given' | 'tests'

function testSource(t: PptTest) {
  return `@Test\nfun \`${t.name}\`() {\n${t.body
    .split('\n')
    .map((l) => (l ? '    ' + l : l))
    .join('\n')}\n}`
}

/** "Part 1: URLs" -> "URLs"; "Extension: filters" -> "Filters". */
const shortTitle = (title: string) => {
  const t = title.includes(':') ? title.slice(title.indexOf(':') + 1).trim() : title
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function Workbench({ p, week }: { p: PrePpt; week: LoadedWeek }) {
  const { progress, markPart } = useProgress()
  const [code, setCode] = usePersistent<string>(`preppt:${p.id}:code`, p.starter.content)
  const [enabled, setEnabled] = usePersistent<string[]>(`preppt:${p.id}:tests`, [p.tests[0].id])
  const [results, setResults] = usePersistent<Record<string, JUnitResult>>(`preppt:${p.id}:results`, {})
  const [section, setSection] = usePersistent<string>(`preppt:${p.id}:section`, 'brief')
  const [focus, setFocus] = usePersistent<boolean>('ui:focus', false)
  const [file, setFile] = useState<FileTab>('starter')
  const [shown, setShown] = useState<string | null>(null)
  const [allTests, setAllTests] = useState(false)
  const [goto, setGoto] = useState<{ line: number; col: number; n: number }>()
  const [tab, setTab] = useWorkTab()
  const { state, run, cancel } = useKotlinRunner()
  const on = useMemo(() => new Set(enabled), [enabled])
  const nextLocked = p.tests.find((t) => !on.has(t.id))
  const part = p.parts.find((x) => x.id === section)
  const running = state.status === 'running'

  const toggle = (id: string) =>
    setEnabled((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const runTests = async () => {
    if (on.size === 0) return
    setTab('output')
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
    for (const pt of p.parts) {
      const ts = p.tests.filter((t) => t.part === pt.id)
      const done = ts.length > 0 && ts.every((t) => byName[t.id]?.status === 'OK')
      if (done !== !!progress.parts[pt.id]) markPart(pt.id, done)
    }
  }

  // Esc leaves focus mode, after a confirm so a stray key press cannot break concentration.
  useEffect(() => {
    if (!focus) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('.modal')) return
      if ((e.target as HTMLElement | null)?.closest?.('.cm-editor')) return
      if (window.confirm('Leave focus mode? The timer keeps running.')) setFocus(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, setFocus])

  const messages = state.status === 'done' ? state.result.messages : []
  const compileErrors = messages.filter((m) => m.severity === 'ERROR')
  const diagnostics = useMemo(() => messages.filter((m) => m.file === p.starter.name), [messages, p.starter.name])
  const ran = p.tests.filter((t) => on.has(t.id) && results[t.id])
  const passing = ran.filter((t) => results[t.id].status === 'OK').length
  const visibleParts = part && !allTests ? [part] : p.parts

  const sections: [string, string, boolean][] = [
    ['brief', 'Brief', false],
    ...p.parts.map((x, i): [string, string, boolean] => [x.id, `${i + 1}. ${shortTitle(x.title)}`, !!progress.parts[x.id]]),
    ['assess', 'Assessment', false],
  ]

  return (
    <div className="workbench" data-focus={focus || undefined}>
      <header className="levelbar">
        <div className="levelbar-title">
          <h1>
            {p.title} <span className="levelbar-sub">pre-PPT exercise</span>
          </h1>
        </div>
        <Timer id={p.id} minutes={p.durationMinutes} />
        <div className="levelbar-actions">
          {focus ? (
            <button
              className="btn btn-quiet btn-small"
              onClick={() => {
                if (window.confirm('Leave focus mode? The timer keeps running.')) setFocus(false)
              }}
            >
              Exit focus mode <kbd className="btn-kbd">Esc</kbd>
            </button>
          ) : (
            <button className="btn btn-quiet btn-small" onClick={() => setFocus(true)} title="Hide the navigation and show only the spec, your code and the timer">
              Focus mode
            </button>
          )}
        </div>
      </header>
      <WorkView
        id="preppt"
        tab={tab}
        onTab={setTab}
        outputBadge={ran.length ? `${passing}/${ran.length}` : undefined}
        instructions={
          <>
            <div className="tabs" role="tablist" aria-label="Specification">
              {sections.map(([id, label, done]) => (
                <button
                  key={id}
                  role="tab"
                  id={`spec-tab-${id}`}
                  aria-selected={section === id}
                  aria-controls="spec-panel"
                  className="tab"
                  onClick={() => setSection(id)}
                >
                  {label}
                  {done && (
                    <span className="tick">
                      {' '}
                      <span aria-hidden="true">✓</span>
                      <span className="sr-only">all tests passing</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="wv-scroll spec" id="spec-panel" role="tabpanel" aria-labelledby={`spec-tab-${section}`} tabIndex={0} key={section}>
              {section === 'brief' && (
                <>
                  <p className="lede">{p.subtitle}</p>
                  {p.preamble.map((s) => (
                    <section key={s.title}>
                      <h2>{s.title}</h2>
                      <Markdown md={s.md} />
                    </section>
                  ))}
                  <section>
                    <h2>Working here</h2>
                    <p>
                      Each part of the spec has its own tab above. Edit <code>{p.starter.name}</code> on the
                      right, enable that part’s tests one at a time (the equivalent of uncommenting them) and
                      run them with <kbd>{RUN_KEYS}</kbd>. Your code is saved in this browser as you type.
                      For a practice sitting, start the timer and switch on focus mode.
                    </p>
                    <p>
                      <button className="btn btn-quiet btn-small" onClick={() => setSection(p.parts[0].id)}>
                        Go to {p.parts[0].title} →
                      </button>
                    </p>
                  </section>
                </>
              )}
              {part && (
                <section>
                  <h2>
                    {part.title}
                    {part.kind === 'extension' && <span className="source source-advice">Extension</span>}
                  </h2>
                  <Markdown md={part.spec} />
                  <details className="reveal">
                    <summary>Reveal the worked solution for {part.title}</summary>
                    <p className="small">
                      Open this only after you have a passing version of the part, or after the timer has run
                      out.
                    </p>
                    <Markdown md={part.solution} />
                  </details>
                  <nav className="pager" aria-label="Previous and next part">
                    {(() => {
                      const i = sections.findIndex(([id]) => id === section)
                      const link = (s: [string, string, boolean] | undefined, dir: string) =>
                        s ? (
                          <button className="pager-link btn-plain" onClick={() => setSection(s[0])}>
                            <span className="pager-dir">{dir}</span>
                            <span className="pager-title">{s[1]}</span>
                          </button>
                        ) : (
                          <span />
                        )
                      return (
                        <>
                          {link(sections[i - 1], 'Previous part')}
                          {link(sections[i + 1], 'Next part')}
                        </>
                      )
                    })()}
                  </nav>
                </section>
              )}
              {section === 'assess' && (
                <>
                  {p.closing.map((s) => (
                    <section key={s.title}>
                      <h2>{s.title}</h2>
                      <Markdown md={s.md} />
                    </section>
                  ))}
                  <section>
                    <h2>Worked solutions</h2>
                    <p>
                      Each part’s tab ends with its worked solution behind a reveal. Open one only after you
                      have a passing version of that part, or after the timer has run out.
                    </p>
                  </section>
                  {!focus && <Pager week={week} />}
                </>
              )}
            </div>
          </>
        }
        code={
          <>
            <div className="pane-bar">
              <div className="tabs tabs-files" role="tablist" aria-label="Files">
                {(
                  [
                    ['starter', p.starter.name],
                    ['given', p.given.name],
                    ['tests', p.testFile.name],
                  ] as [FileTab, string][]
                ).map(([id, label]) => (
                  <button key={id} role="tab" aria-selected={file === id} className="tab" onClick={() => setFile(id)}>
                    {label}
                    {id !== 'starter' && <span className="tab-note"> read-only</span>}
                  </button>
                ))}
              </div>
              <div className="q-actions">
                <button className="btn" disabled={running || on.size === 0} onClick={runTests}>
                  {running ? 'Running…' : `Run ${on.size} test${on.size === 1 ? '' : 's'}`}
                  {!running && <kbd className="btn-kbd">{RUN_KEYS}</kbd>}
                </button>
              </div>
            </div>
            <div className="editor-box editor-box-tall">
              {file === 'starter' && (
                <Editor
                  fill
                  value={code}
                  onChange={setCode}
                  onRun={runTests}
                  diagnostics={diagnostics}
                  goto={goto}
                  label={p.starter.name}
                />
              )}
              {file === 'given' && <Editor fill value={p.given.content} readOnly onRun={runTests} label={p.given.name} />}
              {file === 'tests' && (
                <Editor fill value={buildTestFile(p, (t) => on.has(t.id))} readOnly onRun={runTests} label={p.testFile.name} />
              )}
            </div>
            <div className="pane-foot">
              <span className="q-hint">Saved in this browser as you type.</span>
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
          </>
        }
        output={
          <div className="wv-scroll">
            <div className="pane-head">
              <h2 className="pane-title">
                Tests{part && !allTests ? `: ${shortTitle(part.title)}` : ''}
              </h2>
              <span className="q-hint">
                {on.size} of {p.tests.length} enabled
              </span>
              {nextLocked && (
                <button className="btn btn-quiet btn-small" onClick={() => toggle(nextLocked.id)}>
                  Enable next test
                </button>
              )}
              {part && (
                <label className="check-inline">
                  <input type="checkbox" checked={allTests} onChange={(e) => setAllTests(e.target.checked)} /> Show all
                  parts
                </label>
              )}
            </div>
            {state.status === 'running' && (
              <Running since={state.since} what="Compiling and running the enabled tests…" onCancel={cancel} />
            )}
            {state.status === 'unavailable' && <Unavailable reason={state.reason} />}
            {compileErrors.length > 0 && (
              <div className="out out-bad" role="status">
                <p className="out-title">Does not compile</p>
                <Messages
                  messages={compileErrors}
                  file={p.starter.name}
                  onGoto={(m) => {
                    setFile('starter')
                    setTab('code')
                    setGoto((g) => ({ line: m.line, col: m.col, n: (g?.n ?? 0) + 1 }))
                  }}
                />
                {compileErrors.every((m) => m.file === p.testFile.name) && (
                  <p className="out-sub">
                    The errors are in the test file: an enabled test calls something your code does not define
                    yet (or defines with a different signature). Read the test, then write what it needs.
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
              {visibleParts.map((pt) => {
                const ts = p.tests.filter((t) => t.part === pt.id)
                return (
                  <div key={pt.id} className="test-group">
                    {visibleParts.length > 1 && (
                      <h3 className="test-group-title">
                        {pt.title}
                        {progress.parts[pt.id] && (
                          <span className="tick">
                            {' '}
                            <span aria-hidden="true">✓</span>
                            <span className="sr-only">all tests passing</span>
                          </span>
                        )}
                      </h3>
                    )}
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
                            <span className="case-mark" aria-hidden="true">
                              {!r ? '·' : r.status === 'OK' ? '✓' : '✗'}
                            </span>
                            <span className="case-body">
                              <button
                                className="case-name btn-plain"
                                aria-expanded={shown === t.id}
                                title="Show the source of this test"
                                onClick={() => setShown(shown === t.id ? null : t.id)}
                              >
                                <span className="sr-only">
                                  {!r ? (on.has(t.id) ? 'Not run yet: ' : 'Disabled: ') : r.status === 'OK' ? 'Passed: ' : 'Failed: '}
                                </span>
                                {t.name}
                              </button>
                              {r && r.status !== 'OK' && <span className="case-detail case-message">{r.message}</span>}
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
          </div>
        }
        runBar={
          <button className="btn btn-run" disabled={running || on.size === 0} onClick={runTests}>
            {running ? 'Running…' : `Run ${on.size} enabled test${on.size === 1 ? '' : 's'}`}
          </button>
        }
      />
    </div>
  )
}

export function PrePptPage() {
  const week = useWeek()
  if (!week) return <MissingWeek />
  return <Workbench p={week.content.prePpt} week={week} />
}
