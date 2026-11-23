import type { Drill, Lesson, Level, Week } from './schema'
import { weeks } from './weeks'

export { weeks }

export const getWeek = (id: string | undefined): Week | undefined => weeks.find((w) => w.id === id)

export const lessonsOf = (w: Week): Lesson[] => w.content?.groups.flatMap((g) => g.lessons) ?? []

export const drillsAt = (w: Week, level: Level): Drill[] =>
  w.content?.drills.filter((d) => d.level === level) ?? []

/** Site paths (without the leading '#'). */
export const paths = {
  home: () => '/',
  week: (w: string) => `/week/${w}`,
  lesson: (w: string, id: string) => `/week/${w}/lesson/${id}`,
  drills: (w: string) => `/week/${w}/drills`,
  level: (w: string, level: Level) => `/week/${w}/drills/${level}`,
  drill: (w: string, d: Drill) => `/week/${w}/drills/${d.level}?q=${d.id}`,
  prePpt: (w: string) => `/week/${w}/pre-ppt`,
  technique: (w: string) => `/week/${w}/technique`,
}
