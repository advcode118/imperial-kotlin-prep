import CodeMirror from '@uiw/react-codemirror'
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language'
import { kotlin } from '@codemirror/legacy-modes/mode/clike'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

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
    paddingLeft: '0.4rem',
  },
  '.cm-cursor': { borderLeftColor: 'var(--fg)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--selection) !important',
  },
  '.cm-matchingBracket': { backgroundColor: 'var(--selection)', outline: 'none' },
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

const extensions = [StreamLanguage.define(kotlin), theme, syntaxHighlighting(colours)]

interface Props {
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
  maxHeight?: string
  label: string
}

export function Editor({ value, onChange, readOnly, maxHeight = '32rem', label }: Props) {
  return (
    <CodeMirror
      className="editor"
      aria-label={label}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      editable={!readOnly}
      theme="none"
      maxHeight={maxHeight}
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
