import { useEffect, useMemo, useRef } from 'react'
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language'
import { kotlin } from '@codemirror/legacy-modes/mode/clike'
import { lintGutter, setDiagnostics, type Diagnostic } from '@codemirror/lint'
import { Prec } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'
import type { EditorProps } from './Editor'

// Colours come from CSS variables, so one theme serves light and dark.
const theme = EditorView.theme({
  '&': { backgroundColor: 'var(--code-bg)', color: 'var(--code-fg)', fontSize: 'var(--code-size)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-content': { fontFamily: 'var(--mono)', padding: '0.7rem 0', caretColor: 'var(--fg)' },
  '.cm-line': { padding: '0 0.9rem 0 0.5rem' },
  '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.6' },
  '.cm-gutters': {
    backgroundColor: 'var(--code-bg)',
    color: 'var(--faint)',
    border: 'none',
    paddingLeft: '0.2rem',
  },
  '.cm-cursor': { borderLeftColor: 'var(--fg)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--selection) !important',
  },
  '.cm-matchingBracket': { backgroundColor: 'var(--selection)', outline: 'none' },
  '.cm-lintRange-error': { backgroundImage: 'none', borderBottom: '2px solid var(--bad)' },
  '.cm-lintRange-warning': { backgroundImage: 'none', borderBottom: '2px dotted var(--warn)' },
  '.cm-lint-marker': { width: '0.7em', height: '0.7em', marginTop: '0.45em' },
  '.cm-lint-marker-error': { content: 'none', backgroundColor: 'var(--bad)', borderRadius: '50%' },
  '.cm-lint-marker-warning': { content: 'none', backgroundColor: 'var(--warn)', borderRadius: '50%' },
  '.cm-tooltip': {
    backgroundColor: 'var(--bg)',
    color: 'var(--fg)',
    border: '1px solid var(--border-strong)',
    borderRadius: '4px',
    fontFamily: 'var(--sans)',
    fontSize: '0.78rem',
  },
  '.cm-diagnostic': { padding: '0.3rem 0.6rem', borderLeft: '3px solid var(--bad)' },
  '.cm-diagnostic-warning': { borderLeftColor: 'var(--warn)' },
})

const colours = HighlightStyle.define([
  { tag: [t.keyword, t.modifier, t.definitionKeyword, t.controlKeyword], color: 'var(--syn-keyword)' },
  { tag: [t.string, t.special(t.string), t.character], color: 'var(--syn-string)' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--syn-number)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--syn-comment)', fontStyle: 'italic' },
  { tag: [t.typeName, t.className, t.namespace], color: 'var(--syn-type)' },
  { tag: [t.definition(t.variableName), t.function(t.variableName)], color: 'var(--syn-def)' },
  { tag: [t.meta, t.annotation], color: 'var(--syn-meta)' },
])

const base = [StreamLanguage.define(kotlin), theme, syntaxHighlighting(colours)]

export default function EditorImpl({
  value,
  onChange,
  readOnly,
  maxHeight,
  fill,
  label,
  onRun,
  diagnostics,
  goto,
}: EditorProps) {
  const ref = useRef<ReactCodeMirrorRef>(null)
  const run = useRef(onRun)
  run.current = onRun

  const extensions = useMemo(
    () => [
      ...base,
      // tabindex keeps read-only and horizontally scrolling editors reachable from the keyboard.
      EditorView.contentAttributes.of({ 'aria-label': label, tabindex: '0' }),
      lintGutter(),
      // Esc leaves the editor, so Tab and the single-key shortcuts work again.
      keymap.of([
        {
          key: 'Escape',
          run: (view) => {
            view.contentDOM.blur()
            return true
          },
        },
      ]),
      // Highest precedence so the default keymap never swallows these.
      Prec.highest(
        keymap.of([
          {
            key: 'Mod-Enter',
            run: () => {
              run.current?.()
              return true
            },
          },
          // The browser's "Save page" dialog is never what the reader wants here; drafts save as you type.
          { key: 'Mod-s', run: () => true },
        ]),
      ),
    ],
    [label],
  )

  // Compiler messages become gutter markers and underlines on the lines they refer to.
  useEffect(() => {
    const view = ref.current?.view
    if (!view) return
    const doc = view.state.doc
    const ds: Diagnostic[] = (diagnostics ?? [])
      .filter((d) => d.line >= 1 && d.line <= doc.lines)
      .map((d) => {
        const line = doc.line(d.line)
        const from = Math.min(line.to, line.from + Math.max(0, d.col - 1))
        const word = /^[\w.]+/.exec(doc.sliceString(from, line.to))
        return {
          from,
          to: Math.min(line.to, from + (word ? word[0].length : 1)),
          severity: d.severity === 'ERROR' ? 'error' : 'warning',
          message: d.message,
        }
      })
    view.dispatch(setDiagnostics(view.state, ds))
  }, [diagnostics])

  useEffect(() => {
    const view = ref.current?.view
    if (!view || !goto) return
    const doc = view.state.doc
    if (goto.line < 1 || goto.line > doc.lines) return
    const line = doc.line(goto.line)
    const pos = Math.min(line.to, line.from + Math.max(0, goto.col - 1))
    view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) })
    view.focus()
  }, [goto])

  return (
    <CodeMirror
      ref={ref}
      className={`editor ${fill ? 'editor-fill' : ''}`}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      editable={!readOnly}
      theme="none"
      height={fill ? '100%' : undefined}
      maxHeight={fill ? undefined : (maxHeight ?? '32rem')}
      extensions={extensions}
      basicSetup={{
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
        autocompletion: false,
        searchKeymap: false,
        tabSize: 4,
      }}
    />
  )
}
