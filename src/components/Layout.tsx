import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { drillsAt, getWeek, paths, weeks } from '../content'
import { LEVELS, type Week } from '../content/schema'
import { neighbours, stopLabel } from '../lib/nav'
import { peek, poke, resetAll, usePersistent, useProgress } from '../lib/store'
import { useTheme } from '../lib/theme'
import { HelpSheet, JumpPalette } from './Dialogs'

export interface LastPlace {
  path: string
  title: string
  section: string
  scroll: number
}

function Meter({ done, total }: { done: number; total: number }) {
  return (
    <span className="meter" aria-hidden="true">
      <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
    </span>
  )
}

function NavGroup({
  id,
  title,
  done,
  total,
  unit,
  current,
  children,
}: {
  id: string
  title: string
  done?: number
  total?: number
  unit?: string
  /** The page being read is in this group, so it stays open. */
  current: boolean
  children: React.ReactNode
}) {
  const [closed, setClosed] = usePersistent<Record<string, true>>('ui:nav-closed', {})
  const open = current || !closed[id]
  return (
    <section className="nav-group">
      <div className="nav-heading">
        <button
          aria-expanded={open}
          aria-controls={`nav-${id}`}
          onClick={() =>
            setClosed((c) => {
              const n = { ...c }
              if (open) n[id] = true
              else delete n[id]
              return n
            })
          }
        >
          <span className="nav-caret" aria-hidden="true" />
          <span className="nav-heading-title">{title}</span>
          {total !== undefined && (
            <span className="nav-count">
              {done}/{total}
              <span className="sr-only"> {unit}</span>
            </span>
          )}
        </button>
      </div>
      {total !== undefined && <Meter done={done ?? 0} total={total} />}
      <div id={`nav-${id}`} hidden={!open}>
        {children}
      </div>
    </section>
  )
}

