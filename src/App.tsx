import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DrillLevelPage, DrillsIndexPage } from './pages/Drills'
import { HomePage } from './pages/Home'
import { LessonPage } from './pages/Lesson'
import { NotFoundPage } from './pages/NotFound'
import { OverviewPage } from './pages/Overview'
import { PrePptPage } from './pages/PrePpt'
import { TechniquePage } from './pages/Technique'

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
