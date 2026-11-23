import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { paths } from '../content'
import { LEVELS, type Week } from '../content/schema'
import { stopLabel, stopsOf } from '../lib/nav'

/** Modal shell: Esc and a click on the backdrop close it; focus returns to where it was. */
function Modal({
  label,
  onClose,
  children,
  className,
}: {
  label: string
  onClose: () => void
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    const first = ref.current?.querySelector<HTMLElement>('input, button')
    first?.focus()
    return () => before?.focus?.()
  }, [])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        className={`modal ${className ?? ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            onClose()
          } else if (e.key === 'Tab') {
            // Keep focus inside the dialog.
            const f = ref.current!.querySelectorAll<HTMLElement>('input, button, a[href]')
            if (!f.length) return
            const first = f[0]
            const last = f[f.length - 1]
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault()
              last.focus()
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault()
              first.focus()
            }
          }
        }}
      >
        {children}
      </div>
    </div>
  )
}

interface Item {
  path: string
  label: string
  section: string
}

/** "/" opens this: type a few letters of a lesson, drill or page and press Enter. */
export function JumpPalette({ week, onClose }: { week: Week; onClose: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const list = useRef<HTMLUListElement>(null)

  const items = useMemo<Item[]>(
    () => [
      { path: paths.home(), label: 'Home', section: 'Course' },
      ...stopsOf(week).map((s) => ({ path: s.path, label: stopLabel(s), section: s.section })),
      ...LEVELS.map((lv) => ({
        path: `${paths.level(week.id, lv.id)}?view=list`,
        label: `${lv.title}: all questions`,
        section: 'Drill book',
      })),
    ],
    [week],
  )
  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    return items.filter((it) => {
      const hay = `${it.label} ${it.section}`.toLowerCase()
      return words.every((w) => hay.includes(w))
    })
  }, [items, query])

  useEffect(() => setActive(0), [query])
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const go = (it: Item | undefined) => {
    if (!it) return
    onClose()
    navigate(it.path)
  }

  return (
    <Modal label="Jump to a page" onClose={onClose} className="palette">
      <input
        className="palette-input"
        type="text"
        role="combobox"
        aria-expanded="true"
        aria-controls="palette-list"
        aria-activedescendant={shown[active] ? `palette-${active}` : undefined}
        aria-label="Jump to a lesson, drill or page"
        placeholder="Jump to a lesson, drill or page…"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(shown.length - 1, a + 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(0, a - 1))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            go(shown[active])
          }
        }}
      />
      <ul className="palette-list" id="palette-list" role="listbox" aria-label="Pages" ref={list}>
        {shown.map((it, i) => (
          <li
            key={it.path}
            id={`palette-${i}`}
            role="option"
            aria-selected={i === active}
            className="palette-item"
            onMouseMove={() => setActive(i)}
            onClick={() => go(it)}
          >
            <span>{it.label}</span>
            <span className="palette-section">{it.section}</span>
          </li>
        ))}
        {!shown.length && (
          <li className="palette-empty" role="option" aria-selected="false" aria-disabled="true">
            Nothing matches “{query}”.
          </li>
        )}
      </ul>
      <p className="palette-foot">
        <kbd>↑</kbd> <kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close
      </p>
    </Modal>
  )
}

const MOD = /Mac|iPhone|iPad/.test(typeof navigator === 'undefined' ? '' : navigator.platform) ? '⌘' : 'Ctrl'

const SHORTCUTS: [string[], string][] = [
  [['['], 'Previous page or drill'],
  [[']'], 'Next page or drill'],
  [['/'], 'Jump to any lesson, drill or page'],
  [['?'], 'Show this sheet'],
  [[MOD, 'Enter'], 'Run the code or tests (inside an editor)'],
  [[MOD, 'S'], 'Nothing: your code is saved as you type'],
  [['Esc'], 'Close a dialog, leave the editor, or leave focus mode'],
]

export function HelpSheet({ onClose }: { onClose: () => void }) {
  return (
    <Modal label="Keyboard shortcuts" onClose={onClose} className="help">
      <div className="help-head">
        <h2>Keyboard shortcuts</h2>
        <button className="btn btn-quiet btn-small" onClick={onClose}>
          Close
        </button>
      </div>
      <dl className="help-list">
        {SHORTCUTS.map(([keys, what]) => (
          <div key={what}>
            <dt>
              {keys.map((k) => (
                <kbd key={k}>{k}</kbd>
              ))}
            </dt>
            <dd>{what}</dd>
          </div>
        ))}
      </dl>
      <p className="small">
        Single-key shortcuts are ignored while you are typing in an editor or an answer box. Press{' '}
        <kbd>Esc</kbd> first to leave the editor.
      </p>
    </Modal>
  )
}
