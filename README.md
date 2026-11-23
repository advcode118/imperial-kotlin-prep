# imperial-kotlin-prep

Week-by-week preparation for the Kotlin practical programming tests (PPTs) in Imperial College London's
COMP40009 Computing Practical 1, written as a plain study guide with exercises.

Live site: <https://advcode118.github.io/imperial-kotlin-prep/>

This is an unofficial study aid. It paraphrases what each exercise is about and practises the same skills in
different settings; it does not contain the lab specifications or solutions to them.

## What is in it

Week 1 (Kotlin Web Server) is complete. Later weeks appear on the roadmap as "coming soon".

- **Overview**: what the exercise asks for, dates, starter files, and a checklist of concepts linked to
  lessons, drills and pre-PPT parts.
- **Lessons**: 13 foundations lessons and 5 "PPT skills" lessons, each with editable, runnable Kotlin,
  "From Haskell" notes and inline check questions.
- **Drill book**: 48 auto-checked questions at four levels (predict the output, fill the blank, multiple
  choice, and write-a-function with hidden tests run live).
- **Pre-PPT exercise**: a two-hour practice project in the style of a lab, with a starter file, tests you
  enable one at a time, a timer, a downloadable project and worked solutions behind reveals.
- **PPT technique**: how to work through the lab, with spec-derived statements and general advice
  labelled separately.

Progress (lessons read, questions passed, parts done, timer, your code) is kept in the browser's
localStorage only. There are no accounts and no server.

Kotlin is compiled and run by JetBrains' public Kotlin Playground server (`api.kotlinlang.org`), called
directly from the browser.

## Run it locally

Needs Node 20 or later.

```bash
npm install
npm run dev        # http://localhost:5173/imperial-kotlin-prep/
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm run check` | Everything CI runs: type check, content checks, coverage doc check, Kotlin checks, production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run check:content` | Schema, unique ids, checklist references, internal links |
| `npm run check:kotlin` | Runs every example, predicted output, fill-in answer, reference solution and the pre-PPT project against the real compiler |
| `npm run coverage` | Regenerates `docs/COVERAGE.md` |
| `npm run build` / `npm run preview` | Production build into `dist/`, and a local server for it |

`check:kotlin` needs network access. It retries with backoff and caches results by content hash in
`node_modules/.cache`, so only changed programs are re-run locally. Set `KOTLIN_CHECK=skip` to skip it
when offline.

## How it is put together

```text
src/content/schema.ts          the typed content schema
src/content/load.ts            turns a week folder into a WeekContent value
src/content/weeks/index.ts     the roadmap: every week, live or coming soon
src/content/weeks/week1/       all Week 1 content, as YAML and Kotlin files
src/lib/                       compiler client, hidden-test harness, progress store
src/components, src/pages      the application; knows nothing about any particular week
scripts/                       the checks
docs/COVERAGE.md               concept -> lessons -> drills -> pre-PPT part (generated)
docs/ADDING_A_WEEK.md          how to add Week 2
```

The site is a static Vite + React + TypeScript build using hash routing, deployed to GitHub Pages by
`.github/workflows/deploy.yml` on every push to `main`, after `npm run check` passes.
