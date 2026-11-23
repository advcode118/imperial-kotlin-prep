# Redesign: rationale

Goal: make the site nicer to *work in*. Nothing about the content changed:
no lesson text, Kotlin, answer, hidden test or pre-PPT test was edited. The
only data change is one new optional field, `dueAt`, on a week in
`src/content/weeks/index.ts`, so the dashboard can count down to the deadline.

The findings this responds to are in [AUDIT.md](AUDIT.md); scores before and
after are in [SCORES.md](SCORES.md).

## Principles

- **A textbook with a workbench.** Reading pages stay a single calm column of
  serif text. Working pages (a write-a-function drill, the pre-PPT) become a
  two-pane workbench that fills the window and never scrolls as a whole.
- **Progress is information.** Counts ("2 of 13"), thin neutral bars and the
  words "Correct" / "Attempted". No points, streaks, badges, celebration
  animations or bright colour.
- **Status never relies on colour.** Every state also has a word, a mark or a
  shape.
- **The keyboard is a first-class way in.** Everything can be reached and run
  without a mouse, and focus is always visible.

## Screenshots (after)

Taken from the production build with a little saved progress so states show.

| | Desktop light | Desktop dark | Mobile |
| --- | --- | --- | --- |
| Home | [png](after/home-desktop-light.png) | [png](after/home-desktop-dark.png) | [png](after/home-mobile.png) |
| Lesson | [png](after/lesson-desktop-light.png) | [png](after/lesson-desktop-dark.png) | [png](after/lesson-mobile.png) |
| Drill work view | [png](after/drill-desktop-light.png) | [png](after/drill-desktop-dark.png) | [png](after/drill-mobile.png) |
| Pre-PPT, focus mode | [png](after/pre-ppt-focus-desktop-light.png) | [png](after/pre-ppt-focus-desktop-dark.png) | [png](after/pre-ppt-focus-mobile.png) |

Regenerate with `npm run build && npm run preview` and then
`npm run screenshots -- http://localhost:4173/imperial-kotlin-prep/ docs/design/after`.

## Wayfinding

| Change | Why |
| --- | --- |
| Compact top bar with a breadcrumb (Week 1 / Foundations / lesson title) | The audit found the highlighted sidebar row was the only "where am I". The breadcrumb survives the sidebar being closed, and its middle items are links back up. |
| Sidebar grouped into Foundations, PPT skills, Drill book, Before the PPT; each group folds, shows a count and a thin bar | Twenty-six flat links became four scannable groups. The group you are in always stays open. Folding and the sidebar's open/closed state are remembered. |
| Previous / Next cards at the end of every lesson, drill, overview, drill-book and technique page | One ordered walk through the week (`src/lib/nav.ts`): overview, 18 lessons, drill book, 48 drills, pre-PPT, technique. Moving on from a lesson marks it read, as before. |
| "Continue where you left off" on the home page | The last page and its scroll position are saved; each drill level also remembers the question last open. The link restores both. |
| `[` and `]` for previous and next, `/` for a jump palette, `?` for a shortcut sheet | Fast movement for people who keep their hands on the keyboard. Single-key shortcuts are ignored while typing in an editor or an answer box; Esc leaves the editor first. |

The jump palette searches every lesson, drill and page by title and section. It
is deliberately a plain filtered list, not a command system.

## Work view

One component (`src/components/WorkView.tsx`) serves drills and the pre-PPT.

- **Split pane.** Instructions left, code above results right. The divider
  drags, moves with the arrow keys when focused, resets on double-click, and
  its position is remembered separately for drills and the pre-PPT.
- **Editor.** At least twelve lines tall, with a resize handle. Kotlin syntax
  colouring as before. The editor was 71px tall for a one-line starter.
- **Cmd/Ctrl+Enter** runs from inside any editor, including lesson examples.
  **Cmd/Ctrl+S** does nothing anywhere on the site, because drafts are saved as
  you type and the browser's "save page" dialog is only an interruption. The
  bar says "draft saved" instead of showing a toast.
