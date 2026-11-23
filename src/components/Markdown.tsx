import { memo } from 'react'
import { highlight, renderMarkdown } from '../lib/markdown'

export const Markdown = memo(function Markdown({ md, className }: { md: string; className?: string }) {
  return <div className={`prose ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }} />
})

export const Code = memo(function Code({ code, lang = 'kotlin' }: { code: string; lang?: string }) {
  return (
    <pre className="code" data-lang={lang}>
      <code dangerouslySetInnerHTML={{ __html: highlight(code.replace(/\n+$/, ''), lang) }} />
    </pre>
  )
})
