import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { DRILL, MIXED_RESULT, mockCompiler } from './helpers'

// Every main route, in light and dark, must have no serious or critical axe violation
// (this includes WCAG AA colour contrast).
const ROUTES: [string, string][] = [
  ['home', '#/'],
  ['overview', '#/week/week1'],
  ['lesson', '#/week/week1/lesson/strings'],
  ['lesson with test examples', '#/week/week1/lesson/testing'],
  ['drill book', '#/week/week1/drills'],
  ['drill work view', DRILL],
  ['drill work view (multiple choice)', '#/week/week1/drills/warm-up?q=w-expression-body'],
  ['drill list', '#/week/week1/drills/standard?view=list'],
  ['pre-PPT', '#/week/week1/pre-ppt'],
  ['technique', '#/week/week1/technique'],
]

async function check(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const bad = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  const report = bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).slice(0, 5).join(' | ')}`)
  expect(report, report.join('\n')).toEqual([])
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`axe, ${scheme}`, () => {
    test.use({ colorScheme: scheme })

    for (const [name, hash] of ROUTES) {
      test(name, async ({ page }) => {
        await page.goto(hash)
        await page.waitForLoadState('networkidle')
        await expect(page.locator('h1')).toBeVisible()
        await check(page)
      })
    }

    test('drill with test results showing', async ({ page }) => {
      await mockCompiler(page, MIXED_RESULT)
      await page.goto(DRILL)
      await page.getByRole('button', { name: /^Run tests/ }).first().click()
      await expect(page.getByText('1 of 3 tests pass')).toBeVisible()
      await page.getByRole('button', { name: /Show solution/ }).click()
      await check(page)
    })

    test('pre-PPT in focus mode, a part open', async ({ page }) => {
      await page.goto('#/week/week1/pre-ppt')
      await page.getByRole('tab', { name: /^1\./ }).click()
      await page.getByRole('button', { name: 'Focus mode' }).click()
      await check(page)
    })

    test('jump palette and help sheet', async ({ page }) => {
      await page.goto('#/')
      await page.keyboard.press('/')
      await expect(page.getByRole('dialog')).toBeVisible()
      await check(page)
      await page.keyboard.press('Escape')
      await page.keyboard.press('?')
      await expect(page.getByRole('dialog')).toBeVisible()
      await check(page)
    })

    test('phone width: home and drill work view', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto('#/')
      await check(page)
      await page.goto(DRILL)
      await expect(page.locator('h1')).toBeVisible()
      await check(page)
    })
  })
}