- **Running.** A quiet line with a small spinner, the elapsed seconds and a
  Cancel link; the Run button is disabled meanwhile. Cancel aborts the request
  and marks nothing. After eight seconds one sentence explains the compiler
  server is slow.
- **Results.** One row per test. A failing value shows Expected and Got on two
  aligned lines with the differing part highlighted (common start and end are
  left plain). An exception shows "Threw" and the exception. Rows carry a
  hidden "Passed / Failed" prefix for screen readers.
- **Compile errors.** Each becomes a marker in the editor gutter and an
  underline at the position; the "line 3:14" label in the results is a button
  that moves the cursor there.
- **Reset to starter** asks first, since it discards work.

### Drills

A level opens **one question at a time**. A strip of numbered squares shows the
whole level: a tick on a green tint for answered correctly, a dashed outline
for attempted, plain for untouched, a ring for the current one. Each square's
label says the same in words. "First unanswered" jumps ahead. "All questions"
keeps the old list for skimming a level, and each title there links back to the
one-at-a-time view.

Write-a-function questions use the split pane. Multiple-choice, fill-in and
predict questions do not: they have no editor, so splitting them would put a
two-line answer box in half a screen. They show as a single card in the reading
column with the same navigator and Previous / Next.

### Pre-PPT

- The spec is **tabbed**: Brief, one tab per part, Assessment. The part you are
  reading sits beside the code, so the 8,800px page is now one screen.
- The right side has the three files as tabs, the Run button, and under the
  editor the **tests for the part being read**, each with its enable checkbox,
  result mark, failure message and (on click) its source. "Enable next test"
  keeps the uncomment-one-at-a-time rhythm; "Show all parts" lists all 27.
- Each part's worked solution is a reveal at the end of that part's tab.
- The timer is a single line in the bar above both panes, always visible. The
  15-minute warning and the persisted state are unchanged.

### Focus mode

For the two-hour sitting. It removes the top bar and sidebar and leaves the
spec, the workspace and the timer. It is remembered across reloads. Esc (or the
button) leaves it after a confirm, so a stray key press cannot break
concentration; Esc inside the editor only leaves the editor. Site-wide
shortcuts for moving between pages still work, by design: focus mode hides
distraction, it does not lock the reader in.

### Mobile

Below 960px the three panes become tabs (Instructions / Code / Output) and the
Run button sticks to the bottom of the screen. Running switches to Output, and
the Output tab shows the pass count. The question strip becomes one scrolling
row. The sidebar is a drawer, as before.

## Dashboard home

- **Continue where you left off** (once there is somewhere to continue).
- **Next recommended step**: the first unread lesson, else the first drill not
  yet answered correctly, else the pre-PPT, else the technique page. A new
  visitor sees "Start here" pointing at the Week 1 overview.
- **Countdown** to Fri 27 Nov 2026 19:00 London, in days and hours, with a
  reminder to confirm on Scientia.
- **Week 1 card**: lessons read per group, drills correct per level, pre-PPT
  parts passing. Each row is a link to the next thing in it.
- **Later in the course**: the roadmap as a compact list.

## Type, colour and components

Tokens are in `src/styles/tokens.css`.

- **Type.** Source Serif 4 for prose, Inter for interface, JetBrains Mono for
  code, as before. A 1.2 scale on a 17px root; the reading column is 41rem,
  about 70 characters.
- **Palette.** Warm paper and ink neutrals with one accent, an ink blue
  (`#2c5777` light, `#9cc0db` dark). Green, red and amber appear only for
  pass, fail and warning, each with a tinted background and a word or mark.
