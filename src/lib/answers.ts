/** Normalise program output: trim lines, collapse runs of spaces, drop blank edges. */
export function normalizeOutput(s: string): string {
  return s
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim().replace(/\s+/g, ' '))
    .join('\n')
    .replace(/^\n+|\n+$/g, '')
}

/** Normalise a code fragment typed into a blank: whitespace is not significant. */
export function normalizeFragment(s: string): string {
  return s.replace(/\s+/g, '')
}

export const BLANK = '____'
