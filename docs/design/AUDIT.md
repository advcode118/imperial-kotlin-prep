# Audit of the site before the redesign

Audited on 23 November 2026 against the live site at commit `4901c65`
(<https://advcode118.github.io/imperial-kotlin-prep/>), in headless Chromium at
1440×900 and 390×844, light and dark. I went through it the way a student
would: open the home page, start Week 1, read a lesson and run an example, work
through a drill level, then attempt the pre-PPT exercise with the timer running.

Two sets of numbers appear below and are kept apart:

- **Reported baseline**: the figures supplied with the redesign brief (a
  separate headless-Chrome pass on the live site).
- **Measured here**: what `scripts/lighthouse.mjs`, axe and a scripted
  walk-through produced on this machine. Raw output is in
  [`before/`](before/).

## Screenshots (before)

| | Desktop light | Desktop dark | Mobile |
| --- | --- | --- | --- |
| Home | [png](before/home-desktop-light.png) | [png](before/home-desktop-dark.png) | [png](before/home-mobile.png) |
| Lesson | [png](before/lesson-desktop-light.png) | [png](before/lesson-desktop-dark.png) | [png](before/lesson-mobile.png) |
| Drill level | [png](before/drill-desktop-light.png) | [png](before/drill-desktop-dark.png) | [png](before/drill-mobile.png) |
| Pre-PPT (top of page) | [png](before/pre-ppt-desktop-light.png) | [png](before/pre-ppt-desktop-dark.png) | [png](before/pre-ppt-mobile.png) |

Also: [the whole pre-PPT page](before/pre-ppt-desktop-light-full.png),
the pre-PPT workspace with the timer running
([desktop](before/pre-ppt-workspace-desktop.png),
[mobile](before/pre-ppt-workspace-mobile.png)), and
[a drill after running its tests](before/drill-result-desktop-light.png).
There was no focus mode before, so there is no "before" picture of one.

## Walk-through findings

### 1. Arriving (home)

- The home page is an introduction and a roadmap table. The only link in the
  main column is "Kotlin Web Server" inside the table; nothing says "start
  here".
- Progress is one phrase in the table ("0 of 18 lessons read"). Drills and the
  pre-PPT are not mentioned.
- No deadline countdown. The due date is a table cell.
- Coming back the next day, nothing remembers where I was. No element on the
  page mentions continuing or resuming (measured: zero matches).

### 2. Reading a lesson

- The reading column, serif and line height are good and were kept.
- The first lesson has a "Functions →" link at the bottom, so next/previous
  exists for lessons. It is a bare text link, easy to miss, and there is no
  breadcrumb: the only "where am I" cue is the highlighted sidebar row.
- The sidebar is one flat list of 26 links that cannot be folded. Group headings
  and counts are 12px in the faintest grey.
- Running an example shows "Running…" on the button and "Compiling and
  running…" underneath, but no elapsed time and no way to cancel.
- Code blocks have no copy button. Wide code blocks scroll sideways but cannot
  be reached with the keyboard (axe: `scrollable-region-focusable`).
- No keyboard shortcuts: pressing `/` or `?` does nothing (measured: no dialog
  opens).

### 3. Doing drills

- A level is one page, 5,764px tall at 1440px wide (13 cards for Standard) and
  6,370px on a phone. There is no way to see which questions are done without
  scrolling past all of them.
- Editors for write-a-function questions are 71px tall for a one-line starter
  and 117px for three lines (measured for all seven on the Standard page). They
  cannot be resized. Writing a six-line function means working in a box that
  grows a line at a time and pushes the Run button down the page.
- There is no next/previous question and no "first unanswered". Navigation
  between levels exists at the very bottom of the page.
- After running tests, each failing row reads "threw NotImplementedError…" or
  "expected X but got Y" in one line of small type. For a wrong value the two
  values are inline in a sentence, so spotting a one-character difference is
  slow.
- Compile errors are listed with "line 1:5" as plain text. Nothing marks the
  line in the editor and the text is not clickable.
- Cmd/Ctrl+Enter does nothing; Cmd/Ctrl+S opens the browser's save dialog.
- Status is a small green tick only; an attempted-but-wrong question looks the
  same as an untouched one.

### 4. The pre-PPT exercise with the timer

- The page is 8,838px tall on desktop and 11,106px on a phone. The Workspace
  heading starts 6,328px down (8,494px on a phone). Reading Part 2's
  instructions and then editing code means scrolling roughly six screens each
  way, every time.
- The timer sits inside the workspace, so it is off-screen whenever the spec is
  on-screen.
- The 27 tests are one long column of rows under the editor, below the fold of
  the editor itself. Enabling the next test and seeing its result involves more
  scrolling.
- Worked solutions are in a third section after the workspace.
- There is no way to hide the site navigation for a timed sitting.
- On a phone everything stacks in the same order, so the distance between
  instructions and editor is larger still.

### 5. Colour, type and accessibility

- Small labels use `--faint` (`#8f8b83` on `#fbfaf7`, about 3.3:1; in dark
  `#77746d` on `#17181a`, about 3.8:1). This is the sidebar group headings and
  counts, eyebrow/kicker text, question type labels, "3 hidden tests", table
  headers, line numbers and code comments.
- The theme button's accessible name ("Switch colour theme") does not contain
  its visible text ("Dark").
- CodeMirror editors have no accessible name.
- The drill page jumps from `h1` to `h3`.

## Numbers

### Reported baseline (from the brief)

| Page | Performance | Accessibility | Best practices |
| --- | --- | --- | --- |
| Home | 82 | 95 | 100 |
| Drills / Standard | 82 | 91 | 100 |

Colour-contrast audit failing on both; FCP/LCP about 2.9s; TBT 370ms on
drills; about 1 MB of JavaScript in one bundle.

### Measured here: Lighthouse

Median of three runs per page. "Desktop" is Lighthouse's desktop preset;
"mobile" is its default preset (slow 4G, 4× CPU slowdown). The desktop numbers
were the same against the live site and against the same commit built and
served locally; the mobile numbers are from the local build.

| Page | Desktop perf / a11y / BP | Mobile perf / a11y / BP | Mobile LCP | Mobile TBT | Contrast audit |
| --- | --- | --- | --- | --- | --- |
| Home | 95 / 95 / 100 | 92 / 95 / 100 | 0.75s | 81ms | fail |
| Lesson (Strings) | 100 / 93 / 100 | 84 / 93 / 100 | 2.43s | 251ms | fail |
| Drills / Standard | 100 / 91 / 100 | 95 / 91 / 100 | 0.75s | 264ms | fail |
| Pre-PPT | 93 / 93 / 100 | 84 / 93 / 100 | 0.75s | 238ms | fail |

My desktop performance scores are higher than the reported 82. I could not
reproduce 82 with the desktop preset on this machine; the reported FCP of 2.9s
is closer to what the mobile preset's network throttling gives. The
accessibility scores and the contrast failure match the report exactly.

### Measured here: axe

Elements with a serious or critical violation, per page (identical in light and
dark):

| Page | Elements | Rules |
| --- | --- | --- |
| Home | 14 | color-contrast 13, label-content-name-mismatch 1 |
| Overview | 20 | color-contrast 19, label-content-name-mismatch 1 |
| Lesson | 54 | color-contrast 48, aria-input-field-name 4, label-content-name-mismatch 1, scrollable-region-focusable 1 |
| Drills / Standard | 52 | color-contrast 43, aria-input-field-name 7, label-content-name-mismatch 1, scrollable-region-focusable 1 |
| Pre-PPT | 76 | color-contrast 73, aria-input-field-name 1, label-content-name-mismatch 1, scrollable-region-focusable 1 |
| Technique | 13 | color-contrast 11, label-content-name-mismatch 1, scrollable-region-focusable 1 |

### Measured here: payload

One JavaScript file of 1,003 kB (318 kB gzipped) loaded on every page,
containing React, the router, all content, CodeMirror and highlight.js. Every
subset of three font families was emitted (24 font files); none was preloaded.

## What the audit asked of the redesign

1. Put instructions and editor side by side, for drills and for the pre-PPT.
2. Give the editor room, and make running, failing and fixing fast to read.
3. Always show where you are, what is next, and how to get back.
4. Make the home page a dashboard, not a preface.
5. Fix contrast everywhere and make status readable without colour.
6. Stop sending CodeMirror to pages that have no editor.

How each was answered is in [REDESIGN.md](REDESIGN.md); the scores afterwards
are in [SCORES.md](SCORES.md).
