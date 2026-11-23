/**
 * Runs every piece of Kotlin in the content against the real compiler
 * (the same public server the site uses) and checks the stated outcome:
 *
 *  - every lesson example compiles and behaves as declared (ok / fails)
 *  - every predict-the-output answer equals the program's actual output
 *  - every accepted fill-in answer, substituted in, gives the expected output
 *  - every write-a-function reference solution passes all hidden tests,
 *    and the starter compiles but does not pass them
 *  - the pre-PPT solution passes every test; the starter compiles and fails
 *    every core test; the extension tests do not compile against the starter
 *
 * Results are cached by content hash in node_modules/.cache so re-runs are fast.
 * Transport failures are retried with backoff. KOTLIN_CHECK=skip skips the lot.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BLANK, normalizeOutput } from '../src/lib/answers'
import { buildHarness, HARNESS_FILE, parseHarness, SOLUTION_FILE } from '../src/lib/harness'
import { CompilerUnavailable, execute, KOTLIN_VERSION, type RunResult, type SourceFile } from '../src/lib/kotlin'
import { buildTestFile } from '../src/lib/preppt'
import { allQuestions, loadWeeks, ROOT } from './load'

if (process.env.KOTLIN_CHECK === 'skip') {
  console.log('kotlin check: skipped (KOTLIN_CHECK=skip)')
  process.exit(0)
}

const CONCURRENCY = Number(process.env.KOTLIN_CHECK_CONCURRENCY ?? 3)
const RETRIES = 6
const cacheDir = join(ROOT, 'node_modules/.cache')
const cacheFile = join(cacheDir, 'kotlin-check.json')
const cache: Record<string, RunResult> =
  process.env.KOTLIN_CHECK_NO_CACHE || !existsSync(cacheFile) ? {} : JSON.parse(readFileSync(cacheFile, 'utf8'))
let calls = 0
let hits = 0

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function run(files: SourceFile[], mode: 'run' | 'test'): Promise<RunResult> {
  const key = createHash('sha256').update(JSON.stringify([KOTLIN_VERSION, mode, files])).digest('hex')
  if (cache[key]) {
    hits++
    return cache[key]
  }
  for (let attempt = 1; ; attempt++) {
    try {
      calls++
      const result = await execute(files, mode, { timeoutMs: 60000 })
      // A test run that compiled but reported no tests is a server hiccup, not a result.
      if (mode === 'test' && !result.hasErrors && result.tests.length === 0) {
        throw new CompilerUnavailable('no test results returned')
      }
      cache[key] = result
      return result
    } catch (e) {
      if (!(e instanceof CompilerUnavailable) || attempt >= RETRIES) throw e
      await sleep(Math.min(30000, 1500 * 2 ** (attempt - 1)) + Math.random() * 500)
    }
  }
}

interface Job {
  label: string
  check: () => Promise<string | null>
}
const jobs: Job[] = []
const job = (label: string, check: () => Promise<string | null>) => jobs.push({ label, check })

const errorsOf = (r: RunResult) =>
  r.messages
    .filter((m) => m.severity === 'ERROR')
    .map((m) => `${m.file}:${m.line}: ${m.message}`)
    .join('; ')
const one = (name: string, text: string): SourceFile[] => [{ name, text }]

function expectOutput(r: RunResult, expected: string): string | null {
  if (r.hasErrors) return `does not compile: ${errorsOf(r)}`
  if (r.exception) return `threw ${r.exception.name}: ${r.exception.message}`
  const got = normalizeOutput(r.stdout)
  const want = normalizeOutput(expected)
  return got === want ? null : `output differs\n      expected: ${JSON.stringify(want)}\n      actual:   ${JSON.stringify(got)}`
}

for (const { id: w, content: c } of loadWeeks()) {
  // ---- lesson examples ----
  for (const l of c.groups.flatMap((g) => g.lessons)) {
    for (const b of l.blocks) {
      if (b.kind !== 'example') continue
      job(`${w} example ${b.id} (${b.mode}, expect ${b.expect})`, async () => {
        const r = await run(one(b.mode === 'test' ? 'ExampleTest.kt' : 'Example.kt', b.code), b.mode)
        if (r.hasErrors) return `does not compile: ${errorsOf(r)}`
        if (b.mode === 'run') {
          if (b.expect === 'ok') return r.exception ? `threw ${r.exception.name}: ${r.exception.message}` : null
          return r.exception ? null : 'was expected to throw, but ran normally'
        }
        const failing = r.tests.filter((t) => t.status !== 'OK')
        if (b.expect === 'ok')
          return failing.length ? `tests failed: ${failing.map((t) => `${t.name} (${t.message})`).join('; ')}` : null
        return failing.length ? null : 'was expected to have a failing test, but all passed'
      })
    }
  }

  // ---- questions ----
  for (const { where, question: q } of allQuestions(c)) {
    const label = `${w} ${where} / ${q.id}`
    if (q.type === 'predict') {
      job(`${label} (predict)`, async () => expectOutput(await run(one('Predict.kt', q.code), 'run'), q.expected))
    } else if (q.type === 'fill' && q.expectedOutput !== undefined) {
      for (const answer of q.accepted) {
        job(`${label} (fill: ${answer})`, async () =>
          expectOutput(await run(one('Fill.kt', q.code.replace(BLANK, answer)), 'run'), q.expectedOutput!),
        )
      }
    } else if (q.type === 'write') {
      const harness: SourceFile = { name: HARNESS_FILE, text: buildHarness(q.tests, q.support) }
      // Every result row must carry a declared test name, once each, and every declared test must report.
      const rows = (stdout: string, parsed: ReturnType<typeof parseHarness>): string | null => {
        if (!parsed.finished) return 'harness did not finish'
        const declared = q.tests.map((t) => t.name)
        const printed = stdout
          .split('\n')
          .map((l) => /##(?:PASS|FAIL|ERROR)\t([^\t]*)/.exec(l)?.[1])
          .filter((n): n is string => n !== undefined)
        const stray = printed.filter((n) => !declared.includes(n))
        if (stray.length) return `result rows with undeclared names: ${stray.join('; ')}`
        if (printed.length !== declared.length) return `expected ${declared.length} result rows, got ${printed.length}`
        const silent = parsed.results.filter((t) => t.status === 'missing' || t.name === '')
        return silent.length ? `tests with no result row: ${silent.map((t) => t.name).join('; ')}` : null
      }
      job(`${label} (reference solution passes hidden tests)`, async () => {
        const r = await run([{ name: SOLUTION_FILE, text: q.solution }, harness], 'run')
        if (r.hasErrors) return `does not compile: ${errorsOf(r)}`
        if (r.exception) return `threw ${r.exception.name}: ${r.exception.message}`
        const parsed = parseHarness(r.stdout, q.tests)
        const failing = parsed.results.filter((t) => t.status !== 'pass')
        const rowError = rows(r.stdout, parsed)
        if (rowError) return rowError
        return failing.length
          ? failing.map((t) => `${t.name}: ${t.status} expected=${t.expected} actual=${t.actual} ${t.error ?? ''}`).join('; ')
          : null
      })
      job(`${label} (starter compiles and fails hidden tests)`, async () => {
        const r = await run([{ name: SOLUTION_FILE, text: q.starter }, harness], 'run')
        if (r.hasErrors) return `starter does not compile: ${errorsOf(r)}`
        const parsed = parseHarness(r.stdout, q.tests)
        const rowError = rows(r.stdout, parsed)
        if (rowError) return rowError
        const passing = parsed.results.filter((t) => t.status === 'pass')
        return passing.length ? `starter already passes: ${passing.map((t) => t.name).join('; ')}` : null
      })
    }
  }

  // ---- pre-PPT ----
  const p = c.prePpt
  const given: SourceFile = { name: p.given.name, text: p.given.content }
  const tests = (pred: (part: string) => boolean): SourceFile => ({
    name: p.testFile.name,
    text: buildTestFile(p, (t) => pred(t.part)),
  })
  const core = new Set(p.parts.filter((x) => x.kind === 'core').map((x) => x.id))

  job(`${w} pre-PPT: reference solution passes all ${p.tests.length} tests`, async () => {
    const r = await run([given, { name: p.starter.name, text: p.solution }, tests(() => true)], 'test')
    if (r.hasErrors) return `does not compile: ${errorsOf(r)}`
    const failing = r.tests.filter((t) => t.status !== 'OK')
    if (failing.length) return `tests failed: ${failing.map((t) => `${t.name} (${t.message})`).join('; ')}`
    const missing = p.tests.filter((t) => !r.tests.some((x) => x.name === t.name))
    if (r.tests.length !== p.tests.length) return `expected ${p.tests.length} result rows, got ${r.tests.length}`
    return missing.length ? `tests did not run: ${missing.map((t) => t.name).join('; ')}` : null
  })
  job(`${w} pre-PPT: starter compiles with TODO()s and fails every core test`, async () => {
    const r = await run([given, { name: p.starter.name, text: p.starter.content }, tests((part) => core.has(part))], 'test')
    if (r.hasErrors) return `starter does not compile: ${errorsOf(r)}`
    const passing = r.tests.filter((t) => t.status === 'OK')
    if (passing.length) return `starter already passes: ${passing.map((t) => t.name).join('; ')}`
    const stray = r.tests.filter((t) => !p.tests.some((x) => x.name === t.name))
    if (stray.length) return `result rows with undeclared names: ${stray.map((t) => t.name).join('; ')}`
    const expected = p.tests.filter((t) => core.has(t.part)).length
    return r.tests.length === expected ? null : `expected ${expected} test results, got ${r.tests.length}`
  })
  job(`${w} pre-PPT: starter alone compiles`, async () => {
    const r = await run(
      [given, { name: p.starter.name, text: p.starter.content + '\nfun main() { println("ok") }\n' }],
      'run',
    )
    return expectOutput(r, 'ok')
  })
  if (p.parts.some((x) => x.kind === 'extension')) {
    job(`${w} pre-PPT: extension tests need code the starter does not have`, async () => {
      const r = await run([given, { name: p.starter.name, text: p.starter.content }, tests((part) => !core.has(part))], 'test')
      if (!r.hasErrors) return 'extension tests compile against the bare starter'
      const elsewhere = r.messages.filter((m) => m.severity === 'ERROR' && m.file !== p.testFile.name)
      return elsewhere.length ? `errors outside the test file: ${errorsOf(r)}` : null
    })
  }
  // Each part's tests, cumulatively, pass against the solution: enabling tests in order never breaks.
  for (const part of p.parts) {
    job(`${w} pre-PPT: ${part.id} tests pass on their own against the solution`, async () => {
      const r = await run([given, { name: p.starter.name, text: p.solution }, tests((x) => x === part.id)], 'test')
      if (r.hasErrors) return `does not compile: ${errorsOf(r)}`
      const failing = r.tests.filter((t) => t.status !== 'OK')
      return failing.length ? `tests failed: ${failing.map((t) => t.name).join('; ')}` : null
    })
  }
}

const failures: string[] = []
let next = 0
let done = 0
async function worker() {
  while (next < jobs.length) {
    const j = jobs[next++]
    try {
      const problem = await j.check()
      if (problem) failures.push(`${j.label}\n      ${problem}`)
    } catch (e) {
      failures.push(`${j.label}\n      could not be checked: ${e instanceof Error ? e.message : e}`)
    }
    done++
    if (done % 20 === 0 || done === jobs.length) console.log(`  ${done}/${jobs.length} checked`)
  }
}

console.log(`kotlin check: ${jobs.length} programs against Kotlin ${KOTLIN_VERSION} (concurrency ${CONCURRENCY})`)
await Promise.all(Array.from({ length: CONCURRENCY }, worker))
mkdirSync(cacheDir, { recursive: true })
writeFileSync(cacheFile, JSON.stringify(cache))
console.log(`  ${calls} compiler calls, ${hits} cached`)

if (failures.length) {
  console.error(`\nkotlin check: ${failures.length} of ${jobs.length} failed`)
  for (const f of failures) console.error('  - ' + f)
  process.exit(1)
}
console.log(`kotlin check: ok (${jobs.length} programs)`)
