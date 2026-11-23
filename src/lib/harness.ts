import type { TestCase } from '../content/schema'

export const SOLUTION_FILE = 'Solution.kt'
export const HARNESS_FILE = 'HiddenTests.kt'

const kstr = (s: string) => JSON.stringify(s).replace(/\$/g, '\\$')

/** Build the hidden test file: a main() that runs each case and prints one ## line per case. */
export function buildHarness(tests: TestCase[], support = ''): string {
  const calls = tests
    .map((t) => `    check__(${kstr(t.name)}, { ${t.expected} }, { ${t.actual} })`)
    .join('\n')
  return `${support}

private fun show__(v: Any?): String =
    v.toString().replace("\\\\", "\\\\\\\\").replace("\\n", "\\\\n").replace("\\t", "\\\\t").replace("\\r", "\\\\r")

private fun check__(name: String, expected: () -> Any?, actual: () -> Any?) {
    val e = expected()
    try {
        val a = actual()
        if (a == e) println("##PASS\\t$name")
        else println("##FAIL\\t$name\\t\${show__(e)}\\t\${show__(a)}")
    } catch (t: Throwable) {
        println("##ERROR\\t$name\\t\${show__(t::class.simpleName + (t.message?.let { ": " + it } ?: ""))}")
    }
}

fun main() {
${calls}
    println("##DONE")
}
`
}

export interface CaseResult {
  name: string
  status: 'pass' | 'fail' | 'error' | 'missing'
  expected?: string
  actual?: string
  error?: string
}

const unshow = (s: string) =>
  s.replace(/\\(\\|n|t|r)/g, (_, c) => (c === 'n' ? '\n' : c === 't' ? '\t' : c === 'r' ? '\r' : '\\'))

/** Parse harness stdout into per-case results plus whatever the student's own code printed. */
export function parseHarness(
  stdout: string,
  tests: TestCase[],
): { results: CaseResult[]; output: string; finished: boolean } {
  const byName = new Map<string, CaseResult>()
  const other: string[] = []
  let finished = false
  for (const line of stdout.split('\n')) {
    const at = line.indexOf('##')
    const rest = at >= 0 ? line.slice(at) : ''
    if (rest.startsWith('##DONE')) {
      finished = true
      if (at > 0) other.push(line.slice(0, at))
    } else if (/^##(PASS|FAIL|ERROR)\t/.test(rest)) {
      if (at > 0) other.push(line.slice(0, at))
      const [tag, name, a, b] = rest.split('\t')
      if (tag === '##PASS') byName.set(name, { name, status: 'pass' })
      else if (tag === '##FAIL')
        byName.set(name, { name, status: 'fail', expected: unshow(a ?? ''), actual: unshow(b ?? '') })
      else byName.set(name, { name, status: 'error', error: unshow(a ?? '') })
    } else {
      other.push(line)
    }
  }
  return {
    results: tests.map((t) => byName.get(t.name) ?? { name: t.name, status: 'missing' }),
    output: other.join('\n').replace(/\n+$/, ''),
    finished,
  }
}
