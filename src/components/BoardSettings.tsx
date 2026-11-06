import { useState } from 'react'
import { deleteBoard, updateBoard } from '../lib/db'
import type { Board, Card, Column, Project } from '../lib/types'
import { Modal } from './Modal'

const field = 'rounded border border-stone-300 px-2.5 py-1.5 text-sm'
const label = 'mb-1 block text-xs font-medium text-stone-500 uppercase'

export function BoardSettings({
  project,
  board,
  boardCount,
  cards,
  onClose,
  onDeleted,
}: {
  project: Project
  board: Board
  boardCount: number
  cards: Card[]
  onClose: () => void
  onDeleted: () => void
}) {
  const [name, setName] = useState(board.name)
  const [columns, setColumns] = useState<Column[]>(board.columns)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const countIn = (colId: string) => cards.filter((c) => c.columnId === colId).length
  const setCol = (i: number, patch: Partial<Column>) =>
    setColumns(columns.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  const moveCol = (i: number, d: -1 | 1) => {
    const next = [...columns]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    setColumns(next)
  }

  async function save() {
    if (!name.trim()) return setError('Board name is required.')
    if (columns.some((c) => !c.name.trim())) return setError('Every column needs a name.')
    setSaving(true)
    try {
      await updateBoard(project.id, board.id, { name: name.trim(), columns })
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!confirm(`Delete the board "${board.name}"?`)) return
    try {
      await deleteBoard(project.id, board.id)
      onDeleted()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const canDelete = boardCount > 1 && cards.length === 0

  return (
    <Modal onClose={onClose}>
      <div className="space-y-6 p-5">
        <h2 className="text-lg font-semibold">Board settings</h2>
        <div>
          <label className={label}>Board name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={`${field} w-full`} />
        </div>

        <div>
          <label className={label}>Columns</label>
          <ul className="space-y-2">
            {columns.map((c, i) => {
              const count = countIn(c.id)
              return (
                <li key={c.id} className="flex items-center gap-2">
                  <input value={c.name} onChange={(e) => setCol(i, { name: e.target.value })} className={`${field} flex-1`} />
                  <input
                    type="number"
                    min={1}
                    value={c.wipLimit ?? ''}
                    onChange={(e) => setCol(i, { wipLimit: e.target.value ? Number(e.target.value) : null })}
                    placeholder="WIP"
                    title="Work-in-progress limit (optional)"
                    className={`${field} w-16`}
                  />
                  <button disabled={i === 0} onClick={() => moveCol(i, -1)} className="px-1 disabled:opacity-30">
                    ↑
                  </button>
                  <button
                    disabled={i === columns.length - 1}
                    onClick={() => moveCol(i, 1)}
                    className="px-1 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    disabled={count > 0 || columns.length <= 1}
                    title={count > 0 ? `Move its ${count} card(s) out first` : 'Remove column'}
                    onClick={() => setColumns(columns.filter((_, j) => j !== i))}
                    className="px-1 text-rose-600 disabled:opacity-30"
                  >
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
          <button
            onClick={() =>
              setColumns([...columns, { id: `col-${crypto.randomUUID().slice(0, 8)}`, name: 'New column', wipLimit: null }])
            }
            className="mt-2 text-sm text-amber-700 hover:underline"
          >
            + Add column
          </button>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex items-center gap-2">
          <button
            onClick={onDelete}
            disabled={!canDelete}
            title={
              boardCount <= 1
                ? 'A project needs at least one board'
                : cards.length > 0
                  ? 'Move or delete its cards first'
                  : undefined
            }
            className="text-sm text-rose-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
          >
            Delete board
          </button>
          <span className="flex-1" />
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-stone-600">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
