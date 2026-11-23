import { useState } from 'react'
import { Editor } from './Editor'
import { RunOutput } from './RunOutput'
import { useKotlinRunner } from '../lib/runner'

export function RunnableExample({ code, title }: { code: string; title?: string }) {
  const original = code.replace(/\n+$/, '')
  const [value, setValue] = useState(original)
  const { state, run, clear } = useKotlinRunner()
  return (
    <figure className="example">
      <figcaption>
        <span className="example-title">{title ?? 'Example'}</span>
        <span className="example-actions">
          {value !== original && (
            <button
              className="btn-link"
              onClick={() => {
                setValue(original)
                clear()
              }}
            >
              Reset
            </button>
          )}
          <button
            className="btn"
            disabled={state.status === 'running'}
            onClick={() => run([{ name: 'Main.kt', text: value }])}
          >
            {state.status === 'running' ? 'Running…' : 'Run'}
          </button>
        </span>
      </figcaption>
      <Editor value={value} onChange={setValue} label={title ?? 'Kotlin example'} />
      <RunOutput state={state} />
    </figure>
  )
}
