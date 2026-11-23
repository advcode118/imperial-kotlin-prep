import { expect, test } from '@playwright/test'
import { COMPILE_ERROR, DRILL, MIXED_RESULT, mockCompiler } from './helpers'

test.describe('wayfinding', () => {
  test('previous / next at the end of a lesson, by link and by key', async ({ page }) => {
    await page.goto('#/week/week1/lesson/values-and-types')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Values, variables and basic types')
    await expect(page.getByLabel('Breadcrumb')).toContainText('Foundations')

    await page.getByRole('link', { name: /^Next.*Functions/ }).click()
    await expect(page).toHaveURL(/lesson\/functions$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Functions')
    // Moving on marks the lesson read.
    await expect(page.locator('#sidebar')).toContainText('1/13')

    await page.keyboard.press('[')
    await expect(page).toHaveURL(/lesson\/values-and-types$/)
    await page.keyboard.press(']')
    await expect(page).toHaveURL(/lesson\/functions$/)
  })

  test('previous / next between drills, and the question navigator', async ({ page }) => {
    await page.goto(DRILL)
    await expect(page.getByRole('heading', { level: 2, name: 'File extension' })).toBeVisible()
    await page.getByRole('link', { name: /^Next.*2\.2/ }).click()
    await expect(page).toHaveURL(/q=s-username/)
    await page.getByRole('link', { name: /^Previous.*2\.1/ }).click()
    await expect(page).toHaveURL(/q=s-extension/)

    await page.getByLabel('Questions in this level').getByRole('link', { name: /^2\.3 / }).click()
    await expect(page.getByLabel('Questions in this level').getByRole('link', { name: /^2\.3 / })).toHaveAttribute('aria-current', 'page')

    // The list view is still there.
    await page.getByRole('link', { name: 'All questions' }).click()
    await expect(page).toHaveURL(/view=list/)
    await expect(page.locator('section.question')).toHaveCount(13)
  })

  test('a level opens on the question last worked on', async ({ page }) => {
    await page.goto('#/week/week1/drills/standard?q=s-username')
    await expect(page.getByRole('heading', { level: 2, name: 'Parts of an email address' })).toBeVisible()
    await page.goto('#/week/week1/drills/warm-up')
    await expect(page).toHaveURL(/warm-up\?q=/)
    await page.goto('#/week/week1/drills/standard')
    await expect(page).toHaveURL(/q=s-username/)
  })

  test('continue where you left off restores the page and the scroll position', async ({ page }) => {
    await page.goto('#/week/week1/lesson/strings')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, 900))
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ikp:last')!).scroll)).toBe(900)

    await page.goto('#/')
    const resume = page.getByRole('region', { name: 'Continue where you left off' })
    await expect(resume).toContainText('Strings and the String API')
    await resume.getByRole('link').click()
    await expect(page).toHaveURL(/lesson\/strings$/)
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(900)
  })

  test('jump palette (/) and help sheet (?)', async ({ page }) => {
    await page.goto('#/')
    await page.keyboard.press('/')
    const palette = page.getByRole('dialog', { name: 'Jump to a page' })
    await expect(palette).toBeVisible()
    await page.keyboard.type('filter')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/lesson\/skill-filter$/)
    await expect(palette).toBeHidden()

    await page.keyboard.press('?')
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('the sidebar collapses, and its groups fold', async ({ page }) => {
    await page.goto('#/')
    const sidebar = page.locator('#sidebar')
    await page.getByRole('button', { name: 'PPT skills' }).click()
    await expect(sidebar.getByRole('link', { name: 'Writing a filter' })).toBeHidden()
    await page.getByRole('button', { name: 'Contents' }).click()
    await expect(sidebar).toBeHidden()
    await page.reload()
    await expect(sidebar).toBeHidden()
  })
})

