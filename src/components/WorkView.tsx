import { useCallback, useRef, useState, type ReactNode } from 'react'
import { usePersistent } from '../lib/store'

export type WorkTab = 'instructions' | 'code' | 'output'

const TABS: [WorkTab, string][] = [
  ['instructions', 'Instructions'],
  ['code', 'Code'],
  ['output', 'Output'],
]

/** Which pane is showing on a narrow screen. Shared so a run can switch to Output. */
export function useWorkTab(initial: WorkTab = 'instructions') {
  return useState<WorkTab>(initial)
}

/**
 * The work view: instructions on the left, code above output on the right,
 * with a draggable divider. On a narrow screen the three panes become tabs
 * and `runBar` sticks to the bottom of the screen.
 */
export function WorkView({
  id,
  tab,
  onTab,
  instructions,
  code,
  output,
  runBar,
  outputBadge,
}: {
  /** Persistence key for the divider position. */
  id: string
  tab: WorkTab
  onTab: (t: WorkTab) => void
  instructions: ReactNode
  code: ReactNode
  output: ReactNode
  runBar: ReactNode
  /** Short status shown on the Output tab, e.g. "2/3". */
  outputBadge?: string
}) {
  const [split, setSplit] = usePersistent<number>(`ui:split:${id}`, 42)
  const box = useRef<HTMLDivElement>(null)
  const clamp = (v: number) => Math.min(70, Math.max(25, v))

  const drag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = box.current
      if (!el) return
      e.preventDefault()
      const target = e.currentTarget
      target.setPointerCapture(e.pointerId)
      const rect = el.getBoundingClientRect()
      const move = (ev: PointerEvent) => setSplit(clamp(((ev.clientX - rect.left) / rect.width) * 100))
      const up = () => {
        target.removeEventListener('pointermove', move)
        target.removeEventListener('pointerup', up)
        target.removeEventListener('pointercancel', up)
        document.body.classList.remove('dragging')
      }
      document.body.classList.add('dragging')
      target.addEventListener('pointermove', move)
      target.addEventListener('pointerup', up)
      target.addEventListener('pointercancel', up)
    },
    [setSplit],
  )

  return (
    <div className="wv" data-tab={tab}>
      <div className="wv-tabs" role="tablist" aria-label="Work view">
        {TABS.map(([t, label]) => (
          <button
            key={t}
            role="tab"
            id={`wv-tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`wv-${t}`}
            className="wv-tab"
            onClick={() => onTab(t)}
          >
            {label}
            {t === 'output' && outputBadge && <span className="wv-badge">{outputBadge}</span>}
          </button>
        ))}
      </div>
      <div className="wv-panes" ref={box} style={{ ['--split' as string]: `${split}%` }}>
        <section className="wv-pane wv-instructions" id="wv-instructions" aria-label="Instructions">
          {instructions}
        </section>
        <div
          className="wv-divider"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize instructions and code"
          aria-valuenow={Math.round(split)}
          aria-valuemin={25}
          aria-valuemax={70}
          tabIndex={0}
          onPointerDown={drag}
          onDoubleClick={() => setSplit(42)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setSplit((s) => clamp(s - 2))
            else if (e.key === 'ArrowRight') setSplit((s) => clamp(s + 2))
            else return
            e.preventDefault()
          }}
        />
        <div className="wv-right">
          <section className="wv-pane wv-code" id="wv-code" aria-label="Code">
            {code}
          </section>
          <section className="wv-pane wv-output" id="wv-output" aria-label="Output">
            {output}
          </section>
        </div>
      </div>
      <div className="wv-runbar">{runBar}</div>
    </div>
  )
}

/** "⌘↵" on Apple keyboards, "Ctrl+Enter" elsewhere. */
export const RUN_KEYS = /Mac|iPhone|iPad/.test(typeof navigator === 'undefined' ? '' : navigator.platform)
  ? '⌘ Enter'
  : 'Ctrl+Enter'
