import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import { drillsAt, getWeek, paths, weeks } from '../content'
import { LEVELS, type Week } from '../content/schema'
import { resetAll, useProgress } from '../lib/store'
import { useTheme } from '../lib/theme'

function WeekNav({ week }: { week: Week }) {
  const { progress } = useProgress()
  const c = week.content!
  const w = week.id
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
          <div key={g.id}>
            <p className="nav-heading">
              {g.title}
              <span className="nav-count">
                {done} of {g.lessons.length} read
              </span>
            </p>
            <ol className="nav-list">
              {g.lessons.map((l) => (
                <li key={l.id}>
                  <NavLink to={paths.lesson(w, l.id)}>
                    <span>{l.title}</span>
                    {progress.read[l.id] && <span className="tick">✓</span>}
                  </NavLink>
                </li>
              ))}
            </ol>
          </div>
        )
      })}
      <p className="nav-heading">
        <Link to={paths.drills(w)}>Drill book</Link>
      </p>
      <ul className="nav-list">
        {LEVELS.map((lv) => {
          const ds = drillsAt(week, lv.id)
          const passed = ds.filter((d) => progress.questions[d.id] === 'passed').length
          return (
            <li key={lv.id}>
              <NavLink to={paths.level(w, lv.id)}>
                <span>{lv.title}</span>
                <span className="nav-count">
                  {passed}/{ds.length}
                </span>
              </NavLink>
            </li>
          )
        })}
      </ul>
      <p className="nav-heading">Before the PPT</p>
      <ul className="nav-list">
        <li>
          <NavLink to={paths.prePpt(w)}>
            <span>Pre-PPT exercise</span>
            <span className="nav-count">
              {c.prePpt.parts.filter((p) => progress.parts[p.id]).length}/{c.prePpt.parts.length}
            </span>
          </NavLink>
        </li>
        <li>
          <NavLink to={paths.technique(w)}>PPT technique</NavLink>
        </li>
      </ul>
    </>
  )
}

export function Layout() {
  const { weekId } = useParams()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [theme, toggleTheme] = useTheme()
  const week = getWeek(weekId) ?? weeks.find((w) => w.content)!

  useEffect(() => {
    setOpen(false)
    if (!location.search.includes('q=')) window.scrollTo(0, 0)
  }, [location.pathname, location.search])

  return (
    <div className="shell">
      <header className="topbar">
        <button className="menu-btn" aria-expanded={open} aria-controls="sidebar" onClick={() => setOpen((o) => !o)}>
          {open ? 'Close' : 'Contents'}
        </button>
        <Link to="/" className="brand">
          Kotlin PPT Prep <span className="brand-sub">COMP40009 Computing Practical 1</span>
        </Link>
        <button className="theme-btn" onClick={toggleTheme} aria-label="Switch colour theme">
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </header>
      <nav id="sidebar" className={`sidebar ${open ? 'open' : ''}`} aria-label="Contents">
        {week.content && <WeekNav week={week} />}
        <p className="nav-heading">Course</p>
        <ul className="nav-list">
          <li>
            <NavLink end to="/">
              Roadmap
            </NavLink>
          </li>
        </ul>
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
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
