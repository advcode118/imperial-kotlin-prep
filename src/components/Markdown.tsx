import { memo, useMemo } from 'react'
import { codeBlockHtml, renderMarkdown, useHighlighter } from '../lib/markdown'

export const Markdown = memo(function Markdown({ md, className }: { md: string; className?: string }) {
  const v = useHighlighter(md.includes('```'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => renderMarkdown(md), [md, v])
  return <div className={`prose ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />
})

export const Code = memo(function Code({ code, lang = 'kotlin' }: { code: string; lang?: string }) {
  const v = useHighlighter(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => codeBlockHtml(code.replace(/\n+$/, ''), lang), [code, lang, v])
  return <div dangerouslySetInnerHTML={{ __html: html }} />
})
