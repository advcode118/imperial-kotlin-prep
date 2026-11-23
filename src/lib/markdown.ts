import { useEffect, useSyncExternalStore } from 'react'
import { Marked } from 'marked'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// highlight.js is loaded on demand: code is shown plain first and coloured when the chunk arrives.
let colour: ((code: string, lang: string) => string | null) | null = null
let version = 0
let started = false
const listeners = new Set<() => void>()

function loadHighlighter() {
  if (started) return
  started = true
  void import('./highlighter').then((m) => {
    colour = m.highlightWith
    version++
    listeners.forEach((l) => l())
  })
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** Re-renders the caller once syntax colouring is available; pass whether it has code to colour. */
export function useHighlighter(needed: boolean): number {
  useEffect(() => {
    if (needed) loadHighlighter()
  }, [needed])
  return useSyncExternalStore(subscribe, () => version)
}

export function highlight(code: string, lang = 'kotlin'): string {
  return colour?.(code, lang) ?? esc(code)
}

/** A code block with a copy button. The pre is focusable so keyboard users can scroll it. */
export function codeBlockHtml(code: string, lang: string): string {
  return (
    `<div class="codeblock"><button type="button" class="copy-btn" data-copy aria-label="Copy code">Copy</button>` +
    `<pre class="code" data-lang="${esc(lang)}" tabindex="0"><code>${highlight(code, lang)}</code></pre></div>`
  )
}

const marked = new Marked({
  renderer: {
    code({ text, lang }) {
      return codeBlockHtml(text, lang || 'text')
    },
    link({ href, text }) {
      const external = /^https?:/.test(href)
      return `<a href="${esc(href)}"${external ? ' target="_blank" rel="noreferrer"' : ''}>${text}</a>`
    },
    table(token) {
      // Wide tables scroll inside their own box instead of the page.
      const head = token.header.map((c) => `<th>${this.parser.parseInline(c.tokens)}</th>`).join('')
      const rows = token.rows
        .map((r) => `<tr>${r.map((c) => `<td>${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`)
        .join('')
      return `<div class="table-scroll" tabindex="0" role="group" aria-label="Table"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`
    },
  },
})

export const renderMarkdown = (md: string): string => marked.parse(md, { async: false }) as string
