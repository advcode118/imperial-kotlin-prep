import { lazy, type ComponentType } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/Home'

/**
 * A page in its own chunk. `preload` fetches it ahead of rendering; once it has
 * arrived the page renders directly, with no Suspense fallback in between.
 */
function page(load: () => Promise<ComponentType>) {
  let Loaded: ComponentType | null = null
  let pending: Promise<ComponentType> | null = null
  const get = () => (pending ??= load().then((c) => (Loaded = c)))
  const Lazy = lazy(() => get().then((c) => ({ default: c })))
  const Page = () => (Loaded ? <Loaded /> : <Lazy />)
  Page.preload = get
  return Page
}

// The chunk names (the file names under pages/) are also used by the preload script in index.html.
const OverviewPage = page(() => import('./pages/Overview').then((m) => m.OverviewPage))
const LessonPage = page(() => import('./pages/Lesson').then((m) => m.LessonPage))
const DrillsIndexPage = page(() => import('./pages/Drills').then((m) => m.DrillsIndexPage))
const DrillLevelPage = page(() => import('./pages/Drills').then((m) => m.DrillLevelPage))
const PrePptPage = page(() => import('./pages/PrePpt').then((m) => m.PrePptPage))
const TechniquePage = page(() => import('./pages/Technique').then((m) => m.TechniquePage))
const NotFoundPage = page(() => import('./pages/NotFound').then((m) => m.NotFoundPage))

/** Fetch the page for the URL the site was opened on, so the first render is the real page. */
export function preloadRoute(hash: string): Promise<unknown> {
  const path = hash.replace(/^#/, '').split('?')[0]
  if (/^\/week\/[^/]+\/lesson\//.test(path)) return LessonPage.preload()
  if (/^\/week\/[^/]+\/drills\/./.test(path)) return DrillLevelPage.preload()
  if (/^\/week\/[^/]+\/drills\/?$/.test(path)) return DrillsIndexPage.preload()
  if (/^\/week\/[^/]+\/pre-ppt/.test(path)) return PrePptPage.preload()
  if (/^\/week\/[^/]+\/technique/.test(path)) return TechniquePage.preload()
  if (/^\/week\/[^/]+\/?$/.test(path)) return OverviewPage.preload()
  return Promise.resolve()
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="week/:weekId" element={<OverviewPage />} />
        <Route path="week/:weekId/lesson/:lessonId" element={<LessonPage />} />
        <Route path="week/:weekId/drills" element={<DrillsIndexPage />} />
        <Route path="week/:weekId/drills/:level" element={<DrillLevelPage />} />
        <Route path="week/:weekId/pre-ppt" element={<PrePptPage />} />
        <Route path="week/:weekId/technique" element={<TechniquePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
