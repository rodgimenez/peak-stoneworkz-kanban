import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import type { Card, Column } from '../lib/types'
import { CardTile } from './CardTile'

function SortableCard({ card, projectKey, onOpen }: { card: Card; projectKey: string; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-30' : ''}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e)
        if (e.key === 'Enter') onOpen()
      }}
    >
      <CardTile card={card} projectKey={projectKey} />
    </div>
  )
}

export function BoardColumn({
  column,
  cards,
  projectKey,
  onOpenCard,
  onAddCard,
}: {
  column: Column
  cards: Card[]
  projectKey: string
  onOpenCard: (id: string) => void
  onAddCard: (title: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const overLimit = column.wipLimit != null && cards.length > column.wipLimit
  const blockedCount = cards.filter((c) => c.blocked).length

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim()) onAddCard(title.trim())
    setTitle('')
  }

  return (
    <section className="flex w-72 shrink-0 flex-col rounded-lg bg-stone-200/70">
      <header className="flex items-center justify-between px-3 pt-3 pb-2">
        <h2 className="text-sm font-semibold tracking-wide text-stone-700 uppercase">{column.name}</h2>
        {blockedCount > 0 && (
          <span className="mr-auto ml-2 text-xs font-medium text-rose-600">{blockedCount} blocked</span>
        )}
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${overLimit ? 'bg-rose-600 text-white' : 'bg-stone-300 text-stone-700'}`}
          title={column.wipLimit != null ? `WIP limit ${column.wipLimit}` : undefined}
        >
          {cards.length}
          {column.wipLimit != null && ` / ${column.wipLimit}`}
        </span>
      </header>

      <SortableContext id={column.id} items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 ${isOver ? 'bg-amber-100/60' : ''}`}
        >
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} projectKey={projectKey} onOpen={() => onOpenCard(card.id)} />
          ))}
        </div>
      </SortableContext>

      <div className="p-2 pt-0">
        {adding ? (
          <form onSubmit={submit}>
            <textarea
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) submit(e)
                if (e.key === 'Escape') setAdding(false)
              }}
              onBlur={() => !title.trim() && setAdding(false)}
              rows={2}
              placeholder="What needs to be done?"
              className="w-full resize-none rounded border border-stone-300 bg-white p-2 text-sm"
            />
            <div className="mt-1 flex gap-2">
              <button className="rounded bg-amber-600 px-3 py-1 text-sm font-medium text-white hover:bg-amber-700">
                Add
              </button>
              <button type="button" onClick={() => setAdding(false)} className="text-sm text-stone-600">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full rounded px-2 py-1.5 text-left text-sm text-stone-600 hover:bg-stone-300/60"
          >
            + Add card
          </button>
        )}
      </div>
    </section>
  )
}
