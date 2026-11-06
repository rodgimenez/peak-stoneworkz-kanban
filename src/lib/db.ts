import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import { compareRank, rankBetween } from './rank'
import type { Board, Card, Column, Comment, Project } from './types'

export const DEFAULT_COLUMNS: Column[] = [
  { id: 'todo', name: 'To Do', wipLimit: null },
  { id: 'in-progress', name: 'In Progress', wipLimit: 5 },
  { id: 'review', name: 'Review', wipLimit: null },
  { id: 'done', name: 'Done', wipLimit: null },
]

const projectsCol = collection(db, 'projects')
const boardsCol = (projectId: string) => collection(db, 'projects', projectId, 'boards')
const cardsCol = (projectId: string) => collection(db, 'projects', projectId, 'cards')
const commentsCol = (projectId: string, cardId: string) =>
  collection(db, 'projects', projectId, 'cards', cardId, 'comments')

type Unsub = () => void
type OnError = (e: Error) => void

// ---------- Projects ----------

export function subscribeMyProjects(email: string, cb: (p: Project[]) => void, onError?: OnError): Unsub {
  const q = query(projectsCol, where('memberEmails', 'array-contains', email))
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Project)
      cb(list.sort((a, b) => a.name.localeCompare(b.name)))
    },
    onError,
  )
}

export function subscribeProject(id: string, cb: (p: Project | null) => void, onError?: OnError): Unsub {
  return onSnapshot(
    doc(db, 'projects', id),
    (d) => cb(d.exists() ? ({ id: d.id, ...d.data() } as Project) : null),
    onError,
  )
}

/** Creates the project plus a first board. */
export async function createProject(input: { name: string; key: string; ownerUid: string; ownerEmail: string }) {
  const ref = await addDoc(projectsCol, {
    name: input.name.trim(),
    key: input.key.trim().toUpperCase(),
    ownerUid: input.ownerUid,
    memberEmails: [input.ownerEmail.toLowerCase()],
    cardCounter: 0,
    createdAt: serverTimestamp(),
  })
  await createBoard(ref.id, 'Main board', 0)
  return ref.id
}

export function updateProject(id: string, data: Partial<Pick<Project, 'name' | 'memberEmails'>>) {
  return updateDoc(doc(db, 'projects', id), data)
}

// ---------- Boards ----------

export function subscribeBoards(projectId: string, cb: (b: Board[]) => void, onError?: OnError): Unsub {
  return onSnapshot(
    query(boardsCol(projectId), orderBy('order')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Board)),
    onError,
  )
}

export async function createBoard(projectId: string, name: string, order: number, columns: Column[] = DEFAULT_COLUMNS) {
  const ref = await addDoc(boardsCol(projectId), { name: name.trim(), columns, order, createdAt: serverTimestamp() })
  return ref.id
}

export function updateBoard(projectId: string, boardId: string, data: Partial<Pick<Board, 'name' | 'columns' | 'order'>>) {
  return updateDoc(doc(boardsCol(projectId), boardId), data)
}

/** Only call for empty boards (the UI enforces this). */
export function deleteBoard(projectId: string, boardId: string) {
  return deleteDoc(doc(boardsCol(projectId), boardId))
}

// ---------- Cards ----------

export function subscribeCards(projectId: string, boardId: string, cb: (c: Card[]) => void, onError?: OnError): Unsub {
  return onSnapshot(
    query(cardsCol(projectId), where('boardId', '==', boardId), orderBy('rank')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Card)),
    onError,
  )
}

/** Creates a card and assigns the next sequential number (PSW-1, PSW-2…) atomically. */
export async function createCard(
  projectId: string,
  input: { title: string; boardId: string; columnId: string; rank: string; createdBy: string },
) {
  const projectRef = doc(db, 'projects', projectId)
  const cardRef = doc(cardsCol(projectId))
  await runTransaction(db, async (tx) => {
    const p = await tx.get(projectRef)
    if (!p.exists()) throw new Error('Project not found')
    const number = ((p.data().cardCounter as number) ?? 0) + 1
    tx.update(projectRef, { cardCounter: number })
    tx.set(cardRef, {
      number,
      boardId: input.boardId,
      title: input.title.trim(),
      description: '',
      columnId: input.columnId,
      rank: input.rank,
      priority: 'medium',
      assigneeEmail: null,
      labels: [],
      dueDate: null,
      jobRef: null,
      blocked: false,
      blockedReason: null,
      createdBy: input.createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })
  return cardRef.id
}

export function updateCard(projectId: string, cardId: string, data: Partial<Omit<Card, 'id' | 'number'>>) {
  return updateDoc(doc(db, 'projects', projectId, 'cards', cardId), { ...data, updatedAt: serverTimestamp() })
}

/** Moves a card to the bottom of the first column of another board. */
export async function moveCardToBoard(projectId: string, cardId: string, target: Board) {
  const columnId = target.columns[0].id
  const snap = await getDocs(query(cardsCol(projectId), where('boardId', '==', target.id)))
  const ranks = snap.docs
    .map((d) => d.data() as Card)
    .filter((c) => c.columnId === columnId)
    .map((c) => c.rank)
    .sort(compareRank)
  const last = ranks.length ? ranks[ranks.length - 1] : null
  await updateCard(projectId, cardId, { boardId: target.id, columnId, rank: rankBetween(last, null) })
}

export async function deleteCard(projectId: string, cardId: string) {
  // Firestore doesn't cascade: remove comments first.
  const comments = await getDocs(commentsCol(projectId, cardId))
  const batch = writeBatch(db)
  comments.forEach((c) => batch.delete(c.ref))
  batch.delete(doc(db, 'projects', projectId, 'cards', cardId))
  await batch.commit()
}

// ---------- Comments ----------

export function subscribeComments(projectId: string, cardId: string, cb: (c: Comment[]) => void): Unsub {
  return onSnapshot(query(commentsCol(projectId, cardId), orderBy('createdAt')), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Comment)),
  )
}

export function addComment(projectId: string, cardId: string, c: Omit<Comment, 'id' | 'createdAt'>) {
  return addDoc(commentsCol(projectId, cardId), { ...c, createdAt: serverTimestamp() })
}

export function deleteComment(projectId: string, cardId: string, commentId: string) {
  return deleteDoc(doc(commentsCol(projectId, cardId), commentId))
}
