import type {
  Block,
  CheckQuestion,
  Drill,
  Lesson,
  LessonGroup,
  Level,
  Overview,
  PptPart,
  PptTest,
  PrePpt,
  ProjectFile,
  TechniqueSection,
  WeekContent,
} from './schema'
import { LEVELS } from './schema'

/**
 * Assemble a week from its folder. `files` is the result of
 *   import.meta.glob('./**\/*.{yaml,kt,kts,md,txt}', { eager: true, ... })
 * keyed by relative path; YAML modules are parsed objects, everything else is raw text.
 *
 * Expected layout (see docs/ADDING_A_WEEK.md):
 *   week.yaml            overview + lesson groups (ordered lesson ids)
 *   lessons/<id>.yaml    one lesson each
 *   drills/<level>.yaml  a list of questions per level
 *   preppt/preppt.yaml   the pre-PPT exercise; code lives in preppt/files/
 *   technique.yaml       the technique page
 */
export function buildWeek(files: Record<string, unknown>): WeekContent {
  const get = <T>(path: string): T => {
    const v = files[`./${path}`]
    if (v === undefined) throw new Error(`content file missing: ${path}`)
    return v as T
  }
  const text = (path: string) => get<string>(path).replace(/\r/g, '')

  const manifest = get<{
    overview: Overview
    groups: { id: string; title: string; blurb: string; lessons: string[] }[]
  }>('week.yaml')

  const groups: LessonGroup[] = manifest.groups.map((g) => ({
    ...g,
    lessons: g.lessons.map((id) => toLesson(id, get<RawLesson>(`lessons/${id}.yaml`))),
  }))

  const drills: Drill[] = LEVELS.flatMap((lv) => {
    const list = (files[`./drills/${lv.id}.yaml`] as Omit<Drill, 'level'>[] | undefined) ?? []
    return list.map((q) => ({ ...q, level: lv.id as Level }) as Drill)
  })

  const raw = get<RawPrePpt>('preppt/preppt.yaml')
  const file = (f: RawFile): ProjectFile => ({
    name: f.path.split('/').pop()!,
    path: f.path,
    content: text(`preppt/files/${f.source}`),
  })
  const prePpt: PrePpt = {
    id: raw.id,
    title: raw.title,
    subtitle: raw.subtitle,
    durationMinutes: raw.durationMinutes,
    preamble: raw.preamble,
    parts: raw.parts,
    closing: raw.closing,
    given: file(raw.given),
    starter: file(raw.starter),
    solution: text(`preppt/files/${raw.solution}`),
    testFile: {
      name: raw.testFile.path.split('/').pop()!,
      path: raw.testFile.path,
      className: raw.testFile.className,
      header: raw.testFile.header.trim(),
    },
    tests: raw.tests.map((t) => ({ ...t, body: t.body.replace(/\n+$/, '') })),
    extraFiles: (raw.extraFiles ?? []).map(file),
  }

  const technique = get<{ intro: string; sections: TechniqueSection[] }>('technique.yaml')
  return { overview: manifest.overview, groups, drills, prePpt, technique }
}

interface RawFile {
  path: string
  source: string
}
interface RawPrePpt {
  id: string
  title: string
  subtitle: string
  durationMinutes: number
  preamble: { title: string; md: string }[]
  parts: PptPart[]
  closing: { title: string; md: string }[]
  given: RawFile
  starter: RawFile
  solution: string
  testFile: { path: string; className: string; header: string }
  tests: PptTest[]
  extraFiles?: RawFile[]
}

/** In YAML a block is a single-key map: `- prose: |`, `- example: {...}`, `- check: {...}`. */
type RawBlock =
  | { prose: string }
  | { haskell: string }
  | { note: { title: string; md: string } }
  | { example: { id?: string; title?: string; code: string; mode?: 'run' | 'test'; expect?: 'ok' | 'fails' } }
  | { check: CheckQuestion }

interface RawLesson {
  title: string
  summary: string
  blocks: RawBlock[]
}

function toLesson(id: string, raw: RawLesson): Lesson {
  let examples = 0
  const blocks: Block[] = raw.blocks.map((b): Block => {
    if ('prose' in b) return { kind: 'prose', md: b.prose }
    if ('haskell' in b) return { kind: 'haskell', md: b.haskell }
    if ('note' in b) return { kind: 'note', ...b.note }
    if ('example' in b) {
      examples++
      return {
        kind: 'example',
        id: b.example.id ?? `${id}-ex${examples}`,
        title: b.example.title,
        code: b.example.code,
        mode: b.example.mode ?? 'run',
        expect: b.example.expect ?? 'ok',
      }
    }
    if ('check' in b) return { kind: 'check', question: b.check }
    throw new Error(`lesson ${id}: unknown block ${JSON.stringify(b).slice(0, 80)}`)
  })
  return { id, title: raw.title, summary: raw.summary, blocks }
}
