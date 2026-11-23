/**
 * Client for JetBrains' public Kotlin Playground compiler server.
 * Shared by the site (browser) and the check scripts (Node).
 */

export const KOTLIN_VERSION = '2.4.21'
const API = 'https://api.kotlinlang.org'

export interface SourceFile {
  name: string
  text: string
}

export interface CompilerMessage {
  file: string
  /** 1-based. */
  line: number
  col: number
  message: string
  severity: 'ERROR' | 'WARNING' | 'INFO'
}

export interface KotlinException {
  name: string
  message: string
  /** First stack frame inside one of the submitted files, if any. */
  file?: string
  line?: number
}

export interface JUnitResult {
  name: string
  status: 'OK' | 'FAIL' | 'ERROR'
  message: string
  output: string
  exception?: KotlinException
}

export interface RunResult {
  stdout: string
  stderr: string
  messages: CompilerMessage[]
  hasErrors: boolean
  exception: KotlinException | null
  tests: JUnitResult[]
}

/** The compiler could not be reached or gave an unusable answer. Never a wrong answer. */
export class CompilerUnavailable extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CompilerUnavailable'
  }
}

const unescape = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&amp;/g, '&')

/** Split the server's tagged text into stdout and stderr. */
export function splitStreams(text: string | null | undefined): { stdout: string; stderr: string } {
  let stdout = ''
  let stderr = ''
  const re = /<(outStream|errStream)>([\s\S]*?)<\/\1>/g
  let m: RegExpExecArray | null
  let matched = false
  while ((m = re.exec(text ?? ''))) {
    matched = true
    if (m[1] === 'outStream') stdout += unescape(m[2])
    else stderr += unescape(m[2])
  }
  if (!matched && text) stdout = unescape(text)
  return { stdout, stderr }
}

interface RawFrame {
  fileName: string | null
  lineNumber: number
}
interface RawException {
  message: string | null
  fullName: string | null
  stackTrace?: RawFrame[]
}

function toException(raw: RawException | null | undefined, fileNames: string[]): KotlinException | null {
  if (!raw) return null
  const frame = (raw.stackTrace ?? []).find(
    (f) => f.fileName && fileNames.includes(f.fileName) && f.lineNumber > 0,
  )
  return {
    name: (raw.fullName ?? 'Exception').split('.').pop()!,
    message: raw.message ?? '',
    file: frame?.fileName ?? undefined,
    line: frame?.lineNumber,
  }
}

export interface ExecuteOptions {
  timeoutMs?: number
  version?: string
}

export async function execute(
  files: SourceFile[],
  mode: 'run' | 'test' = 'run',
  opts: ExecuteOptions = {},
): Promise<RunResult> {
  const version = opts.version ?? KOTLIN_VERSION
  const body = JSON.stringify({
    args: '',
    files: files.map((f) => ({ name: f.name, text: f.text, publicId: '' })),
    confType: mode === 'test' ? 'junit' : 'java',
  })
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30000)
  let json: any
  try {
    const res = await fetch(`${API}/api/${version}/compiler/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: ctrl.signal,
    })
    if (!res.ok) throw new CompilerUnavailable(`compiler server answered HTTP ${res.status}`)
    json = await res.json()
  } catch (e) {
    if (e instanceof CompilerUnavailable) throw e
    throw new CompilerUnavailable(e instanceof Error ? e.message : String(e))
  } finally {
    clearTimeout(timer)
  }
  if (!json || typeof json !== 'object' || !json.errors) {
    throw new CompilerUnavailable('unexpected response from the compiler server')
  }

  const names = files.map((f) => f.name)
  const messages: CompilerMessage[] = []
  for (const [file, list] of Object.entries(json.errors as Record<string, any[]>)) {
    for (const e of list ?? []) {
      messages.push({
        file,
        line: (e.interval?.start?.line ?? 0) + 1,
        col: (e.interval?.start?.ch ?? 0) + 1,
        message: e.message ?? '',
        severity: e.severity === 'ERROR' ? 'ERROR' : e.severity === 'WARNING' ? 'WARNING' : 'INFO',
      })
    }
  }
  messages.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.col - b.col)

  const tests: JUnitResult[] = []
  for (const list of Object.values((json.testResults ?? {}) as Record<string, any[]>)) {
    for (const t of list ?? []) {
      const failure = t.comparisonFailure ?? t.exception
      const ex = toException(failure, names)
      tests.push({
        name: t.methodName,
        status: t.status === 'OK' ? 'OK' : t.status === 'FAIL' ? 'FAIL' : 'ERROR',
        message: ex ? (t.status === 'FAIL' ? ex.message : `${ex.name}${ex.message ? ': ' + ex.message : ''}`) : '',
        output: splitStreams(t.output).stdout,
        exception: ex ?? undefined,
      })
    }
  }

  const { stdout, stderr } = splitStreams(json.text)
  return {
    stdout,
    stderr,
    messages,
    hasErrors: messages.some((m) => m.severity === 'ERROR'),
    exception: toException(json.exception, names),
    tests,
  }
}
