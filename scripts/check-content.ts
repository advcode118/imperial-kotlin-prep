/**
 * Static content checks: schema, ids, references and internal links.
 * Exits non-zero with a list of problems.
 */
import { LEVELS } from '../src/content/schema'
import { BLANK } from '../src/lib/answers'
import { allQuestions, loadWeeks } from './load'

const problems: string[] = []
const bad = (msg: string) => problems.push(msg)
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

const weeks = loadWeeks()
const weekIds = new Set(weeks.map((w) => w.id))
if (weeks.length === 0) bad('no weeks found')

for (const { id: w, content: c } of weeks) {
  const at = (s: string) => `${w}: ${s}`
  const lessons = c.groups.flatMap((g) => g.lessons)
  const lessonIds = new Set(lessons.map((l) => l.id))
  const drillIds = new Set(c.drills.map((d) => d.id))
  const partIds = new Set(c.prePpt.parts.map((p) => p.id))
  const ids = new Map<string, string>()
  const claim = (id: string, what: string) => {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id ?? '')) bad(at(`${what}: id "${id}" must be lower-case letters, digits and hyphens`))
    if (ids.has(id)) bad(at(`duplicate id "${id}" (${ids.get(id)} and ${what})`))
    ids.set(id, what)
  }

  // ---- lessons ----
  for (const l of lessons) {
    claim(l.id, 'lesson')
    if (!nonEmpty(l.title) || !nonEmpty(l.summary)) bad(at(`lesson ${l.id}: needs a title and a summary`))
    const examples = l.blocks.filter((b) => b.kind === 'example')
    const checks = l.blocks.filter((b) => b.kind === 'check')
    if (examples.length < 2 || examples.length > 4) bad(at(`lesson ${l.id}: has ${examples.length} examples (want 2 to 4)`))
    if (checks.length < 2 || checks.length > 3) bad(at(`lesson ${l.id}: has ${checks.length} check questions (want 2 to 3)`))
    for (const b of l.blocks) {
      if (b.kind === 'example') {
        claim(b.id, `example in ${l.id}`)
        if (!nonEmpty(b.code)) bad(at(`example ${b.id}: empty code`))
        if (b.mode === 'run' && !/fun main\(/.test(b.code)) bad(at(`example ${b.id}: run example without main()`))
        if (b.mode === 'test' && !/@Test/.test(b.code)) bad(at(`example ${b.id}: test example without @Test`))
      } else if (b.kind !== 'check' && !nonEmpty(b.md)) bad(at(`lesson ${l.id}: empty ${b.kind} block`))
    }
  }

  // ---- questions ----
  for (const { where, question: q } of allQuestions(c)) {
    const here = at(`${where} / ${q.id}`)
    claim(q.id, 'question')
    if (!nonEmpty(q.title)) bad(`${here}: no title`)
    if (!nonEmpty(q.prompt)) bad(`${here}: no prompt`)
    if (!nonEmpty(q.explanation)) bad(`${here}: no explanation / reference solution`)
    if (q.lesson !== undefined && !lessonIds.has(q.lesson)) bad(`${here}: unknown lesson "${q.lesson}"`)
    switch (q.type) {
      case 'mc':
        if (!Array.isArray(q.options) || q.options.length < 2) bad(`${here}: needs at least two options`)
        else if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length)
          bad(`${here}: answer index ${q.answer} out of range`)
        else if (new Set(q.options).size !== q.options.length) bad(`${here}: duplicate options`)
        break
      case 'fill':
        if (!Array.isArray(q.accepted) || q.accepted.length < 1 || !q.accepted.every(nonEmpty))
          bad(`${here}: needs at least one non-empty accepted answer`)
        if (!nonEmpty(q.code) || q.code.split(BLANK).length !== 2) bad(`${here}: code must contain exactly one ${BLANK}`)
        break
      case 'predict':
        if (!nonEmpty(q.code) || !/fun main\(/.test(q.code)) bad(`${here}: needs a program with main()`)
        if (!nonEmpty(q.expected)) bad(`${here}: no expected output`)
        break
      case 'write':
        if (!nonEmpty(q.starter)) bad(`${here}: no starter code`)
        if (!nonEmpty(q.solution)) bad(`${here}: no reference solution`)
        if (!Array.isArray(q.tests) || q.tests.length < 2) bad(`${here}: needs at least two hidden tests`)
        else {
          const names = q.tests.map((t) => t.name)
          if (new Set(names).size !== names.length) bad(`${here}: duplicate test names`)
          for (const t of q.tests) {
            if (!nonEmpty(t.name) || !nonEmpty(t.actual) || !nonEmpty(t.expected)) bad(`${here}: incomplete test case`)
            if (/[\t\n]/.test(t.name)) bad(`${here}: test name contains a tab or newline`)
          }
        }
        break
      default:
        bad(`${here}: unknown question type "${(q as { type: string }).type}"`)
    }
  }
  for (const d of c.drills) {
    if (!d.lesson) bad(at(`drill ${d.id}: no lesson back-link`))
    if (!LEVELS.some((l) => l.id === d.level)) bad(at(`drill ${d.id}: unknown level`))
  }
  for (const lv of LEVELS)
    if (!c.drills.some((d) => d.level === lv.id)) bad(at(`drill level ${lv.id} has no questions`))
  if (c.drills.length < 40) bad(at(`only ${c.drills.length} drills (want at least 40)`))
  const writes = c.drills.filter((d) => d.type === 'write').length
  if (writes < 16) bad(at(`only ${writes} write-a-function drills (want at least 16)`))

  // ---- overview checklist ----
  if (!nonEmpty(c.overview.intro)) bad(at('overview: no intro'))
  if (c.overview.checklist.length === 0) bad(at('overview: empty checklist'))
  for (const item of c.overview.checklist) {
    const here = at(`checklist "${item.concept}"`)
    if (item.lessons.length < 1) bad(`${here}: needs at least one lesson`)
    if (item.drills.length < 1) bad(`${here}: needs at least one drill`)
    for (const id of item.lessons) if (!lessonIds.has(id)) bad(`${here}: unknown lesson "${id}"`)
    for (const id of item.drills) if (!drillIds.has(id)) bad(`${here}: unknown drill "${id}"`)
    for (const id of item.parts) if (!partIds.has(id)) bad(`${here}: unknown pre-PPT part "${id}"`)
  }
  for (const l of lessons)
    if (!c.overview.checklist.some((i) => i.lessons.includes(l.id))) bad(at(`lesson ${l.id} is not linked from the checklist`))
  for (const p of c.prePpt.parts)
    if (!c.overview.checklist.some((i) => i.parts.includes(p.id))) bad(at(`pre-PPT ${p.id} is not linked from the checklist`))

  // ---- pre-PPT ----
  const p = c.prePpt
  for (const part of p.parts) {
    claim(part.id, 'pre-PPT part')
    if (!nonEmpty(part.spec) || !nonEmpty(part.solution)) bad(at(`pre-PPT ${part.id}: needs a spec and a worked solution`))
    if (!p.tests.some((t) => t.part === part.id)) bad(at(`pre-PPT ${part.id}: has no tests`))
  }
  const testNames = new Set<string>()
  for (const t of p.tests) {
    claim(t.id, 'pre-PPT test')
    if (!partIds.has(t.part)) bad(at(`pre-PPT test ${t.id}: unknown part "${t.part}"`))
    if (testNames.has(t.name)) bad(at(`pre-PPT test ${t.id}: duplicate name`))
    testNames.add(t.name)
    if (!/^[A-Za-z0-9 ,'-]+$/.test(t.name)) bad(at(`pre-PPT test ${t.id}: name has characters not allowed in a JVM method name`))
    if (!/assert/.test(t.body)) bad(at(`pre-PPT test ${t.id}: no assertion`))
  }
  const order = p.tests.map((t) => p.parts.findIndex((x) => x.id === t.part))
  if (order.some((v, i) => i > 0 && v < order[i - 1])) bad(at('pre-PPT tests are not grouped in part order'))
  if (!/TODO\(\)/.test(p.starter.content)) bad(at('pre-PPT starter has no TODO()'))
  if (/TODO\(\)/.test(p.solution)) bad(at('pre-PPT solution still has TODO()'))
  if (p.durationMinutes <= 15) bad(at('pre-PPT duration must exceed the 15-minute warning'))

  // ---- technique ----
  for (const s of c.technique.sections) {
    claim(s.id, 'technique section')
    if (s.source !== 'spec' && s.source !== 'advice') bad(at(`technique ${s.id}: source must be spec or advice`))
    if (!nonEmpty(s.md)) bad(at(`technique ${s.id}: empty`))
  }

  // ---- internal links ----
  const pageAnchors = new Set<string>(['workspace', ...partIds, ...c.technique.sections.map((s) => s.id)])
  const markdown: [string, string][] = [
    ['overview', c.overview.intro],
    ...c.overview.checklist.map((i): [string, string] => [`checklist "${i.concept}"`, i.detail]),
    ...lessons.flatMap((l) =>
      l.blocks.flatMap((b): [string, string][] =>
        b.kind === 'check'
          ? [[`check ${b.question.id}`, b.question.prompt + '\n' + b.question.explanation]]
          : b.kind === 'example'
            ? []
            : [[`lesson ${l.id}`, b.md]],
      ),
    ),
    ...c.drills.map((d): [string, string] => [`drill ${d.id}`, d.prompt + '\n' + d.explanation]),
    ...p.preamble.map((s): [string, string] => [`pre-PPT ${s.title}`, s.md]),
    ...p.parts.map((s): [string, string] => [`pre-PPT ${s.id}`, s.spec + '\n' + s.solution]),
    ...p.closing.map((s): [string, string] => [`pre-PPT ${s.title}`, s.md]),
    ['technique', c.technique.intro],
    ...c.technique.sections.map((s): [string, string] => [`technique ${s.id}`, s.md]),
  ]
  for (const [where, md] of markdown) {
    const prose = md.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
    for (const m of prose.matchAll(/\]\(([^)\s]+)\)/g)) {
      const href = m[1]
      if (/^https?:\/\//.test(href)) continue
      const here = at(`${where}: link ${href}`)
      if (!href.startsWith('#')) {
        bad(`${here}: internal links must start with # (hash routing)`)
      } else if (!href.startsWith('#/')) {
        if (!pageAnchors.has(href.slice(1))) bad(`${here}: no such anchor`)
      } else {
        const [path, query = ''] = href.slice(1).split('?')
        const seg = path.split('/').filter(Boolean)
        const ok =
          seg.length === 0 ||
          (seg[0] === 'week' &&
            weekIds.has(seg[1]) &&
            (seg.length === 2 ||
              (seg[2] === 'lesson' && seg.length === 4 && seg[1] === w && lessonIds.has(seg[3])) ||
              (seg[2] === 'drills' && seg.length === 3) ||
              (seg[2] === 'drills' && seg.length === 4 && LEVELS.some((l) => l.id === seg[3])) ||
              (seg[2] === 'pre-ppt' && seg.length === 3) ||
              (seg[2] === 'technique' && seg.length === 3)))
        if (!ok) bad(`${here}: no such page`)
        const focus = new URLSearchParams(query).get('q')
        if (focus && !drillIds.has(focus)) bad(`${here}: no such drill "${focus}"`)
      }
    }
  }

  const byType = (t: string) => c.drills.filter((d) => d.type === t).length
  console.log(
    `${w}: ${lessons.length} lessons, ${lessons.flatMap((l) => l.blocks).filter((b) => b.kind === 'example').length} examples, ` +
      `${lessons.flatMap((l) => l.blocks).filter((b) => b.kind === 'check').length} lesson checks, ${c.drills.length} drills ` +
      `(${LEVELS.map((l) => `${l.id} ${c.drills.filter((d) => d.level === l.id).length}`).join(', ')}; ` +
      `write ${byType('write')}, predict ${byType('predict')}, fill ${byType('fill')}, mc ${byType('mc')}), ` +
      `${p.parts.length} pre-PPT parts, ${p.tests.length} pre-PPT tests, ${c.overview.checklist.length} checklist items`,
  )
}

if (problems.length) {
  console.error(`\ncontent check: ${problems.length} problem(s)`)
  for (const p of problems) console.error('  - ' + p)
  process.exit(1)
}
console.log('content check: ok')
