import type { Page } from '@playwright/test'

export const stream = (lines: string[]) => `<outStream>${lines.join('\n')}\n</outStream>`

/** Stand in for JetBrains' compiler server, so tests are fast and never depend on the network. */
export async function mockCompiler(page: Page, body: Record<string, unknown>, delayMs = 0) {
  let calls = 0
  await page.route('https://api.kotlinlang.org/**', async (route) => {
    calls++
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ errors: { 'Solution.kt': [], 'HiddenTests.kt': [] }, exception: null, text: '', ...body }),
    })
  })
  return () => calls
}

/** One pass, one wrong value and one exception for the three tests of drill 2.1. */
export const MIXED_RESULT = {
  text: stream(['##PASS\tone dot', '##FAIL\ttwo dots\tgz\ttar.gz', '##ERROR\tno dot\tNotImplementedError: An operation is not implemented.', '##DONE']),
}

export const COMPILE_ERROR = {
  errors: {
    'Solution.kt': [
      {
        message: 'Unresolved reference: nope',
        severity: 'ERROR',
        interval: { start: { line: 0, ch: 41 }, end: { line: 0, ch: 45 } },
      },
    ],
    'HiddenTests.kt': [],
  },
}

export const DRILL = '#/week/week1/drills/standard?q=s-extension'
