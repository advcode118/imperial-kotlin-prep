import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { buildWeek } from '../src/content/load'
import type { CheckQuestion, Question, WeekContent } from '../src/content/schema'

export const ROOT = fileURLToPath(new URL('..', import.meta.url))
const WEEKS = join(ROOT, 'src/content/weeks')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

/** Load every week folder from disk, exactly as the site's import.meta.glob does. */
export function loadWeeks(): { id: string; content: WeekContent }[] {
  return readdirSync(WEEKS)
    .filter((d) => existsSync(join(WEEKS, d, 'week.yaml')))
    .sort()
    .map((id) => {
      const dir = join(WEEKS, id)
      const files: Record<string, unknown> = {}
      for (const p of walk(dir)) {
        const key = './' + relative(dir, p).split('\\').join('/')
        const text = readFileSync(p, 'utf8')
        if (key.endsWith('.yaml')) files[key] = parse(text)
        else if (key.startsWith('./preppt/files/')) files[key] = text
      }
      return { id, content: buildWeek(files) }
    })
}

export interface Located {
  where: string
  question: Question | CheckQuestion
}

/** Every auto-checked question in a week: lesson checks and drills. */
export function allQuestions(c: WeekContent): Located[] {
  const out: Located[] = []
  for (const g of c.groups)
    for (const l of g.lessons)
      for (const b of l.blocks) if (b.kind === 'check') out.push({ where: `lesson ${l.id}`, question: b.question })
  for (const d of c.drills) out.push({ where: `drills/${d.level}`, question: d })
  return out
}
