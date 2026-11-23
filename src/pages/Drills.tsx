import { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { QuestionCard } from '../components/QuestionCard'
import { drillsAt, lessonsOf, paths } from '../content'
import { LEVELS, type Level } from '../content/schema'
import { useProgress } from '../lib/store'
import { MissingWeek, useWeek } from './common'

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
    </article>
  )
}

export function DrillLevelPage() {
  const week = useWeek()
  const { level } = useParams()
  const [params] = useSearchParams()
  const target = params.get('q')
  const lv = LEVELS.find((l) => l.id === level)

  useEffect(() => {
    if (!target) return
    const el = document.getElementById(target)
    if (el) el.scrollIntoView({ block: 'start' })
  }, [target, level])

  if (!week || !lv) return <MissingWeek />
  const ds = drillsAt(week, lv.id as Level)
  const lessons = lessonsOf(week)
  const i = LEVELS.indexOf(lv)
  const prev = LEVELS[i - 1]
  const next = LEVELS[i + 1]
  return (
    <article className="page page-wide">
      <p className="eyebrow">
        <Link to={paths.drills(week.id)}>Drill book</Link> · level {i + 1} of {LEVELS.length}
      </p>
      <h1>{lv.title}</h1>
      <p className="lede">{lv.blurb}</p>
      {ds.map((d, n) => {
        const l = lessons.find((x) => x.id === d.lesson)
        return (
          <QuestionCard
            key={d.id}
            q={d}
            number={`${i + 1}.${n + 1}`}
            lessonLink={l ? { href: `#${paths.lesson(week.id, l.id)}`, title: l.title } : undefined}
          />
        )
      })}
      <footer className="lesson-foot">
        <div className="pager">
          {prev ? <Link to={paths.level(week.id, prev.id)}>← {prev.title}</Link> : <span />}
          {next ? (
            <Link to={paths.level(week.id, next.id)}>{next.title} →</Link>
          ) : (
            <Link to={paths.prePpt(week.id)}>Pre-PPT exercise →</Link>
          )}
        </div>
      </footer>
    </article>
  )
}
