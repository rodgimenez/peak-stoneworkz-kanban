import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { addComment, deleteCard, deleteComment, moveCardToBoard, subscribeComments, updateCard } from '../lib/db'
import { PRIORITIES, type Board, type Card, type Comment, type Priority, type Project } from '../lib/types'
import { Avatar } from './Avatar'
import { Modal } from './Modal'

const field = 'w-full rounded border border-stone-300 px-2.5 py-1.5 text-sm'
const label = 'mb-1 block text-xs font-medium text-stone-500 uppercase'

export function CardModal({
  project,
  board,
  boards,
  card,
  onClose,
  onMovedToBoard,
}: {
  project: Project
  board: Board
  boards: Board[]
  card: Card
  onClose: () => void
  onMovedToBoard: (boardId: string) => void
}) {
  const { user } = useAuth()
  const [draft, setDraft] = useState({
    title: card.title,
    description: card.description,
    labels: card.labels.join(', '),
    jobRef: card.jobRef ?? '',
    blockedReason: card.blockedReason ?? '',
  })
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => subscribeComments(project.id, card.id, setComments), [project.id, card.id])

  const save = (data: Partial<Card>) => updateCard(project.id, card.id, data).catch((e) => setError(e.message))

  // Text fields save on blur; dropdowns/dates save immediately.
  const saveText = () => {
    const labels = draft.labels.split(',').map((s) => s.trim()).filter(Boolean)
    const changes: Partial<Card> = {}
    if (draft.title.trim() && draft.title.trim() !== card.title) changes.title = draft.title.trim()
    if (draft.description !== card.description) changes.description = draft.description
    if (labels.join(',') !== card.labels.join(',')) changes.labels = labels
    if ((draft.jobRef.trim() || null) !== card.jobRef) changes.jobRef = draft.jobRef.trim() || null
    if (card.blocked && (draft.blockedReason.trim() || null) !== (card.blockedReason ?? null))
      changes.blockedReason = draft.blockedReason.trim() || null
    if (Object.keys(changes).length) save(changes)
  }

  async function onDelete() {
    if (!confirm(`Delete ${project.key}-${card.number}? This can't be undone.`)) return
    onClose()
    await deleteCard(project.id, card.id).catch((e) => alert(e.message))
  }

  async function onComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || !user) return
    setNewComment('')
    await addComment(project.id, card.id, {
      text: newComment.trim(),
      authorUid: user.uid,
      authorName: user.displayName || user.email || 'Unknown',
    }).catch((err) => setError(err.message))
  }

  const columnName = board.columns.find((c) => c.id === card.columnId)?.name ?? '—'

  function toggleBlocked() {
    if (card.blocked) {
      save({ blocked: false, blockedReason: null })
      setDraft({ ...draft, blockedReason: '' })
    } else {
      save({ blocked: true, blockedReason: draft.blockedReason.trim() || null })
    }
  }

  async function onChangeBoard(boardId: string) {
    const target = boards.find((b) => b.id === boardId)
    if (!target || target.id === board.id) return
    saveText()
    try {
      await moveCardToBoard(project.id, card.id, target)
      onMovedToBoard(target.id)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <Modal onClose={() => (saveText(), onClose())} wide>
      <div className="flex items-center gap-3 border-b border-stone-200 px-5 py-3 text-sm text-stone-500">
        <span className="font-mono font-medium text-amber-700">
          {project.key}-{card.number}
        </span>
        <span>
          in {board.name} · {columnName}
        </span>
        {card.blocked && (
          <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
            Blocked
          </span>
        )}
        <span className="flex-1" />
        <button onClick={onDelete} className="text-rose-600 hover:underline">
          Delete
        </button>
        <button onClick={() => (saveText(), onClose())} className="text-xl leading-none hover:text-stone-900">
          ×
        </button>
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-[1fr_220px]">
        <div className="min-w-0 space-y-4">
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            onBlur={saveText}
            className="w-full rounded px-1 py-1 text-xl font-semibold hover:bg-stone-50 focus:bg-white"
          />
          <div
            className={`rounded-lg border p-3 ${card.blocked ? 'border-rose-300 bg-rose-50' : 'border-stone-200 bg-stone-50'}`}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={toggleBlocked}
                className={`rounded px-3 py-1.5 text-sm font-medium ${
                  card.blocked
                    ? 'bg-white text-rose-700 ring-1 ring-rose-300 hover:bg-rose-100'
                    : 'bg-rose-600 text-white hover:bg-rose-700'
                }`}
              >
                {card.blocked ? 'Unblock' : 'Mark as blocked'}
              </button>
              <span className="text-sm text-stone-600">
                {card.blocked ? 'This card is blocked.' : 'Flag it if work is stuck.'}
              </span>
            </div>
            {card.blocked && (
              <input
                value={draft.blockedReason}
                onChange={(e) => setDraft({ ...draft, blockedReason: e.target.value })}
                onBlur={saveText}
                placeholder="Why? e.g. waiting on customer to approve the layout"
                className={`${field} mt-2 bg-white`}
              />
            )}
          </div>
          <div>
            <label className={label}>Description</label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              onBlur={saveText}
              rows={6}
              placeholder="Details, measurements, customer notes…"
              className={field}
            />
          </div>

          <div>
            <label className={label}>Comments</label>
            <ul className="space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-2 text-sm">
                  <Avatar email={c.authorName} name={c.authorName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-stone-500">
                      <span className="font-medium text-stone-700">{c.authorName}</span>{' '}
                      {c.createdAt?.toDate().toLocaleString()}
                      {c.authorUid === user?.uid && (
                        <button
                          onClick={() => deleteComment(project.id, card.id, c.id)}
                          className="ml-2 text-stone-400 hover:text-rose-600"
                        >
                          delete
                        </button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap">{c.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <form onSubmit={onComment} className="mt-3 flex gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment…"
                className={field}
              />
              <button className="rounded bg-stone-800 px-3 text-sm font-medium text-white hover:bg-stone-700">Post</button>
            </form>
          </div>
        </div>

        <aside className="space-y-4">
          {boards.length > 1 && (
            <div>
              <label className={label}>Board</label>
              <select value={board.id} onChange={(e) => onChangeBoard(e.target.value)} className={field}>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={label}>Status</label>
            <select value={card.columnId} onChange={(e) => save({ columnId: e.target.value })} className={field}>
              {board.columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Assignee</label>
            <select
              value={card.assigneeEmail ?? ''}
              onChange={(e) => save({ assigneeEmail: e.target.value || null })}
              className={field}
            >
              <option value="">Unassigned</option>
              {project.memberEmails.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Priority</label>
            <select
              value={card.priority}
              onChange={(e) => save({ priority: e.target.value as Priority })}
              className={`${field} capitalize`}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Due date</label>
            <input
              type="date"
              value={card.dueDate ?? ''}
              onChange={(e) => save({ dueDate: e.target.value || null })}
              className={field}
            />
          </div>
          <div>
            <label className={label}>Labels</label>
            <input
              value={draft.labels}
              onChange={(e) => setDraft({ ...draft, labels: e.target.value })}
              onBlur={saveText}
              placeholder="granite, kitchen"
              className={field}
            />
          </div>
          <div>
            <label className={label}>Job / inventory ref</label>
            <input
              value={draft.jobRef}
              onChange={(e) => setDraft({ ...draft, jobRef: e.target.value })}
              onBlur={saveText}
              placeholder="e.g. Smith kitchen, slab #1042"
              className={field}
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </aside>
      </div>
    </Modal>
  )
}
