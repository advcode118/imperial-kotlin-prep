import { Link, useParams } from 'react-router-dom'
import { Pager } from '../components/Pager'
import { Markdown } from '../components/Markdown'
import { QuestionCard } from '../components/QuestionCard'
import { RunnableExample } from '../components/RunnableExample'
import { lessonsOf, paths } from '../content'
import type { Block } from '../content/schema'
import { useProgress } from '../lib/store'
import { MissingWeek, useWeek } from './common'

function BlockView({ block, checkNumber }: { block: Block; checkNumber: number }) {
  switch (block.kind) {
    case 'prose':
      return <Markdown md={block.md} />
    case 'example':
      return <RunnableExample key={block.id} code={block.code} title={block.title} />
    case 'haskell':
      return (
        <aside className="callout callout-haskell">
          <p className="callout-title">From Haskell</p>
          <Markdown md={block.md} />
        </aside>
      )
    case 'note':
      return (
        <aside className="callout">
          <p className="callout-title">{block.title}</p>
          <Markdown md={block.md} />
        </aside>
      )
    case 'check':
      return <QuestionCard q={block.question} number={`Check ${checkNumber}`} />
  }
}

export function LessonPage() {
  const week = useWeek()
  const { lessonId } = useParams()
  const { progress, markRead } = useProgress()
  if (!week) return <MissingWeek />
  const lessons = lessonsOf(week)
  const index = lessons.findIndex((l) => l.id === lessonId)
  if (index < 0) return <MissingWeek />
  const lesson = lessons[index]
  const group = week.content.groups.find((g) => g.lessons.includes(lesson))!
  const related = week.content.drills.filter((d) => d.lesson === lesson.id)
  const isRead = !!progress.read[lesson.id]
  let checks = 0

  return (
    <article className="page" key={lesson.id}>
      <p className="eyebrow">
        {group.title} · {group.lessons.indexOf(lesson) + 1} of {group.lessons.length}
      </p>
      <h1>{lesson.title}</h1>
      <p className="lede">{lesson.summary}</p>
      {lesson.blocks.map((b, i) => (
        <BlockView key={i} block={b} checkNumber={b.kind === 'check' ? ++checks : 0} />
      ))}

      {related.length > 0 && (
        <section className="related">
          <h2>Practise this</h2>
          <ul>
            {related.map((d) => (
              <li key={d.id}>
                <Link to={paths.drill(week.id, d)}>{d.title}</Link>
                {progress.questions[d.id] === 'passed' && (
                  <span className="tick">
                    {' '}
                    <span aria-hidden="true">✓</span>
                    <span className="sr-only">answered correctly</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="lesson-foot">
        <label className="read-toggle">
          <input type="checkbox" checked={isRead} onChange={(e) => markRead(lesson.id, e.target.checked)} />
          I have read this lesson
        </label>
        <Pager week={week} />
      </footer>
    </article>
  )
}