- **Contrast.** The faintest text colour went from about 3.3:1 to 5.6:1 in
  light and from 3.8:1 to 6.6:1 in dark; code comments and line numbers
  likewise. A separate `--border-strong` gives inputs and controls an edge of
  at least 3:1. Disabled buttons are a muted style, not a lowered opacity.
  This is enforced by the axe tests, not by eye.
- **Components** share one vocabulary: callouts and From Haskell boxes (left
  rule and tint), code blocks (border, Copy button on hover or focus,
  keyboard-scrollable), buttons (filled, quiet, link), underlined tabs,
  `kbd`, and status chips.
- **Focus** is a 2px accent ring on everything. A skip link jumps to the
  content.
- **Motion.** The only animations are the sidebar drawer, the group caret and
  the run spinner; all stop under `prefers-reduced-motion`.

## Performance

| Change | Effect |
| --- | --- |
| Each page is its own chunk | The home page no longer downloads the lesson, drill or pre-PPT code. |
| CodeMirror is a lazy chunk (431 kB, 138 kB gzipped) | Loaded only when a page shows an editor. Until it arrives, the code is shown as plain text in a box of the same size, so nothing jumps. |
| highlight.js is a lazy chunk (29 kB) | Static code appears immediately and is coloured when the chunk arrives. |
| Fonts: Latin subsets only, four files instead of 24 emitted | The two faces used above the fold (Source Serif, Inter) are preloaded. |
| The opening page's chunk is preloaded by a small inline script, and rendering waits for it | Routing is by hash, so the server cannot know the page. The script reads the hash and adds `modulepreload` links while the main bundle is still downloading; the first paint is then the page itself rather than a loading line. |

First-load JavaScript went from 1,003 kB (318 kB gzipped) to 473 kB (144 kB
gzipped) for the home page.

## Checks added

- `tests/a11y.spec.ts`: axe on ten routes plus four states (results showing,
  focus mode, both dialogs, phone width), in light and dark. Any serious or
  critical violation fails, colour contrast included.
- `tests/smoke.spec.ts`: previous/next by link and key, resume with scroll
  position, Cmd/Ctrl+Enter running a drill against a mocked compiler,
  expected/actual output, gutter markers, cancel, reset, divider, phone tabs
  and sticky Run, pre-PPT part tabs and test toggles, focus mode, theme toggle,
  dashboard.
- Both run in `npm run check` and in CI, against the production build served by
  `vite preview`. The compiler is mocked in these tests; the 174 real Kotlin
  programs are still checked against the real compiler by `check:kotlin`.
- `npm run check:lighthouse` (`scripts/lighthouse.mjs`): Lighthouse on home, a
  lesson, a drill level and the pre-PPT, median of three, failing under
  performance 90, accessibility 95 or best practices 95. In CI it runs as a
  reported, non-blocking step; see SCORES.md for why.

## Not done, and why

- **Lighthouse does not gate deploys.** Performance scores on shared CI runners
  vary from run to run, and a noisy gate would block content fixes in the week
  of the deadline. It runs in CI and prints its table; accessibility, which is
  deterministic, is gated through axe instead.
- **Non-code questions are not split-pane.** Explained above: no editor to put
  on the right.
- **Content is still in the main bundle** (about half of the remaining 473 kB).
  The sidebar, breadcrumb, palette and dashboard all need every title, so
  splitting it means building a separate index of titles. That is a change to
  the content pipeline rather than to presentation, and the scores did not
  need it.
- **No drag-to-resize between editor and results.** The editor has a resize
  handle and the right-hand column scrolls; a second draggable divider added
  complexity for little gain.
- **The editor height is not remembered** across questions or reloads; the
  divider position is.
- **No keyboard shortcut for the theme or focus mode**, to keep the set small
  enough to remember.
- **Focus mode does not go full-screen or block navigation.** A browser
  full-screen request needs its own exit handling and conflicts with Esc.
- **Lesson check questions keep their card layout** inside the reading flow;
  they are quick checks, not work sessions.
- **No full-text search.** The palette searches titles only.
