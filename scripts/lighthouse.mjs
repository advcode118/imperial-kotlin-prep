// Lighthouse on the main routes.
// Usage: node scripts/lighthouse.mjs [baseUrl] [--mobile] [--json out.json] [--no-thresholds]
// Default is Lighthouse's desktop preset; --mobile is its default preset (slow 4G, 4x CPU slowdown).
// With no baseUrl it serves ./dist with `vite preview`.
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import { chromium } from '@playwright/test'

export const ROUTES = [
  ['home', '#/'],
  ['lesson', '#/week/week1/lesson/strings'],
  ['drills', '#/week/week1/drills/standard'],
  ['pre-ppt', '#/week/week1/pre-ppt'],
]
const THRESHOLDS = { performance: 90, accessibility: 95, 'best-practices': 95 }
const RUNS = Number(process.env.LH_RUNS ?? 3)

const args = process.argv.slice(2)
const jsonAt = args.indexOf('--json')
const jsonOut = jsonAt >= 0 ? args[jsonAt + 1] : null
const enforce = !args.includes('--no-thresholds')
const mobile = args.includes('--mobile')
let base = args.find((a) => /^https?:/.test(a))

let server
if (!base) {
  const port = 4319
  server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' })
  base = `http://localhost:${port}/imperial-kotlin-prep/`
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(base)).ok) break
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200))
  }
}

const chrome = await chromeLauncher.launch({
  chromePath: process.env.CHROME_PATH ?? chromium.executablePath(),
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
})
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const rows = []
let failed = false
try {
  for (const [name, hash] of ROUTES) {
    const samples = []
    for (let i = 0; i < RUNS; i++) {
      const r = await lighthouse(
        base + hash,
        { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: Object.keys(THRESHOLDS) },
        mobile ? undefined : desktopConfig,
      )
      samples.push(r.lhr)
    }
    const score = (c) => Math.round(median(samples.map((s) => s.categories[c].score * 100)))
    const metric = (id) => Math.round(median(samples.map((s) => s.audits[id].numericValue)))
    const row = {
      route: name,
      performance: score('performance'),
      accessibility: score('accessibility'),
      'best-practices': score('best-practices'),
      fcpMs: metric('first-contentful-paint'),
      lcpMs: metric('largest-contentful-paint'),
      tbtMs: metric('total-blocking-time'),
      contrast: samples.at(-1).audits['color-contrast'].score === 1 ? 'pass' : 'FAIL',
    }
    rows.push(row)
    for (const [c, min] of Object.entries(THRESHOLDS)) {
      if (row[c] < min) {
        failed = true
        console.error(`  ${name}: ${c} ${row[c]} is below ${min}`)
      }
    }
  }
} finally {
  await chrome.kill()
  server?.kill()
}
console.table(rows)
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ base, preset: mobile ? 'mobile' : 'desktop', runs: RUNS, rows }, null, 2) + '\n')
if (failed && enforce) process.exit(1)
