import { Marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import kotlin from 'highlight.js/lib/languages/kotlin'
import haskell from 'highlight.js/lib/languages/haskell'
import bash from 'highlight.js/lib/languages/bash'

hljs.registerLanguage('kotlin', kotlin)
hljs.registerLanguage('haskell', haskell)
hljs.registerLanguage('bash', bash)

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function highlight(code: string, lang = 'kotlin'): string {
  return hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang }).value : esc(code)
}

const marked = new Marked({
  renderer: {
    code({ text, lang }) {
      const l = lang || 'text'
      return `<pre class="code" data-lang="${esc(l)}"><code>${highlight(text, l)}</code></pre>`
    },
    link({ href, text }) {
      const external = /^https?:/.test(href)
      return `<a href="${esc(href)}"${external ? ' target="_blank" rel="noreferrer"' : ''}>${text}</a>`
    },
  },
})

export const renderMarkdown = (md: string): string => marked.parse(md, { async: false }) as string
