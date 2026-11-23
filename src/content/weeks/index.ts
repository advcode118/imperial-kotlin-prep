import type { Week } from '../schema'
import { week1 } from './week1'

/**
 * The course roadmap. A week with `content` is live; the rest are listed as
 * "coming soon". To add a week, see docs/ADDING_A_WEEK.md.
 */
export const weeks: Week[] = [
  {
    id: 'week1',
    number: 1,
    title: 'Kotlin syntax',
    exercise: 'Kotlin Web Server',
    due: 'Fri 27 Nov 2026, 19:00',
    topics: 'Functions, basic types, strings, pairs and lists, function types, lambdas',
    kind: 'ppt',
    content: week1,
  },
  {
    id: 'week2',
    number: 2,
    title: 'Data structures',
    exercise: 'Pawn Race',
    due: 'Fri 4 Dec 2026',
    topics: 'Classes and data structures',
    kind: 'ppt',
  },
  {
    id: 'search-engine',
    number: null,
    title: 'Search Engine',
    exercise: 'Search Engine',
    due: 'Fri 15 Jan 2027',
    topics: '',
    kind: 'ppt',
  },
  { id: 'queues', number: null, title: 'Queues', exercise: 'Queues', due: 'To be announced', topics: '', kind: 'ppt' },
  { id: 'matrix', number: null, title: 'Matrix', exercise: 'Matrix', due: 'To be announced', topics: '', kind: 'ppt' },
  { id: 'museum', number: null, title: 'Museum', exercise: 'Museum', due: 'To be announced', topics: '', kind: 'ppt' },
  {
    id: 'simulation',
    number: null,
    title: 'Simulation',
    exercise: 'Simulation',
    due: 'To be announced',
    topics: '',
    kind: 'ppt',
  },
  { id: 'maps', number: null, title: 'Maps', exercise: 'Maps', due: 'To be announced', topics: '', kind: 'ppt' },
  {
    id: 'practice-test',
    number: null,
    title: 'Kotlin practice test',
    exercise: 'Kotlin practice test',
    due: 'Feb 2027',
    topics: 'Timed, under test conditions',
    kind: 'test',
  },
  {
    id: 'interim-test',
    number: null,
    title: 'Kotlin interim test',
    exercise: 'Kotlin interim test',
    due: 'Feb 2027',
    topics: 'Timed, under test conditions',
    kind: 'test',
  },
  {
    id: 'final-test',
    number: null,
    title: 'Kotlin final test',
    exercise: 'Kotlin final test',
    due: 'Apr 2027',
    topics: 'Timed, under test conditions',
    kind: 'test',
  },
]
