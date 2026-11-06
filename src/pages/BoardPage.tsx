import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BoardSettings } from '../components/BoardSettings'
import { CardModal } from '../components/CardModal'
import { KanbanBoard } from '../components/KanbanBoard'
import { ProjectSettings } from '../components/ProjectSettings'
import { createBoard, subscribeBoards, subscribeCards, subscribeProject } from '../lib/db'
import type { Board, Card, Project } from '../lib/types'

const NO_ACCESS = "You don't have access to this project. Ask the project owner to add your email in Project settings."
const describe = (e: Error) => ((e as { code?: string }).code === 'permission-denied' ? NO_ACCESS : e.message)

const lastBoardKey = (projectId: string) => `lastBoard:${projectId}`
const readLastBoard = (projectId: string) => {
  try {
    return localStorage.getItem(lastBoardKey(projectId))
  } catch {
    return null
  }
}

export function BoardPage() {
  const { projectId = '', boardId } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [project, setProject] = useState<Project | null | undefined>(undefined)
  const [boards, setBoards] = useState<Board[] | undefined>(undefined)
  // Cards are tagged with the board they were loaded for, so switching boards never shows stale cards.
  const [cardsState, setCardsState] = useState<{ boardId: string; cards: Card[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'project' | 'board' | null>(null)
  const [search, setSearch] = useState('')
  const [assignee, setAssignee] = useState('')
  const [blockedOnly, setBlockedOnly] = useState(false)
  const [newBoardName, setNewBoardName] = useState<string | null>(null)

  useEffect(() => subscribeProject(projectId, setProject, (e) => setError(describe(e))), [projectId])
  useEffect(() => subscribeBoards(projectId, setBoards, (e) => setError(describe(e))), [projectId])
  useEffect(() => {
    if (!boardId) return
    try {
      localStorage.setItem(lastBoardKey(projectId), boardId)
    } catch {
      /* storage unavailable: fine */
    }
    return subscribeCards(projectId, boardId, (cards) => setCardsState({ boardId, cards }), (e) => setError(describe(e)))
  }, [projectId, boardId])

  const board = boards?.find((b) => b.id === boardId)
  const cards = useMemo(
    () => (cardsState && cardsState.boardId === boardId ? cardsState.cards : []),
    [cardsState, boardId],
  )
  const blockedCount = cards.filter((c) => c.blocked).length

  // Small boards: filter on the client. For big ones, add Typesense/Algolia later.
  const visibleCards = useMemo(() => {
    const q = search.trim().toLowerCase()
    return cards.filter(
      (c) =>
        (!blockedOnly || c.blocked) &&
        (!assignee || (assignee === '__none' ? !c.assigneeEmail : c.assigneeEmail === assignee)) &&
        (!q ||
          `${project?.key}-${c.number} ${c.title} ${c.description} ${c.labels.join(' ')} ${c.jobRef ?? ''} ${c.blockedReason ?? ''}`
            .toLowerCase()
            .includes(q)),
    )
  }, [cards, search, assignee, blockedOnly, project?.key])

  const openCardId = params.get('card')
  const openCard = openCardId ? cards.find((c) => c.id === openCardId) : undefined
  const setOpenCard = (id: string | null) => setParams(id ? { card: id } : {}, { replace: !id })

  async function addBoard(e: React.FormEvent) {
    e.preventDefault()
    const name = newBoardName?.trim()
    if (!name) return setNewBoardName(null)
    try {
      const order = Math.max(-1, ...(boards ?? []).map((b) => b.order)) + 1
      const id = await createBoard(projectId, name, order)
      setNewBoardName(null)
      navigate(`/p/${projectId}/b/${id}`)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (error && (!project || !boards))
    return (
      <div className="p-6">
        <p className="mb-2 text-rose-700">
          {error === NO_ACCESS ? error : `Can't open this project: ${error}`}
        </p>
        <Link to="/" className="text-amber-700 underline">
          Back to projects
        </Link>
      </div>
    )
  if (project === undefined || boards === undefined) return <div className="p-6 text-stone-500">Loading board…</div>
  if (project === null)
    return (
      <div className="p-6">
        Project not found.{' '}
        <Link to="/" className="text-amber-700 underline">
          Back to projects
        </Link>
      </div>
    )

  // No board (or an unknown one) in the URL: go to the last-used board, or the first.
  if (boards.length && !board) {
    const last = readLastBoard(projectId)
    const target = boards.find((b) => b.id === last) ?? boards[0]
    return <Navigate to={`/p/${projectId}/b/${target.id}`} replace />
  }

  const tabs = (
    <nav className="flex items-end gap-1 overflow-x-auto border-b border-stone-200 bg-white px-4">
      {boards.map((b) => (
        <NavLink
          key={b.id}
          to={`/p/${projectId}/b/${b.id}`}
          className={({ isActive }) =>
            `-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${
              isActive ? 'border-amber-600 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800'
            }`
          }
        >
          {b.name}
        </NavLink>
      ))}
      {newBoardName === null ? (
        <button
          onClick={() => setNewBoardName('')}
          className="shrink-0 px-3 py-2 text-sm text-stone-500 hover:text-amber-700"
        >
          + New board
        </button>
      ) : (
        <form onSubmit={addBoard} className="flex shrink-0 items-center gap-1 py-1">
          <input
            autoFocus
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setNewBoardName(null)}
            onBlur={() => !newBoardName.trim() && setNewBoardName(null)}
            placeholder="Board name, e.g. Installations"
            className="w-56 rounded border border-stone-300 px-2 py-1 text-sm"
          />
          <button className="rounded bg-amber-600 px-2.5 py-1 text-sm font-medium text-white">Add</button>
        </form>
      )}
    </nav>
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 bg-white px-4 py-2.5">
        <h1 className="text-lg font-semibold">
          <span className="mr-2 font-mono text-sm text-amber-700">{project.key}</span>
          {project.name}
        </h1>
        <span className="flex-1" />
        {board && (
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cards…"
              className="w-48 rounded border border-stone-300 px-2.5 py-1.5 text-sm"
            />
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="rounded border border-stone-300 px-2 py-1.5 text-sm"
            >
              <option value="">Everyone</option>
              <option value="__none">Unassigned</option>
              {project.memberEmails.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <button
              onClick={() => setBlockedOnly(!blockedOnly)}
              aria-pressed={blockedOnly}
              className={`rounded border px-3 py-1.5 text-sm ${
                blockedOnly
                  ? 'border-rose-600 bg-rose-600 text-white'
                  : 'border-stone-300 hover:bg-stone-50 ' + (blockedCount ? 'text-rose-700' : '')
              }`}
            >
              Blocked ({blockedCount})
            </button>
            <button
              onClick={() => setDialog('board')}
              className="rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50"
            >
              Board settings
            </button>
          </>
        )}
        <button
          onClick={() => setDialog('project')}
          className="rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50"
        >
          Project settings
        </button>
      </div>
      {tabs}

      {error && (
        <div className="flex justify-between bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="min-h-0 flex-1">
        {board ? (
          <KanbanBoard
            key={board.id}
            project={project}
            board={board}
            cards={visibleCards}
            onOpenCard={setOpenCard}
            onError={setError}
          />
        ) : (
          <div className="p-6 text-stone-600">This project has no boards yet. Use “+ New board” above to create one.</div>
        )}
      </div>

      {board && openCard && (
        <CardModal
          key={openCard.id}
          project={project}
          board={board}
          boards={boards}
          card={openCard}
          onClose={() => setOpenCard(null)}
          onMovedToBoard={(id) => navigate(`/p/${projectId}/b/${id}?card=${openCard.id}`)}
        />
      )}
      {dialog === 'project' && <ProjectSettings project={project} onClose={() => setDialog(null)} />}
      {dialog === 'board' && board && (
        <BoardSettings
          project={project}
          board={board}
          boardCount={boards.length}
          cards={cards}
          onClose={() => setDialog(null)}
          onDeleted={() => {
            setDialog(null)
            const next = boards.find((b) => b.id !== board.id)
            navigate(next ? `/p/${projectId}/b/${next.id}` : `/p/${projectId}`, { replace: true })
          }}
        />
      )}
    </div>
  )
}