function WeekNav({ week }: { week: Week }) {
  const { progress } = useProgress()
  const { pathname } = useLocation()
  const c = week.content!
  const w = week.id
  const passed = c.drills.filter((d) => progress.questions[d.id] === 'passed').length
  const parts = c.prePpt.parts.filter((p) => progress.parts[p.id]).length
  return (
    <>
      <p className="nav-week">
        Week {week.number} · {week.exercise}
      </p>
      <ul className="nav-list">
        <li>
          <NavLink end to={paths.week(w)}>
            Overview
          </NavLink>
        </li>
      </ul>
      {c.groups.map((g) => {
        const done = g.lessons.filter((l) => progress.read[l.id]).length
        return (
          <NavGroup
            key={g.id}
            id={g.id}
            title={g.title}
            done={done}
            total={g.lessons.length}
            unit="lessons read"
            current={g.lessons.some((l) => pathname === paths.lesson(w, l.id))}
          >
            <ol className="nav-list">
              {g.lessons.map((l) => (
                <li key={l.id}>
                  <NavLink to={paths.lesson(w, l.id)}>
                    <span>{l.title}</span>
                    {progress.read[l.id] && (
                      <span className="tick">
                        <span aria-hidden="true">✓</span>
                        <span className="sr-only">read</span>
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ol>
          </NavGroup>
        )
      })}
      <NavGroup
        id="drills"
        title="Drill book"
        done={passed}
        total={c.drills.length}
        unit="drills answered correctly"
        current={pathname.startsWith(paths.drills(w))}
      >
        <ul className="nav-list">
          <li>
            <NavLink end to={paths.drills(w)}>
              About the drill book
            </NavLink>
          </li>
          {LEVELS.map((lv) => {
            const ds = drillsAt(week, lv.id)
            const n = ds.filter((d) => progress.questions[d.id] === 'passed').length
            return (
              <li key={lv.id}>
                <NavLink to={paths.level(w, lv.id)}>
                  <span>{lv.title}</span>
                  <span className="nav-count">
                    {n}/{ds.length}
                  </span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </NavGroup>
      <NavGroup
        id="before"
        title="Before the PPT"
        done={parts}
        total={c.prePpt.parts.length}
        unit="pre-PPT parts passing"
        current={pathname === paths.prePpt(w) || pathname === paths.technique(w)}
      >
        <ul className="nav-list">
          <li>
            <NavLink to={paths.prePpt(w)}>
              <span>Pre-PPT exercise</span>
              <span className="nav-count">
                {parts}/{c.prePpt.parts.length}
              </span>
            </NavLink>
          </li>
          <li>
            <NavLink to={paths.technique(w)}>PPT technique</NavLink>
          </li>
        </ul>
      </NavGroup>
    </>
  )
}

const typing = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || !!el.closest('.cm-editor'))

export function Layout() {
  const { weekId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [drawer, setDrawer] = useState(false)
  const [sidebar, setSidebar] = usePersistent<boolean>('ui:sidebar', true)
  const [focusPref] = usePersistent<boolean>('ui:focus', false)
  const [dialog, setDialog] = useState<'jump' | 'help' | null>(null)
  const [theme, toggleTheme] = useTheme()
  const { markRead } = useProgress()
  const week = getWeek(weekId) ?? weeks.find((w) => w.content)!
  const { pathname, search } = location
  const { here } = neighbours(week, pathname, search)
  const focus = focusPref && here?.kind === 'preppt'
  const wide = () => window.matchMedia('(min-width: 60.01rem)').matches

  // Remember the place for "Continue where you left off" (never the home page itself).
  useEffect(() => {
    if (!here) return
    const title = stopLabel(here)
    document.title = `${title} · Kotlin PPT Prep`
    const path = pathname + search
    poke<LastPlace>('last', { path, title, section: here.section, scroll: 0 })
    let t = 0
    const onScroll = () => {
      window.clearTimeout(t)
      t = window.setTimeout(() => {
        const cur = peek<LastPlace | null>('last', null)
        if (cur && cur.path === path) poke('last', { ...cur, scroll: Math.round(window.scrollY) })
      }, 250)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('scroll', onScroll)
    }
  }, [here, pathname, search])
  useEffect(() => {
    if (pathname === '/') document.title = 'Kotlin PPT Prep · COMP40009'
  }, [pathname])

  // New page: close the drawer and start at the top, unless we are resuming at a saved position.
  const restore = (location.state as { scroll?: number } | null)?.scroll
  useEffect(() => {
    setDrawer(false)
    if (!restore) {
      window.scrollTo(0, 0)
      return
    }
    // Lazy pages and editors keep growing for a moment after mount, so hold the saved
    // position for a short while, and let go as soon as the reader scrolls themselves.
    let h = 0
    const until = Date.now() + 1500
    const stop = () => window.clearTimeout(h)
    const tick = () => {
      if (Math.abs(window.scrollY - restore) > 2) window.scrollTo(0, restore)
      if (Date.now() < until) h = window.setTimeout(tick, 50)
    }
    tick()
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const
    events.forEach((e) => window.addEventListener(e, stop, { once: true, passive: true }))
    return () => {
      stop()
      events.forEach((e) => window.removeEventListener(e, stop))
    }
  }, [pathname, search, restore])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Cmd/Ctrl+S anywhere: there is nothing to save, so keep the browser's dialog away.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target) || document.querySelector('.modal')) return
      // Read the address bar, not the last render, so quick repeated presses each move one step.
      const [path, query = ''] = window.location.hash.replace(/^#/, '').split('?')
      const { prev, next, here } = neighbours(week, path, query ? `?${query}` : '')
      if (e.key === '/') {
        e.preventDefault()
        setDialog('jump')
      } else if (e.key === '?') {
        e.preventDefault()
        setDialog('help')
      } else if (e.key === '[' && prev) {
        navigate(prev.path)
      } else if (e.key === ']' && next) {
        if (here?.kind === 'lesson' && here.id) markRead(here.id)
        navigate(next.path)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, markRead, week])

  // One delegated handler for every "Copy" button on a code block.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest?.('[data-copy]') as HTMLButtonElement | null
      const code = btn?.parentElement?.querySelector('pre')?.textContent
      if (!btn || code == null) return
      void navigator.clipboard?.writeText(code).then(() => {
        btn.textContent = 'Copied'
        window.setTimeout(() => (btn.textContent = 'Copy'), 1500)
      })
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  const sidebarShown = sidebar && !focus
  return (
    <div className="shell" data-sidebar={sidebarShown ? 'open' : 'closed'} data-focus={focus || undefined}>
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }}>
        Skip to content
      </a>
      {!focus && (
        <header className="topbar">
          <button
            className="icon-btn menu-btn"
            aria-expanded={wide() ? sidebar : drawer}
            aria-controls="sidebar"
            onClick={() => (wide() ? setSidebar((s) => !s) : setDrawer((o) => !o))}
          >
            <span className="menu-icon" aria-hidden="true" />
            <span className="sr-only">Contents</span>
          </button>
          <Link to="/" className="brand">
            Kotlin PPT Prep
          </Link>
          <nav className="crumbs" aria-label="Breadcrumb">
            <ol>
              {here ? (
                <>
                  <li>
                    <Link to={paths.week(week.id)}>Week {week.number}</Link>
                  </li>
                  {here.kind !== 'overview' && here.section !== `Week ${week.number}` && (
                    <li>
                      <Link to={here.sectionPath}>{here.section}</Link>
                    </li>
                  )}
                  <li aria-current="page">{here.kind === 'overview' ? 'Overview' : stopLabel(here)}</li>
                </>
              ) : (
                <li aria-current="page">{pathname === '/' ? 'Home' : 'Not found'}</li>
              )}
            </ol>
          </nav>
          <div className="topbar-actions">
            <button className="jump-btn" onClick={() => setDialog('jump')} aria-label="Jump to a page" aria-keyshortcuts="/">
              <span className="jump-text" aria-hidden="true">Jump to…</span>
              <kbd aria-hidden="true">/</kbd>
            </button>
            <button className="icon-btn" onClick={() => setDialog('help')} aria-label="Keyboard shortcuts" aria-keyshortcuts="?">
              <span aria-hidden="true">?</span>
            </button>
            <button className="icon-btn theme-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
              <span aria-hidden="true">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </header>
      )}
      {!focus && (
        <nav id="sidebar" className={`sidebar ${drawer ? 'open' : ''}`} aria-label="Contents">
          <ul className="nav-list nav-top">
            <li>
              <NavLink end to="/">
                Home
              </NavLink>
            </li>
          </ul>
          {week.content && <WeekNav week={week} />}
          <div className="nav-foot">
            <p>Progress is kept in this browser only.</p>
            <button
              className="btn-link"
              onClick={() => {
                if (window.confirm('Clear all progress, saved code and the timer on this device?')) resetAll()
              }}
            >
              Reset progress
            </button>
          </div>
        </nav>
      )}
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}
      <main className="main" id="main" tabIndex={-1}>
        <Suspense fallback={<p className="loading" role="status">Loading…</p>}>
          <Outlet />
        </Suspense>
      </main>
      {dialog === 'jump' && <JumpPalette week={week} onClose={() => setDialog(null)} />}
      {dialog === 'help' && <HelpSheet onClose={() => setDialog(null)} />}
    </div>
  )
}
