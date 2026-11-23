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

export function useTimer(id: string, minutes: number) {
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
  return {
    clock: fmt(left),
    running,
    over,
    warn: !over && left <= WARN_MS,
    untouched: !running && t.remaining === full,
    start: () => setT({ remaining: t.remaining, startedAt: Date.now() }),
    pause: () => setT({ remaining: Math.max(0, t.remaining - (Date.now() - t.startedAt!)), startedAt: null }),
    reset: () => setT({ remaining: full, startedAt: null }),
  }
}

/** The two-hour clock, as one quiet line that fits in a toolbar. */
export function Timer({ id, minutes }: { id: string; minutes: number }) {
  const t = useTimer(id, minutes)
  const note = t.over
    ? 'Time is up. Stop, run the tests once more, and review.'
    : t.warn
      ? 'Fifteen minutes or less. Make sure it compiles.'
      : t.untouched
        ? `${minutes / 60}-hour practice sitting`
        : t.running
          ? 'Running'
          : 'Paused'
  return (
    <div className={`timer ${t.warn ? 'timer-warn' : ''} ${t.over ? 'timer-over' : ''}`}>
      <span className="timer-clock" role="timer" aria-live="off" aria-label={`Time left ${t.clock}`}>
        {t.clock}
      </span>
      <span className="timer-note" role={t.warn || t.over ? 'status' : undefined}>
        {note}
      </span>
      {!t.over &&
        (t.running ? (
          <button className="btn btn-quiet btn-small" onClick={t.pause}>
            Pause
          </button>
        ) : (
          <button className="btn btn-small" onClick={t.start}>
            {t.untouched ? 'Start timer' : 'Resume'}
          </button>
        ))}
      {!t.untouched && (
        <button
          className="btn-link"
          onClick={() => {
            if (window.confirm('Reset the timer to the full two hours?')) t.reset()
          }}
        >
          Reset
        </button>
      )}
    </div>
  )
}
