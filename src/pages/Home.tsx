import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { LastPlace } from '../components/Layout'
import { drillsAt, paths, weeks } from '../content'
import { LEVELS, type Week } from '../content/schema'
import { recommend, stopLabel } from '../lib/nav'
import { usePersistent, useProgress } from '../lib/store'

function Countdown({ week }: { week: Week }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const h = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(h)
  }, [])
  if (!week.dueAt) return null
  const ms = new Date(week.dueAt).getTime() - now
  const mins = Math.floor(ms / 60_000)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
  const left = d > 0 ? `${plural(d, 'day')} ${plural(h, 'hour')}` : h > 0 ? `${plural(h, 'hour')} ${plural(m, 'minute')}` : plural(m, 'minute')
  return (
    <section className="card" aria-labelledby="due-title">
      <h2 className="card-label" id="due-title">
        {week.exercise} is due
      </h2>
      <p className="card-big">{ms > 0 ? `in ${left}` : 'Deadline passed'}</p>
      <p className="card-sub">{week.due}, London time. Always confirm on Scientia.</p>
    </section>
  )
}

function Row({ to, label, done, total, unit }: { to: string; label: string; done: number; total: number; unit: string }) {
  return (
    <li className="prog-row">
      <Link to={to}>{label}</Link>
      <span className="meter" aria-hidden="true">
        <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </span>
      <span className="prog-count">
        {done} of {total}
        <span className="sr-only"> {unit}</span>
      </span>
    </li>
  )
}

function WeekCard({ week }: { week: Week }) {
  const { progress } = useProgress()
  const c = week.content!
  const w = week.id
  const partsDone = c.prePpt.parts.filter((p) => progress.parts[p.id]).length
  return (
    <section className="card card-week" aria-labelledby="week-title">
      <div className="card-head">
        <h2 id="week-title">
          <Link to={paths.week(w)}>
            Week {week.number}: {week.exercise}
          </Link>
        </h2>
        <span className="card-sub">{week.topics}</span>
      </div>
      <div className="prog-cols">
        <div>
          <h3 className="card-label">Lessons read</h3>
          <ul className="prog">
            {c.groups.map((g) => (
              <Row
                key={g.id}
                to={paths.lesson(w, (g.lessons.find((l) => !progress.read[l.id]) ?? g.lessons[0]).id)}
                label={g.title}
                done={g.lessons.filter((l) => progress.read[l.id]).length}
                total={g.lessons.length}
                unit="lessons read"
              />
            ))}
          </ul>
          <h3 className="card-label">Pre-PPT exercise</h3>
          <ul className="prog">
            <Row to={paths.prePpt(w)} label="Parts with all tests passing" done={partsDone} total={c.prePpt.parts.length} unit="parts" />
          </ul>
        </div>
        <div>
          <h3 className="card-label">Drills answered correctly</h3>
          <ul className="prog">
            {LEVELS.map((lv) => {
              const ds = drillsAt(week, lv.id)
              return (
                <Row
                  key={lv.id}
                  to={paths.level(w, lv.id)}
                  label={lv.title}
                  done={ds.filter((d) => progress.questions[d.id] === 'passed').length}
                  total={ds.length}
                  unit="drills"
                />
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}

export function HomePage() {
  const { progress } = useProgress()
  const [last] = usePersistent<LastPlace | null>('last', null)
  const week = weeks.find((w) => w.content)!
  const rec = recommend(week, progress)
  const started = !!last || Object.keys(progress.read).length + Object.keys(progress.questions).length > 0
  const later = weeks.filter((w) => !w.content)
  return (
    <article className="page page-dash">
      <p className="eyebrow">COMP40009 Computing Practical 1 · Imperial College London</p>
      <h1>Kotlin PPT preparation</h1>
      <p className="lede">
        Lessons, graded drills and a timed practice exercise for each Kotlin practical programming test. Read,
        practise, then sit the pre-PPT against the clock.
      </p>

      <div className="dash-top">
        {last && (
          <section className="card card-action" aria-labelledby="resume-title">
            <h2 className="card-label" id="resume-title">
              Continue where you left off
            </h2>
            <p className="card-big">
              <Link to={last.path} state={{ scroll: last.scroll }}>
                {last.title}
              </Link>
            </p>
            <p className="card-sub">{last.section}</p>
          </section>
        )}
        {rec && (
          <section className="card card-action" aria-labelledby="next-title">
            <h2 className="card-label" id="next-title">
              {started ? 'Next recommended step' : 'Start here'}
            </h2>
            <p className="card-big">
              <Link to={started ? rec.stop.path : paths.week(week.id)}>
                {started ? stopLabel(rec.stop) : `Week ${week.number} overview`}
              </Link>
            </p>
            <p className="card-sub">{started ? `${rec.why} · ${rec.stop.section}` : 'What the exercise is and what it needs'}</p>
          </section>
        )}
        <Countdown week={week} />
      </div>

      <WeekCard week={week} />

      <section aria-labelledby="roadmap-title">
        <h2 id="roadmap-title">Later in the course</h2>
        <ul className="roadmap">
          {later.map((w) => (
            <li key={w.id}>
              <span className="roadmap-name">
                {w.number ? `Week ${w.number}: ` : ''}
                {w.exercise}
              </span>
              <span className="roadmap-due">{w.due}</span>
              <span className="chip">Coming soon</span>
            </li>
          ))}
        </ul>
        <p className="small">
          If you have come from the Haskell term, look for the <em>From Haskell</em> notes in the lessons. Dates
          for later weeks are taken from the course timetable and may change; always check Scientia. This site
          is an unofficial study aid and is not affiliated with Imperial College London.
        </p>
      </section>
    </article>
  )
}
