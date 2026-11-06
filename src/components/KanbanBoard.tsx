import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { createCard, updateCard } from '../lib/db'
import { compareRank, rankBetween } from '../lib/rank'
import type { Board, Card, Project } from '../lib/types'
import { CardTile } from './CardTile'
import { BoardColumn } from './BoardColumn'

type Items = Record<string, string[]>
type Override = { columnId: string; rank: string }

function buildItems(board: Board, cards: Card[]): Items {
  const items: Items = Object.fromEntries(board.columns.map((c) => [c.id, [] as string[]]))
  const fallback = board.columns[0]?.id
  for (const c of [...cards].sort((a, b) => compareRank(a.rank, b.rank))) {
    ;(items[c.columnId] ?? items[fallback])?.push(c.id)
  }
  return items
}

export function KanbanBoard({
  project,
  board,
  cards: serverCards,
  onOpenCard,
  onError,
}: {
  project: Project
  board: Board
  cards: Card[]
  onOpenCard: (id: string) => void
  onError: (msg: string) => void
}) {
  const { user } = useAuth()

  // Optimistic moves: applied until the Firestore snapshot catches up, so cards never "jump back".
  const [overrides, setOverrides] = useState<Record<string, Override>>({})
  const cards = useMemo(
    () => serverCards.map((c) => (overrides[c.id] ? { ...c, ...overrides[c.id] } : c)),
    [serverCards, overrides],
  )
  const cardMap = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])

  useEffect(() => {
    setOverrides((prev) => {
      const next = { ...prev }
      let changed = false
      for (const c of serverCards) {
        const o = next[c.id]
        if (o && o.columnId === c.columnId && o.rank === c.rank) {
          delete next[c.id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [serverCards])

  const [activeId, setActiveId] = useState<string | null>(null)
  const [items, setItems] = useState<Items>(() => buildItems(board, cards))

  // While dragging we own `items`; otherwise it mirrors live data.
  useEffect(() => {
    if (!activeId) setItems(buildItems(board, cards))
  }, [board, cards, activeId])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const findContainer = (id: string) => (id in items ? id : Object.keys(items).find((k) => items[k].includes(id)))

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id))
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const id = String(active.id)
    const overId = String(over.id)
    const from = findContainer(id)
    const to = findContainer(overId)
    if (!from || !to || from === to) return
    setItems((prev) => {
      const toItems = [...prev[to]]
      const overIndex = toItems.indexOf(overId)
      toItems.splice(overIndex >= 0 ? overIndex : toItems.length, 0, id)
      return { ...prev, [from]: prev[from].filter((x) => x !== id), [to]: toItems }
    })
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const id = String(active.id)
    const container = findContainer(id)
    setActiveId(null)
    if (!over || !container) return

    let list = items[container]
    const overId = String(over.id)
    if (overId !== id && list.includes(overId)) list = arrayMove(list, list.indexOf(id), list.indexOf(overId))

    const idx = list.indexOf(id)
    const before = idx > 0 ? (cardMap.get(list[idx - 1])?.rank ?? null) : null
    const after = idx < list.length - 1 ? (cardMap.get(list[idx + 1])?.rank ?? null) : null
    const card = cardMap.get(id)
    if (!card) return

    const unchanged =
      card.columnId === container &&
      (before === null || compareRank(before, card.rank) < 0) &&
      (after === null || compareRank(card.rank, after) < 0)
    if (unchanged) return

    const move = { columnId: container, rank: rankBetween(before, after) }
    setOverrides((o) => ({ ...o, [id]: move }))
    updateCard(project.id, id, move).catch((e: Error) => {
      setOverrides((o) => {
        const rest = { ...o }
        delete rest[id]
        return rest
      })
      onError(`Couldn't move card: ${e.message}`)
    })
  }

  async function addCard(columnId: string, title: string) {
    const ids = items[columnId] ?? []
    const last = ids.length ? (cardMap.get(ids[ids.length - 1])?.rank ?? null) : null
    try {
      await createCard(project.id, { title, boardId: board.id, columnId, rank: rankBetween(last, null), createdBy: user!.uid })
    } catch (e) {
      onError(`Couldn't create card: ${(e as Error).message}`)
    }
  }

  const activeCard = activeId ? cardMap.get(activeId) : undefined

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {board.columns.map((col) => (
          <BoardColumn
            key={col.id}
            column={col}
            projectKey={project.key}
            cards={(items[col.id] ?? []).map((id) => cardMap.get(id)).filter((c): c is Card => !!c)}
            onOpenCard={onOpenCard}
            onAddCard={(title) => addCard(col.id, title)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard && <CardTile card={activeCard} projectKey={project.key} dragging />}
      </DragOverlay>
    </DndContext>
  )
}
