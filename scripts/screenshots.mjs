// Screenshots of the main views. Usage: node scripts/screenshots.mjs <baseUrl> <outDir>
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const [base = 'http://localhost:4173/imperial-kotlin-prep/', out = 'docs/design/after'] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const views = [
  ['home', '#/'],
  ['lesson', '#/week/week1/lesson/strings'],
  ['drill', '#/week/week1/drills/standard?q=s-extension'],
  ['pre-ppt-focus', '#/week/week1/pre-ppt'],
]
const browser = await chromium.launch()
for (const [tag, viewport, scheme] of [
  ['desktop-light', { width: 1440, height: 900 }, 'light'],
  ['desktop-dark', { width: 1440, height: 900 }, 'dark'],
  ['mobile', { width: 390, height: 844 }, 'light'],
]) {
  const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: tag === 'mobile' ? 2 : 1 })
  const page = await ctx.newPage()
  // A little progress, so the dashboard and navigator show real states.
  await page.addInitScript(() => {
    if (localStorage.getItem('ikp:progress')) return
    localStorage.setItem(
      'ikp:progress',
      JSON.stringify({
        read: { 'values-and-types': true, functions: true },
        questions: { 's-extension': 'tried' },
        parts: {},
      }),
    )
    localStorage.setItem(
      'ikp:last',
      JSON.stringify({ path: '/week/week1/lesson/strings', title: 'Strings and the String API', section: 'Foundations', scroll: 0 }),
    )
  })
  for (const [name, hash] of views) {
    await page.goto(base + hash)
    await page.waitForLoadState('networkidle')
    if (name === 'pre-ppt-focus') {
      await page.getByRole('tab', { name: /^1\./ }).click()
      await page.getByRole('button', { name: 'Focus mode' }).click()
    }
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${out}/${name}-${tag}.png` })
    if (name === 'pre-ppt-focus') {
      page.once('dialog', (d) => d.accept())
      await page.getByRole('button', { name: /Exit focus mode/ }).click()
    }
  }
  await ctx.close()
}
await browser.close()
