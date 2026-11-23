# Scores before and after

Before: commit `4901c65`. After: the redesign. Method and raw output for the
"before" column are in [AUDIT.md](AUDIT.md) and [`before/`](before/); raw
output for "after" is in [`after/`](after/).

## axe (serious and critical violations)

Elements in violation per page. Identical in light and dark, before and after.

| Page | Before | After |
| --- | --- | --- |
| Home | 14 | 0 |
| Overview | 20 | 0 |
| Lesson | 54 | 0 |
| Drills / Standard | 52 | 0 |
| Pre-PPT | 76 | 0 |
| Technique | 13 | 0 |

"After" is enforced by `tests/a11y.spec.ts` on every push: ten routes and four
further states (test results showing, pre-PPT focus mode, the jump palette and
help sheet, phone width), each in light and dark, with zero serious or critical
violations allowed. Colour contrast is one of the rules.

## Lighthouse

Median of three runs per page with `scripts/lighthouse.mjs`, Lighthouse 13,
headless Chromium. Scores are performance / accessibility / best practices.

### Desktop preset (the thresholds apply to this one)

| Page | Reported baseline | Before, measured | After, local build | After, live site |
| --- | --- | --- | --- | --- |
| Home | 82 / 95 / 100 | 95 / 95 / 100 | 100 / 100 / 100 | LIVE_D_HOME |
| Lesson (Strings) | not given | 100 / 93 / 100 | 100 / 100 / 100 | LIVE_D_LESSON |
| Drills / Standard | 82 / 91 / 100 | 100 / 91 / 100 | 100 / 100 / 100 | LIVE_D_DRILLS |
| Pre-PPT | not given | 93 / 93 / 100 | 100 / 100 / 100 | LIVE_D_PREPPT |

"Reported baseline" is the figure supplied with the redesign brief. "Before,
measured" is this script against the live site at `4901c65`; the same commit
built and served locally gave identical scores. I could not reproduce the
reported performance of 82 with the desktop preset on this machine.

### Mobile preset (slow 4G, 4× CPU slowdown)

A harder test than the brief asked for, included because it is where the
bundle size shows.

| Page | Before, local build | After, local build | LCP before → after | TBT before → after |
| --- | --- | --- | --- | --- |
| Home | 92 / 95 / 100 | 100 / 100 / 100 | 0.75s → 0.75s | 81ms → 39ms |
| Lesson (Strings) | 84 / 93 / 100 | 98 / 100 / 100 | 2.43s → 0.75s | 251ms → 152ms |
| Drills / Standard | 95 / 91 / 100 | 95 / 100 / 100 | 0.75s → 2.86s | 264ms → 121ms |
| Pre-PPT | 84 / 93 / 100 | 98 / 100 / 100 | 0.75s → 0.75s | 238ms → 169ms |

The drill page's mobile LCP is later than before because its largest element
is now the editor, which arrives in its own chunk; the score is unchanged at
95 because blocking time halved.

### Thresholds

Performance ≥ 90, accessibility ≥ 95, best practices ≥ 95 on all four pages.
Met on the desktop preset and on the mobile preset.

`npm run check:lighthouse` enforces them locally (it builds nothing: run
`npm run build` first; it starts its own preview server). In CI the same
command runs after the gated checks as a reported, non-blocking step.
Performance scores depend on how busy the runner is, so a hard gate would
occasionally block an unrelated content fix; accessibility is gated
deterministically by the axe tests instead.

## Payload

| | Before | After |
| --- | --- | --- |
| JavaScript needed for the home page | 1,003 kB (318 kB gzipped), one file | 473 kB (144 kB gzipped) |
| CodeMirror | in the main bundle | separate chunk, 431 kB (138 kB gzipped), only on pages with an editor |
| highlight.js | in the main bundle | separate chunk, 29 kB, loaded when a page has code |
| Font files emitted | 24 (every subset of three families) | 4 (Latin subsets); 2 preloaded |

## Page length

| | Before | After |
| --- | --- | --- |
| Pre-PPT, desktop | 8,838px tall; workspace starts 6,328px down | one screen; spec and editor side by side |
| Pre-PPT, phone | 11,106px tall | one screen; three tabs |
| Drill level, desktop | 5,764px tall, 13 cards | one question per screen (list view still available) |
| Write-a-function editor | 71px for a one-line starter, fixed | at least twelve lines, resizable |
