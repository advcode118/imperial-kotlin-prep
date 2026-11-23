import { Link } from 'react-router-dom'
import { lessonsOf, paths, weeks } from '../content'
import { useProgress } from '../lib/store'

export function HomePage() {
  const { progress } = useProgress()
  return (
    <article className="page">
      <p className="eyebrow">COMP40009 Computing Practical 1 · Imperial College London</p>
      <h1>Kotlin PPT preparation</h1>
      <p className="lede">
        Notes, graded exercises and a timed practice project for each Kotlin practical programming test. Every
        code sample on the site can be edited and run, and every exercise is checked against real tests.
      </p>
      <p>
        Each week follows the same order: read the lessons, work through the drill book, then sit the pre-PPT
        exercise against the clock. If you have come from the Haskell term, look for the <em>From Haskell</em>{' '}
        notes: most of Kotlin’s week-one ideas are ones you already know under another name.
      </p>

      <h2>Roadmap</h2>
      <table className="roadmap">
        <thead>
          <tr>
            <th>Week</th>
            <th>Exercise</th>
            <th>Due</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => {
            const lessons = lessonsOf(w)
            const read = lessons.filter((l) => progress.read[l.id]).length
            return (
              <tr key={w.id} className={w.content ? '' : 'soon'}>
                <td className="num">{w.number ?? '–'}</td>
                <td>
                  {w.content ? <Link to={paths.week(w.id)}>{w.exercise}</Link> : w.exercise}
                  <span className="roadmap-topics">{w.topics}</span>
                </td>
                <td className="nowrap">{w.due}</td>
                <td className="nowrap status">
                  {w.content ? `${read} of ${lessons.length} lessons read` : 'Coming soon'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="small">
        Dates for later weeks are taken from the course timetable and may change; always check Scientia.
        This site is an unofficial study aid and is not affiliated with Imperial College London.
      </p>
    </article>
  )
}
