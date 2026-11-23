import { useEffect, useState } from 'react'
import { usePersistent } from '../lib/store'

interface TimerState {
  /** Milliseconds left as of the last pause (or the full duration). */
  remaining: number
  /** Wall-clock time the current run started, or null when paused. */
  startedAt: number | null
}

const WARN_MS = 15 * 60 * 1000

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${h}:${pad(m)}:${pad(s % 60)}`
}

export function Timer({ id, minutes }: { id: string; minutes: number }) {
  const full = minutes * 60 * 1000
  const [t, setT] = usePersistent<TimerState>(`timer:${id}`, { remaining: full, startedAt: null })
  const [now, setNow] = useState(() => Date.now())
  const running = t.startedAt !== null

  useEffect(() => {
    if (!running) return
    setNow(Date.now())
    const h = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(h)
  }, [running])

  const left = running ? t.remaining - (now - t.startedAt!) : t.remaining
  const over = left <= 0
  const warn = !over && left <= WARN_MS
  const untouched = !running && t.remaining === full

  return (
    <div className={`timer ${warn ? 'timer-warn' : ''} ${over ? 'timer-over' : ''}`}>
      <div className="timer-main">
        <span className="timer-label">Timed attempt</span>
        <span className="timer-clock" role="timer" aria-live="off">
          {fmt(left)}
        </span>
        <span className="timer-note">
          {over
            ? 'Time is up. Stop, run the tests once more, and review.'
            : warn
              ? 'Fifteen minutes or less. Make sure it compiles.'
              : untouched
                ? `${minutes / 60} hours, as a practice sitting.`
                : running
                  ? 'Running.'
                  : 'Paused.'}
        </span>
      </div>
      <div className="timer-actions">
        {!over &&
          (running ? (
            <button
              className="btn"
              onClick={() => setT({ remaining: Math.max(0, t.remaining - (Date.now() - t.startedAt!)), startedAt: null })}
            >
              Pause
            </button>
          ) : (
            <button className="btn" onClick={() => setT({ remaining: t.remaining, startedAt: Date.now() })}>
              {untouched ? 'Start' : 'Resume'}
            </button>
          ))}
        {!untouched && (
          <button className="btn-link" onClick={() => setT({ remaining: full, startedAt: null })}>
            Reset
          </button>
        )}
      </div>
    </div>
  )
}
