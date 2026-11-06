import type { Card, Priority } from '../lib/types'
import { Avatar } from './Avatar'

export const PRIORITY_STYLE: Record<Priority, string> = {
  low: 'bg-stone-200 text-stone-700',
  medium: 'bg-sky-100 text-sky-800',
  high: 'bg-amber-100 text-amber-800',
  urgent: 'bg-rose-600 text-white',
}

const today = () => new Date().toISOString().slice(0, 10)

export function CardTile({ card, projectKey, dragging }: { card: Card; projectKey: string; dragging?: boolean }) {
  const overdue = card.dueDate && card.dueDate < today()
  return (
    <article
      className={`cursor-grab rounded-md border bg-white p-3 text-sm shadow-sm hover:border-amber-400 ${
        card.blocked ? 'border-rose-300 border-l-4 border-l-rose-500' : 'border-stone-200'
      } ${
        dragging ? 'rotate-2 cursor-grabbing shadow-lg' : ''
      }`}
    >
      {card.blocked && (
        <div className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-rose-700" title={card.blockedReason ?? ''}>
          <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] tracking-wide text-white uppercase">Blocked</span>
          {card.blockedReason && <span className="truncate font-normal">{card.blockedReason}</span>}
        </div>
      )}
      {card.labels.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {card.labels.map((l) => (
            <span key={l} className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
              {l}
            </span>
          ))}
        </div>
      )}
      <p className="leading-snug break-words">{card.title}</p>
      {card.jobRef && <p className="mt-1 truncate text-xs text-stone-500">Job: {card.jobRef}</p>}
      <footer className="mt-2 flex items-center gap-2 text-xs text-stone-500">
        <span className="font-mono">
          {projectKey}-{card.number}
        </span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_STYLE[card.priority]}`}>
          {card.priority}
        </span>
        {card.dueDate && <span className={overdue ? 'font-medium text-rose-600' : ''}>{card.dueDate.slice(5)}</span>}
        <span className="flex-1" />
        {card.assigneeEmail && <Avatar email={card.assigneeEmail} size="sm" />}
      </footer>
    </article>
  )
}
