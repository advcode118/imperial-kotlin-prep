# Adding a week

A week is a folder of content files. No application code changes are needed beyond registering the folder.
The example below adds Week 2 (Pawn Race).

## 1. Copy the shape of Week 1

```text
src/content/weeks/week2/
  index.ts                 three lines, copied from week1/index.ts
  week.yaml                overview (intro, facts, files, checklist) and the ordered lesson groups
  technique.yaml           the technique page: intro + sections, each marked spec or advice
  lessons/<lesson-id>.yaml one file per lesson
  drills/warm-up.yaml      a list of questions per level; also standard, stretch, ppt-strength
  preppt/preppt.yaml       the practice exercise: text, parts, tests
  preppt/files/            its Kotlin files (given file, starter, reference solution) and any extras
```

`index.ts` only changes the exported name:

```ts
import { buildWeek } from '../../load'

const yaml = import.meta.glob('./**/*.yaml', { eager: true, import: 'default' })
const raw = import.meta.glob('./preppt/files/**/*', { eager: true, query: '?raw', import: 'default' })

export const week2 = buildWeek({ ...yaml, ...raw })
```

## 2. Register it

In `src/content/weeks/index.ts`, find the roadmap entry for the week and add its content:

```ts
import { week2 } from './week2'

{ id: 'week2', number: 2, title: 'Data structures', exercise: 'Pawn Race', ..., content: week2 },
```

The folder name must equal the entry's `id`. An entry with `content` is live; one without is listed as
"coming soon". That is the only TypeScript you touch.

## 3. Write the content

The schema is `src/content/schema.ts`; the YAML mirrors it. Week 1 is the reference for every construct.

**Lessons** (`lessons/<id>.yaml`) have a `title`, a `summary` and a list of `blocks`. Each block is a
single-key map:

```yaml
blocks:
  - prose: |
      Markdown.
  - example:
      title: Optional caption
      code: |
        fun main() { println("runs as written") }
      # mode: test      for a JUnit test class instead of a program
      # expect: fails   if it is meant to throw or to have a failing test
  - haskell: |
      Markdown for a "From Haskell" box.
  - note: { title: A side note, md: "Markdown." }
  - check:
      id: my-lesson-c1
      type: predict            # or mc, fill
      title: ...
      prompt: ...
      code: ...
      expected: ...
      explanation: ...
```

Each lesson needs 2–4 examples and 2–3 checks. List the lesson id under a group in `week.yaml` to place
it in the sidebar.

**Drills** (`drills/<level>.yaml`) are lists of questions. Every question has `id`, `type`, `title`,
`lesson` (the lesson it practises), `prompt` and `explanation`, plus:

| type | fields |
| --- | --- |
| `mc` | `options`, `answer` (index), optional `code` |
| `fill` | `code` with exactly one `____`, `accepted` (list), optional `expectedOutput` |
| `predict` | `code` (a program with `main`), `expected` (its exact output) |
| `write` | `starter`, `solution`, `tests` (each `name`, `actual`, `expected` as Kotlin expressions), optional `support` (extra hidden Kotlin for the tests) |

Give a `fill` question an `expectedOutput` whenever its code is a complete program: the checks then run
every accepted answer. Names in `support` should end in `__` so they cannot clash with a student's.

**The checklist** in `week.yaml` drives the overview page and `docs/COVERAGE.md`. Each item names a concept
the real exercise needs and lists lesson ids, drill ids and pre-PPT part ids. Every item needs at least one
lesson and one drill, and every lesson and pre-PPT part must appear in at least one item.

**The pre-PPT exercise** (`preppt/preppt.yaml`) has `preamble` sections, `parts` (each with `spec` and a
worked `solution` in Markdown, `kind: core` or `extension`), `closing` sections, the file mapping, and
`tests`. Each test has an `id`, the `part` it belongs to, a `name` (the method name) and a `body`. Tests are
enabled in file order, so list them in part order. Code lives in `preppt/files/`:

- the *given* file (read-only for the student),
- the *starter* (signatures with `TODO()` for the core parts),
- the full reference *solution*,
- any extras for the downloadable project (`extraFiles`).

Use a different setting from the real exercise, and paraphrase: do not paste lab specifications into the
repository.

**Internal links** in Markdown use hash routes: `[text](#/week/week2/lesson/<id>)`, `.../drills`,
`.../drills/<level>?q=<drill-id>`, `.../pre-ppt`, `.../technique`.

## 4. Check it

```bash
npm run coverage   # regenerate docs/COVERAGE.md
npm run check
```

`npm run check` will tell you about: schema mistakes, duplicate ids, checklist entries pointing at things
that do not exist, broken links, examples that do not compile, predicted outputs that are wrong, accepted
fill-in answers that do not produce the stated output, reference solutions that fail their hidden tests,
starters that already pass, and a pre-PPT solution that fails its tests or a starter that does not compile.
Fix what it lists and run it again; results are cached, so only what you changed is recompiled.

Then `npm run dev` and read the week through in the browser, in both themes and at phone width.

## 5. Publish

Push to `main`. The workflow runs `npm run check` and deploys to GitHub Pages only if it passes.

## Things that are not per-week

- The four drill levels and their descriptions are in `src/content/schema.ts` (`LEVELS`).
- The Kotlin version used by the compiler server is `KOTLIN_VERSION` in `src/lib/kotlin.ts`. Available
  versions are listed at <https://api.kotlinlang.org/versions>.
- A new *kind* of block or question means extending the schema, `load.ts`, the component that renders it
  and the check scripts. Nothing in Week 1 should need that for the remaining weeks.
