import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { Markdown } from '../components/Markdown'
import { Pager } from '../components/Pager'
import {
  QuestionCard,
  SolutionReveal,
  StatusChip,
  STATUS_LABEL,
  TYPE_LABEL,
  useWriteDrill,
  WriteActions,
  WriteEditor,
} from '../components/QuestionCard'
import { useWorkTab, WorkView } from '../components/WorkView'
import { drillsAt, lessonsOf, paths } from '../content'
import { LEVELS, type Drill, type Level, type WriteQuestion } from '../content/schema'
import { firstOpenDrill } from '../lib/nav'
import { peek, poke, useProgress } from '../lib/store'
import { MissingWeek, useWeek, type LoadedWeek } from './common'

export function DrillsIndexPage() {
  const week = useWeek()
  const { progress } = useProgress()
  if (!week) return <MissingWeek />
  const total = week.content.drills.length
  const passed = week.content.drills.filter((d) => progress.questions[d.id] === 'passed').length
  return (
    <article className="page">
      <p className="eyebrow">Week {week.number}</p>
      <h1>Drill book</h1>
      <p className="lede">
        {total} auto-checked questions in four levels. {passed} answered correctly so far.
      </p>
      <p>
        Four kinds of question appear: predict the output, fill in the blank, multiple choice, and write a
        function. Write-a-function answers are compiled and run against hidden tests on JetBrains’ Kotlin
        playground server, so you need a network connection for those. Every question has a worked solution;
        try before you look.
      </p>
      <p>
        Each level opens one question at a time, with the question on the left and your code on the right. Use
        the numbered strip to move around, or switch to <em>All questions</em> to see the whole level as a list.
      </p>
      <table className="plain levels">
        <tbody>
          {LEVELS.map((lv) => {
            const ds = drillsAt(week, lv.id)
            const done = ds.filter((d) => progress.questions[d.id] === 'passed').length
            return (
              <tr key={lv.id}>
                <td className="nowrap">
                  <Link to={paths.level(week.id, lv.id)}>{lv.title}</Link>
                </td>
                <td>{lv.blurb}</td>
                <td className="nowrap status">
                  {done} of {ds.length}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <footer className="lesson-foot">
        <Pager week={week} />
      </footer>
    </article>
  )
}

/** The numbered strip: one small link per question. Status is in the shape and the label, not colour alone. */
function Navigator({ week, level, drills, current }: { week: LoadedWeek; level: number; drills: Drill[]; current?: string }) {
  const { progress } = useProgress()
  return (
    <nav className="qnav" aria-label="Questions in this level">
      <ol>
        {drills.map((d, n) => {
          const st = progress.questions[d.id]
          return (
            <li key={d.id}>
              <Link
                to={paths.drill(week.id, d)}
                className={`qdot qdot-${st ?? 'none'}`}
                aria-current={d.id === current ? 'page' : undefined}
                aria-label={`${level}.${n + 1} ${d.title}: ${STATUS_LABEL[st ?? 'none']}`}
                title={`${level}.${n + 1} ${d.title} · ${STATUS_LABEL[st ?? 'none']}`}
              >
                {st === 'passed' ? '✓' : n + 1}
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function LevelBar({
  week,
  lv,
  index,
  drills,
  current,
  list,
}: {
  week: LoadedWeek
  lv: (typeof LEVELS)[number]
  index: number
  drills: Drill[]
  current?: Drill
  list: boolean
}) {
  const { progress } = useProgress()
  const open = firstOpenDrill(week, lv.id, progress)
  const allDone = progress.questions[open.id] === 'passed'
  return (
    <header className="levelbar">
      <div className="levelbar-title">
        <h1>
          {lv.title} <span className="levelbar-sub">drills · level {index + 1} of {LEVELS.length}</span>
        </h1>
      </div>
      {!list && <Navigator week={week} level={index + 1} drills={drills} current={current?.id} />}
      <div className="levelbar-actions">
        {!allDone && open.id !== current?.id && (
          <Link className="btn btn-quiet btn-small" to={paths.drill(week.id, open)}>
            First unanswered
          </Link>
        )}
        <div className="seg" role="group" aria-label="View">
          <Link
            to={paths.drill(week.id, current ?? open)}
            aria-current={!list ? 'true' : undefined}
            className="seg-item"
          >
            One at a time
          </Link>
          <Link to={`${paths.level(week.id, lv.id)}?view=list`} aria-current={list ? 'true' : undefined} className="seg-item">
            All questions
          </Link>
        </div>
      </div>
    </header>
  )
}

function WriteWork({
  q,
  number,
  lesson,
  pager,
}: {
  q: WriteQuestion
  number: string
  lesson?: { href: string; title: string }
  pager: React.ReactNode
}) {
  const { progress, recordQuestion } = useProgress()
  const [attempted, setAttempted] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [tab, setTab] = useWorkTab()
  const w = useWriteDrill(q, (ok) => {
    setAttempted(true)
    if (ok) setRevealed(true)
    recordQuestion(q.id, ok)
  })
  const run = () => {
    setTab('output')
    return w.submit()
  }
  const wr = { ...w, submit: run }
  return (
    <WorkView
      id="drill"
      tab={tab}
      onTab={setTab}
      outputBadge={w.summary}
      instructions={
        <div className="wv-scroll">
          <p className="q-kicker">
            <span className="q-number">{number}</span> {TYPE_LABEL.write}
            <StatusChip status={progress.questions[q.id]} />
          </p>
          <h2 className="q-title">{q.title}</h2>
          <Markdown md={q.prompt} />
          <div className="q-foot">
            <SolutionReveal q={q} attempted={attempted} revealed={revealed} onToggle={() => setRevealed((r) => !r)} />
            {lesson && (
              <a className="q-lesson" href={lesson.href}>
                Lesson: {lesson.title}
              </a>
            )}
          </div>
          {pager}
        </div>
      }
      code={
        <>
          <div className="pane-bar">
            <span className="pane-file">Solution.kt</span>
            <WriteActions q={q} w={wr} />
          </div>
          <WriteEditor q={q} w={wr} />
        </>
      }
      output={
        <div className="wv-scroll">
          <h2 className="pane-title">Test results</h2>
          {w.report ?? (
            <p className="out-idle">
              Run the tests to see each case here, with the expected and actual values for any that fail.
            </p>
          )}
        </div>
      }
      runBar={
        <button className="btn btn-run" disabled={w.running} onClick={run}>
          {w.running ? 'Running…' : 'Run tests'}
        </button>
      }
    />
  )
}

export function DrillLevelPage() {
  const week = useWeek()
  const { level } = useParams()
  const [params] = useSearchParams()
  const { progress } = useProgress()
  const target = params.get('q')
  const list = params.get('view') === 'list'
  const lv = LEVELS.find((l) => l.id === level)

  // Remember the question last opened in each level, so the sidebar link comes back to it.
  useEffect(() => {
    if (target && lv) poke(`drill-at:${lv.id}`, target)
  }, [target, lv])

  if (!week || !lv) return <MissingWeek />
  const ds = drillsAt(week, lv.id as Level)
  const lessons = lessonsOf(week)
  const i = LEVELS.indexOf(lv)
  const lessonLink = (d: Drill) => {
    const l = lessons.find((x) => x.id === d.lesson)
    return l ? { href: `#${paths.lesson(week.id, l.id)}`, title: l.title } : undefined
  }

  if (list) {
    return (
      <article className="page page-wide">
        <LevelBar week={week} lv={lv} index={i} drills={ds} list />
        <p className="lede">{lv.blurb}</p>
        {ds.map((d, n) => (
          <QuestionCard
            key={d.id}
            q={d}
            heading="h2"
            number={`${i + 1}.${n + 1}`}
            lessonLink={lessonLink(d)}
            openLink={`#${paths.drill(week.id, d)}`}
          />
        ))}
        <footer className="lesson-foot">
          <nav className="pager" aria-label="Previous and next level">
            {LEVELS[i - 1] ? (
              <Link className="pager-link pager-prev" to={`${paths.level(week.id, LEVELS[i - 1].id)}?view=list`}>
                <span className="pager-dir"><span aria-hidden="true">← </span>Previous level</span>
                <span className="pager-title">{LEVELS[i - 1].title}</span>
              </Link>
            ) : (
              <span />
            )}
            {LEVELS[i + 1] ? (
              <Link className="pager-link pager-next" to={`${paths.level(week.id, LEVELS[i + 1].id)}?view=list`}>
                <span className="pager-dir">Next level<span aria-hidden="true"> →</span></span>
                <span className="pager-title">{LEVELS[i + 1].title}</span>
              </Link>
            ) : (
              <Link className="pager-link pager-next" to={paths.prePpt(week.id)}>
                <span className="pager-dir">Next<span aria-hidden="true"> →</span></span>
                <span className="pager-title">Pre-PPT exercise</span>
              </Link>
            )}
          </nav>
        </footer>
      </article>
    )
  }

  const n = ds.findIndex((d) => d.id === target)
  if (n < 0) {
    // No question named: go back to the one last open here, else the first not yet answered correctly.
    const saved = peek<string | null>(`drill-at:${lv.id}`, null)
    const d = ds.find((x) => x.id === saved) ?? firstOpenDrill(week, lv.id, progress)
    return <Navigate replace to={paths.drill(week.id, d)} />
  }
  const d = ds[n]
  const number = `${i + 1}.${n + 1}`

  if (d.type === 'write') {
    return (
      <div className="workbench">
        <LevelBar week={week} lv={lv} index={i} drills={ds} current={d} list={false} />
        <WriteWork key={d.id} q={d} number={number} lesson={lessonLink(d)} pager={<Pager week={week} />} />
      </div>
    )
  }
  return (
    <article className="page page-wide page-drill">
      <LevelBar week={week} lv={lv} index={i} drills={ds} current={d} list={false} />
      <QuestionCard key={d.id} q={d} heading="h2" number={number} lessonLink={lessonLink(d)} />
      <footer className="lesson-foot">
        <Pager week={week} />
      </footer>
    </article>
  )
}
