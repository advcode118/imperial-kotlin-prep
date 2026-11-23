import { Link, useLocation } from 'react-router-dom'
import type { Week } from '../content/schema'
import { neighbours, stopLabel, type Stop } from '../lib/nav'
import { useProgress } from '../lib/store'

/** Previous / next in the week's reading order. Moving on from a lesson marks it read. */
export function Pager({ week, compact }: { week: Week; compact?: boolean }) {
  const { pathname, search } = useLocation()
  const { markRead } = useProgress()
  const { here, prev, next } = neighbours(week, pathname, search)
  const leave = () => {
    if (here?.kind === 'lesson' && here.id) markRead(here.id)
  }
  const link = (s: Stop | undefined, dir: 'prev' | 'next') =>
    s ? (
      <Link
        to={s.path}
        className={`pager-link pager-${dir}`}
        rel={dir}
        onClick={dir === 'next' ? leave : undefined}
        title={compact ? `${stopLabel(s)}  (${dir === 'prev' ? '[' : ']'})` : undefined}
      >
        <span className="pager-dir">
          {dir === 'prev' && <span aria-hidden="true">← </span>}
          {dir === 'prev' ? 'Previous' : 'Next'}
          <span className="sr-only">: </span>
          {dir === 'next' && <span aria-hidden="true"> →</span>}
        </span>
        {!compact && <span className="pager-title">{stopLabel(s)}</span>}
      </Link>
    ) : (
      <span />
    )
  return (
    <nav className={`pager ${compact ? 'pager-compact' : ''}`} aria-label="Previous and next page">
      {link(prev, 'prev')}
      {link(next, 'next')}
    </nav>
  )
}