test.describe('drill work view', () => {
  test('Cmd/Ctrl+Enter runs the tests and shows expected against actual', async ({ page }) => {
    const calls = await mockCompiler(page, MIXED_RESULT, 300)
    await page.goto(DRILL)
    const editor = page.locator('.cm-content')
    await editor.click()
    await page.keyboard.press('ControlOrMeta+Enter')

    await expect(page.getByText('Compiling and running the tests…')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Running…' }).first()).toBeDisabled()

    await expect(page.getByText('1 of 3 tests pass')).toBeVisible()
    const failed = page.locator('.case-fail')
    await expect(failed).toContainText('two dots')
    await expect(failed.locator('.diff-expected')).toContainText('gz')
    await expect(failed.locator('.diff-actual mark')).toHaveText('tar.')
    await expect(page.locator('.case-error')).toContainText('NotImplementedError')
    expect(calls()).toBe(1)

    // An attempt that did not pass is recorded as attempted, in words.
    await expect(page.locator('.chip-tried')).toHaveText('Attempted')
  })

  test('Cmd/Ctrl+S does nothing, and the editor is at least twelve lines tall', async ({ page }) => {
    await page.goto(DRILL)
    await page.locator('.cm-content').click()
    await page.keyboard.press('ControlOrMeta+s')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    const { height, lineHeight } = await page.locator('.editor-box').evaluate((el) => ({
      height: el.getBoundingClientRect().height,
      lineHeight: parseFloat(getComputedStyle(el.querySelector('.cm-line')!).lineHeight),
    }))
    expect(height).toBeGreaterThanOrEqual(12 * lineHeight)
  })

  test('a compile error is marked in the gutter and links to its line', async ({ page }) => {
    await mockCompiler(page, COMPILE_ERROR)
    await page.goto(DRILL)
    await page.getByRole('button', { name: /^Run tests/ }).first().click()
    await expect(page.getByText('Does not compile')).toBeVisible()
    await expect(page.locator('.cm-lint-marker-error')).toHaveCount(1)
    await page.getByRole('button', { name: 'line 1:42' }).click()
    await expect(page.locator('.cm-content')).toBeFocused()
  })

  test('a run can be cancelled, and nothing is marked', async ({ page }) => {
    await mockCompiler(page, MIXED_RESULT, 5000)
    await page.goto(DRILL)
    await page.getByRole('button', { name: /^Run tests/ }).first().click()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('button', { name: /^Run tests/ }).first()).toBeEnabled()
    await expect(page.locator('.chip-tried')).toHaveCount(0)
  })

  test('reset to starter, and the divider moves with the keyboard', async ({ page }) => {
    await page.goto(DRILL)
    await page.locator('.cm-content').click()
    await page.keyboard.type('// hello')
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Reset to starter' }).click()
    await expect(page.locator('.cm-content')).not.toContainText('// hello')

    const divider = page.getByRole('separator')
    const before = Number(await divider.getAttribute('aria-valuenow'))
    await divider.focus()
    await page.keyboard.press('ArrowRight')
    expect(Number(await divider.getAttribute('aria-valuenow'))).toBe(before + 2)
  })

  test('on a phone the work view is three tabs with a sticky Run button', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockCompiler(page, MIXED_RESULT)
    await page.goto(DRILL)
    await expect(page.getByRole('tab', { name: 'Instructions' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('#wv-code')).toBeHidden()
    await page.getByRole('tab', { name: 'Code' }).click()
    await expect(page.locator('.cm-content')).toBeVisible()

    const run = page.locator('.wv-runbar').getByRole('button', { name: 'Run tests' })
    await expect(run).toBeInViewport()
    await run.click()
    // Running switches to the Output tab.
    await expect(page.getByRole('tab', { name: /Output/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('1 of 3 tests pass')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
})

test.describe('pre-PPT', () => {
  test('spec is tabbed by part beside the workspace; tests toggle inline', async ({ page }) => {
    await page.goto('#/week/week1/pre-ppt')
    await page.getByRole('tab', { name: /^2\. Handlers/ }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Part 1: Handlers' })).toBeVisible()
    await expect(page.locator('.cm-content')).toBeVisible()
    // The page no longer scrolls: spec and editor share one screen.
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true)

    await expect(page.getByText('1 of 27 enabled')).toBeVisible()
    await page.getByRole('button', { name: 'Enable next test' }).click()
    await expect(page.getByText('2 of 27 enabled')).toBeVisible()
    await page.locator('.case input[type=checkbox]').first().check()
    await expect(page.getByText('3 of 27 enabled')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Run 3 tests/ })).toBeVisible()
  })

  // Every part tab must be fully inside the tab row: none clipped, none hidden behind a scroll.
  for (const [width, height, split] of [
    [1440, 900, null],
    [1280, 800, null],
    [1440, 900, 25],
    [1280, 800, 25],
    [1024, 768, 25],
    [390, 844, null],
  ] as [number, number, number | null][]) {
    for (const focus of [false, true]) {
      test(`part tabs fit at ${width}px${split ? `, divider at ${split}%` : ''}${focus ? ', focus mode' : ''}`, async ({ page }) => {
        await page.setViewportSize({ width, height })
        await page.addInitScript(
          ([split, focus]) => {
            if (split) localStorage.setItem('ikp:ui:split:preppt', String(split))
            if (focus) localStorage.setItem('ikp:ui:focus', 'true')
          },
          [split, focus] as const,
        )
        await page.goto('#/week/week1/pre-ppt')
        const row = page.getByRole('tablist', { name: 'Specification' })
        await expect(row.getByRole('tab')).toHaveCount(7)
        await expect(row.getByRole('tab', { name: 'Assessment' })).toBeVisible()
        const { box, tabs, scrollWidth, clientWidth } = await row.evaluate((el) => ({
          box: el.getBoundingClientRect().toJSON(),
          tabs: [...el.querySelectorAll('[role=tab]')].map((t) => t.getBoundingClientRect().toJSON()),
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
        }))
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
        for (const t of tabs) {
          expect(t.left).toBeGreaterThanOrEqual(box.left - 0.5)
          expect(t.right).toBeLessThanOrEqual(box.right + 0.5)
          expect(t.bottom).toBeLessThanOrEqual(box.bottom + 0.5)
        }
        // The last tab works, wherever it wrapped to.
        await row.getByRole('tab', { name: 'Assessment' }).click()
        await expect(page.getByRole('heading', { level: 2, name: 'Assessing yourself' })).toBeVisible()
      })
    }
  }

  test('focus mode hides the navigation, persists, and Esc leaves it after a confirm', async ({ page }) => {
    await page.goto('#/week/week1/pre-ppt')
    await page.getByRole('button', { name: 'Start timer' }).click()
    await page.getByRole('button', { name: 'Focus mode' }).click()
    await expect(page.locator('.topbar')).toHaveCount(0)
    await expect(page.locator('#sidebar')).toHaveCount(0)
    await expect(page.getByRole('timer')).toBeVisible()
    await expect(page.locator('.cm-content')).toBeVisible()

    await page.reload()
    await expect(page.locator('.topbar')).toHaveCount(0)
    await expect(page.getByRole('timer')).not.toHaveText('2:00:00')

    // Declining the confirm stays in focus mode.
    page.once('dialog', (d) => d.dismiss())
    await page.keyboard.press('Escape')
    await expect(page.locator('.topbar')).toHaveCount(0)

    page.once('dialog', (d) => {
      expect(d.message()).toContain('Leave focus mode')
      void d.accept()
    })
    await page.keyboard.press('Escape')
    await expect(page.locator('.topbar')).toBeVisible()
    await expect(page.locator('#sidebar')).toBeVisible()
  })
})

test.describe('theme and dashboard', () => {
  test('theme toggle switches and persists', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('#/')
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    const light = await bg()
    await page.getByRole('button', { name: 'Switch to dark theme' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    expect(await bg()).not.toBe(light)
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.getByRole('button', { name: 'Switch to light theme' }).click()
    expect(await bg()).toBe(light)
  })

  test('dashboard shows progress by section, the countdown and a next step', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-23T13:00:00Z'))
    await page.goto('#/')
    await expect(page.getByRole('region', { name: /is due/ })).toContainText('in 4 days 6 hours')
    await expect(page.getByRole('region', { name: 'Start here' })).toContainText('Week 1 overview')
    const week = page.getByRole('region', { name: /^Week 1/ })
    for (const row of ['Foundations', 'PPT skills', 'Warm-up', 'Standard', 'Stretch', 'PPT-strength', 'Parts with all tests passing'])
      await expect(week.getByRole('link', { name: row, exact: true })).toBeVisible()
    await expect(week).toContainText('0 of 13')
  })
})
