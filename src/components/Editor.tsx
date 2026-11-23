import { lazy, Suspense } from 'react'

export interface EditorDiagnostic {
  /** 1-based. */
  line: number
  col: number
  message: string
  severity: 'ERROR' | 'WARNING' | 'INFO'
}

export interface EditorProps {
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
  maxHeight?: string
  /** Fill the height of the parent (which is then the thing that is sized and resized). */
  fill?: boolean
  label: string
  /** Called on Cmd/Ctrl+Enter. */
  onRun?: () => void
  /** Compiler messages for this file, shown as gutter markers and underlines. */
  diagnostics?: EditorDiagnostic[]
  /** Move the cursor here; change `n` to repeat a jump to the same place. */
  goto?: { line: number; col: number; n: number }
}

// CodeMirror is by far the largest dependency, so it is its own chunk and only
// loads on pages that show an editor. Until it arrives the code is shown as plain text.
const Impl = lazy(() => import('./EditorImpl'))

export function Editor(props: EditorProps) {
  return (
    <Suspense
      fallback={
        <pre className={`editor-fallback ${props.fill ? 'editor-fill' : ''}`} aria-label={props.label}>
          {props.value}
        </pre>
      }
    >
      <Impl {...props} />
    </Suspense>
  )
}
