/**
 * Typed content schema. A week is plain data: lessons, a drill book,
 * a pre-PPT exercise and a technique page. See docs/ADDING_A_WEEK.md.
 */

export type Level = 'warm-up' | 'standard' | 'stretch' | 'ppt-strength'

export const LEVELS: { id: Level; title: string; blurb: string }[] = [
  { id: 'warm-up', title: 'Warm-up', blurb: 'One idea at a time. Mostly reading code and filling small gaps.' },
  { id: 'standard', title: 'Standard', blurb: 'Short functions and the everyday library calls.' },
  { id: 'stretch', title: 'Stretch', blurb: 'Several ideas combined; function types and closures.' },
  { id: 'ppt-strength', title: 'PPT-strength', blurb: 'The size and shape of a single function in the real exercise.' },
]

interface QuestionBase {
  /** Globally unique id (also used as the anchor and the progress key). */
  id: string
  title: string
  /** Markdown. */
  prompt: string
  /** Markdown shown after an attempt or on "Show solution". */
  explanation: string
  /** Lesson id this question practises (used for back-links). */
  lesson?: string
}

export interface McQuestion extends QuestionBase {
  type: 'mc'
  code?: string
  options: string[]
  /** Index into options. */
  answer: number
}

export interface FillQuestion extends QuestionBase {
  type: 'fill'
  /** Kotlin with exactly one `____` marking the blank. */
  code: string
  /** Accepted answers; compared after trimming and collapsing whitespace. */
  accepted: string[]
  /**
   * If set, the check script substitutes every accepted answer into `code`,
   * runs it, and requires this exact output.
   */
  expectedOutput?: string
}

export interface PredictQuestion extends QuestionBase {
  type: 'predict'
  /** A complete program with a main(). */
  code: string
  /** Exact stdout; verified against the real compiler by the check script. */
  expected: string
}

export interface TestCase {
  name: string
  /** Kotlin expression evaluated against the student's code. */
  actual: string
  /** Kotlin expression giving the expected value (compared with ==). */
  expected: string
}

export interface WriteQuestion extends QuestionBase {
  type: 'write'
  starter: string
  /** Reference solution: must pass every test (verified by the check script). */
  solution: string
  tests: TestCase[]
  /** Extra Kotlin placed in the hidden test file before main(). */
  support?: string
}

export type Question = McQuestion | FillQuestion | PredictQuestion | WriteQuestion
export type CheckQuestion = McQuestion | FillQuestion | PredictQuestion
export type Drill = Question & { level: Level }

export type Block =
  | { kind: 'prose'; md: string }
  | ExampleBlock
  /** "From Haskell" callout. */
  | { kind: 'haskell'; md: string }
  | { kind: 'note'; title: string; md: string }
  | { kind: 'check'; question: CheckQuestion }

/**
 * Editable, runnable Kotlin. `run` examples are programs with a main();
 * `test` examples are JUnit test classes. The check script compiles and runs
 * every example and requires the stated outcome.
 */
export interface ExampleBlock {
  kind: 'example'
  id: string
  title?: string
  code: string
  mode: 'run' | 'test'
  /** `fails` = a deliberately failing test or a deliberately thrown exception. */
  expect: 'ok' | 'fails'
}

export interface Lesson {
  id: string
  title: string
  /** One-line summary for tables of contents. */
  summary: string
  blocks: Block[]
}

export interface LessonGroup {
  id: string
  title: string
  blurb: string
  lessons: Lesson[]
}

export interface ChecklistItem {
  /** What the real exercise needs. */
  concept: string
  detail: string
  lessons: string[]
  drills: string[]
  /** Pre-PPT part ids. */
  parts: string[]
}

export interface Overview {
  /** Markdown. */
  intro: string
  facts: { label: string; value: string }[]
  files: { name: string; role: string }[]
  checklist: ChecklistItem[]
}

export interface PptTest {
  id: string
  part: string
  /** Method name without backticks. */
  name: string
  /** Body of the test method (statements). */
  body: string
}

export interface PptPart {
  id: string
  title: string
  kind: 'core' | 'extension'
  /** Markdown spec for this part. */
  spec: string
  /** Markdown worked solution (hidden behind a reveal). */
  solution: string
}

export interface ProjectFile {
  name: string
  /** Where the file lives in the downloadable project. */
  path: string
  content: string
}

export interface PrePpt {
  id: string
  title: string
  subtitle: string
  durationMinutes: number
  /** Markdown sections before the parts: Aims, Introduction, Getting started. */
  preamble: { title: string; md: string }[]
  parts: PptPart[]
  /** Markdown: assessment note etc. */
  closing: { title: string; md: string }[]
  /** Read-only support file (the Http.kt equivalent). */
  given: ProjectFile
  /** The file the student edits. */
  starter: ProjectFile
  /** Full reference solution for the student file. */
  solution: string
  testFile: { name: string; path: string; className: string; header: string }
  tests: PptTest[]
  /** Extra files for the downloadable project only. */
  extraFiles: ProjectFile[]
}

export interface TechniqueSection {
  id: string
  title: string
  source: 'spec' | 'advice'
  md: string
}

export interface WeekContent {
  overview: Overview
  groups: LessonGroup[]
  drills: Drill[]
  prePpt: PrePpt
  technique: { intro: string; sections: TechniqueSection[] }
}

export interface Week {
  id: string
  number: number | null
  title: string
  /** Short label of the assessed exercise. */
  exercise: string
  due: string
  /** The deadline as an ISO instant, when it is known exactly (drives the countdown). */
  dueAt?: string
  topics: string
  kind: 'ppt' | 'test'
  content?: WeekContent
}
