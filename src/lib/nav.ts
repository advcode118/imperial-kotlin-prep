import { drillsAt, lessonsOf, paths } from '../content'
import { LEVELS, type Level, type Week } from '../content/schema'
import type { Progress } from './store'

/** One place a reader can be. The week is a single ordered walk through these. */
export interface Stop {
  /** Router path including any query string. */
  path: string
  title: string
  /** Sidebar group the stop belongs to. */
  section: string
  sectionPath: string
  kind: 'overview' | 'lesson' | 'drills' | 'drill' | 'preppt' | 'technique'
  /** Lesson or drill id. */
  id?: string
  /** Short reference such as "2.3" for drills. */
  ref?: string
}

const cache = new WeakMap<Week, Stop[]>()

export function stopsOf(week: Week): Stop[] {
  const hit = cache.get(week)
  if (hit) return hit
  const c = week.content
  if (!c) return []
  const w = week.id
  const label = `Week ${week.number}`
  const stops: Stop[] = [
    { path: paths.week(w), title: 'Overview', section: label, sectionPath: paths.week(w), kind: 'overview' },
  ]
  for (const g of c.groups)
    for (const l of g.lessons)
      stops.push({
        path: paths.lesson(w, l.id),
        title: l.title,
        section: g.title,
        sectionPath: paths.lesson(w, g.lessons[0].id),
        kind: 'lesson',
        id: l.id,
      })
  stops.push({ path: paths.drills(w), title: 'Drill book', section: label, sectionPath: paths.week(w), kind: 'drills' })
  LEVELS.forEach((lv, i) =>
    drillsAt(week, lv.id).forEach((d, n) =>
      stops.push({
        path: paths.drill(w, d),
        title: d.title,
        section: `Drills · ${lv.title}`,
        sectionPath: `${paths.level(w, lv.id)}?view=list`,
        kind: 'drill',
        id: d.id,
        ref: `${i + 1}.${n + 1}`,
      }),
    ),
  )
  stops.push(
    { path: paths.prePpt(w), title: 'Pre-PPT exercise', section: label, sectionPath: paths.week(w), kind: 'preppt' },
    { path: paths.technique(w), title: 'PPT technique', section: label, sectionPath: paths.week(w), kind: 'technique' },
  )
  cache.set(week, stops)
  return stops
}

/** Index of the stop for a location, or -1. A drill level without `?q=` counts as its first drill. */
export function stopIndex(week: Week, pathname: string, search: string): number {
  const stops = stopsOf(week)
  const q = new URLSearchParams(search).get('q')
  const exact = stops.findIndex((s) => s.path === (q ? `${pathname}?q=${q}` : pathname))
  if (exact >= 0) return exact
  return stops.findIndex((s) => s.kind === 'drill' && s.path.startsWith(`${pathname}?`))
}

export function neighbours(week: Week, pathname: string, search: string) {
  const stops = stopsOf(week)
  const i = stopIndex(week, pathname, search)
  return { here: stops[i], prev: i > 0 ? stops[i - 1] : undefined, next: i >= 0 ? stops[i + 1] : undefined }
}

export const stopLabel = (s: Stop) => (s.ref ? `${s.ref} ${s.title}` : s.title)

/** The next thing worth doing, in course order: unread lesson, unanswered drill, unfinished part. */
export function recommend(week: Week, progress: Progress): { stop: Stop; why: string } | null {
  const c = week.content
  if (!c) return null
  const stops = stopsOf(week)
  const lesson = lessonsOf(week).find((l) => !progress.read[l.id])
  if (lesson) return { stop: stops.find((s) => s.id === lesson.id)!, why: 'Next unread lesson' }
  const drill = c.drills.find((d) => progress.questions[d.id] !== 'passed')
  if (drill) return { stop: stops.find((s) => s.id === drill.id)!, why: 'Next drill not yet answered correctly' }
  const pre = stops.find((s) => s.kind === 'preppt')!
  if (c.prePpt.parts.some((p) => !progress.parts[p.id])) return { stop: pre, why: 'Sit the timed practice exercise' }
  return { stop: stops.find((s) => s.kind === 'technique')!, why: 'Everything is done: reread the technique notes' }
}

/** First drill of a level that has not been answered correctly (or the first drill). */
export function firstOpenDrill(week: Week, level: Level, progress: Progress) {
  const ds = drillsAt(week, level)
  return ds.find((d) => progress.questions[d.id] !== 'passed') ?? ds[0]
}
