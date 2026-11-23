import { Link } from 'react-router-dom'
import { Markdown } from '../components/Markdown'
import { lessonsOf, paths } from '../content'
import { useProgress } from '../lib/store'
import { MissingWeek, useWeek } from './common'

export function OverviewPage() {
  const week = useWeek()
  const { progress } = useProgress()
  if (!week) return <MissingWeek />
  const { overview, drills, prePpt } = week.content
  const lessons = lessonsOf(week)
  const w = week.id
  return (
    <article className="page">
      <p className="eyebrow">Week {week.number} overview</p>
      <h1>{week.exercise}</h1>
      <Markdown md={overview.intro} />

      <dl className="facts">
        {overview.facts.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>
              <Markdown md={f.value} className="inline" />
            </dd>
          </div>
        ))}
      </dl>

      <h2>Starter files</h2>
      <table className="plain">
        <tbody>
          {overview.files.map((f) => (
            <tr key={f.name}>
              <td className="nowrap">
                <code>{f.name}</code>
              </td>
              <td>{f.role}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>How to use this week</h2>
      <ol>
        <li>
          Read the <Link to={paths.lesson(w, lessons[0].id)}>lessons</Link> in order. Run and change the
          examples; answer the check questions as you go.
        </li>
        <li>
          Work through the <Link to={paths.drills(w)}>drill book</Link> from Warm-up to PPT-strength.
        </li>
        <li>
          Sit the <Link to={paths.prePpt(w)}>pre-PPT exercise</Link> with the two-hour timer.
        </li>
        <li>
          Read the <Link to={paths.technique(w)}>technique page</Link> before you clone the real repository.
        </li>
      </ol>

      <h2>What the exercise needs</h2>
      <p>
        Every skill the real exercise calls on, with where to learn it and where to practise it. A tick
        appears when you have read the lesson or answered the drill correctly.
      </p>
      <div className="table-scroll">
        <table className="checklist">
          <thead>
            <tr>
              <th>Concept</th>
              <th>Lessons</th>
              <th>Drills</th>
              <th>Pre-PPT</th>
            </tr>
          </thead>
          <tbody>
            {overview.checklist.map((item) => (
              <tr key={item.concept}>
                <td>
                  <strong>{item.concept}</strong>
                  <span className="checklist-detail">{item.detail}</span>
                </td>
                <td>
                  <ul>
                    {item.lessons.map((id) => {
                      const l = lessons.find((x) => x.id === id)
                      return (
                        <li key={id}>
                          <Link to={paths.lesson(w, id)}>{l?.title ?? id}</Link>
                          {progress.read[id] && <span className="tick"> ✓</span>}
                        </li>
                      )
                    })}
                  </ul>
                </td>
                <td>
                  <ul className="drill-refs">
                    {item.drills.map((id) => {
                      const d = drills.find((x) => x.id === id)
                      return (
                        <li key={id}>
                          {d ? <Link to={paths.drill(w, d)}>{d.title}</Link> : id}
                          {progress.questions[id] === 'passed' && <span className="tick"> ✓</span>}
                        </li>
                      )
                    })}
                  </ul>
                </td>
                <td className="nowrap">
                  {item.parts.map((id) => {
                    const p = prePpt.parts.find((x) => x.id === id)
                    return (
                      <div key={id}>
                        <Link to={paths.prePpt(w)}>{p?.title ?? id}</Link>
                        {progress.parts[id] && <span className="tick"> ✓</span>}
                      </div>
                    )
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}
