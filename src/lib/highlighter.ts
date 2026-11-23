import hljs from 'highlight.js/lib/core'
import kotlin from 'highlight.js/lib/languages/kotlin'
import haskell from 'highlight.js/lib/languages/haskell'
import bash from 'highlight.js/lib/languages/bash'

hljs.registerLanguage('kotlin', kotlin)
hljs.registerLanguage('haskell', haskell)
hljs.registerLanguage('bash', bash)

export function highlightWith(code: string, lang: string): string | null {
  return hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang }).value : null
}
