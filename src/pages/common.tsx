import { Link, useParams } from 'react-router-dom'
import { getWeek } from '../content'
import type { Week, WeekContent } from '../content/schema'

export type LoadedWeek = Week & { content: WeekContent }

/** The week named in the URL, if it exists and has content. */
export function useWeek(): LoadedWeek | null {
  const { weekId } = useParams()
  const w = getWeek(weekId)
  return w && w.content ? (w as LoadedWeek) : null
}

export function MissingWeek() {
  return (
    <article className="page">
      <h1>Not available yet</h1>
      <p>
        This week has not been written. See the <Link to="/">roadmap</Link>.
      </p>
    </article>
  )
}
