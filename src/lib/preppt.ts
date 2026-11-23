import type { PrePpt, PptTest } from '../content/schema'

const testMethod = (t: PptTest) =>
  `    @Test\n    fun \`${t.name}\`() {\n${t.body
    .split('\n')
    .map((l) => (l ? '        ' + l : l))
    .join('\n')}\n    }`

/** The test file containing only the enabled ("uncommented") tests. */
export function buildTestFile(p: PrePpt, enabled: (t: PptTest) => boolean): string {
  const methods = p.tests.filter(enabled).map(testMethod).join('\n\n')
  return `${p.testFile.header}\n\nclass ${p.testFile.className} {\n${methods}\n}\n`
}

/** The test file as shipped in the download: first test live, the rest commented out. */
export function buildDownloadTestFile(p: PrePpt): string {
  const methods = p.tests
    .map((t, i) => {
      const src = testMethod(t)
      return i === 0
        ? src
        : src
            .split('\n')
            .map((l) => '//' + l)
            .join('\n')
    })
    .join('\n\n')
  return `${p.testFile.header}\n\nclass ${p.testFile.className} {\n${methods}\n}\n`
}
