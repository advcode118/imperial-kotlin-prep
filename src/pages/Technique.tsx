import { Markdown } from '../components/Markdown'
import { MissingWeek, useWeek } from './common'

export function TechniquePage() {
  const week = useWeek()
  if (!week) return <MissingWeek />
  const t = week.content.technique
  return (
    <article className="page">
      <p className="eyebrow">Week {week.number}</p>
      <h1>PPT technique</h1>
      <Markdown md={t.intro} />
      {t.sections.map((s) => (
        <section key={s.id} id={s.id} className="technique-section">
          <h2>
            {s.title}
            <span className={`source source-${s.source}`}>
              {s.source === 'spec' ? 'From the spec' : 'General advice'}
            </span>
          </h2>
          <Markdown md={s.md} />
        </section>
      ))}
    </article>
  )
}
