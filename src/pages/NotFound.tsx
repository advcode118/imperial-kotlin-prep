import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <article className="page">
      <h1>Page not found</h1>
      <p>
        There is nothing at this address. Go back to the <Link to="/">roadmap</Link>.
      </p>
    </article>
  )
}
