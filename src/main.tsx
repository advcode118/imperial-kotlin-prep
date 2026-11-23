import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './styles/tokens.css'
import './styles/site.css'
import './styles/app.css'
import { App, preloadRoute } from './App'

const render = () =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>,
  )

// Wait for the opening page's chunk (already being fetched, see index.html) so the first paint is the page itself.
preloadRoute(window.location.hash).then(render, render)
