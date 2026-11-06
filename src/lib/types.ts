import type { Timestamp } from 'firebase/firestore'

export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']

export interface Column {
  id: string
  name: string
  wipLimit: number | null
}

export interface Project {
  id: string
  name: string
  /** Short prefix for card numbers, e.g. "PSW" -> PSW-12 */
  key: string
  ownerUid: string
  /** Lower-cased emails of everyone who can see/edit this project */
  memberEmails: string[]
  cardCounter: number
  createdAt?: Timestamp
}

/** A project can have several boards (e.g. Sales, Fabrication, Installs), each with its own columns. */
export interface Board {
  id: string
  name: string
  columns: Column[]
  /** Tab order */
  order: number
  createdAt?: Timestamp
}

export interface Card {
  id: string
  number: number
  boardId: string
  title: string
  description: string
  columnId: string
  /** Fractional index string; sort ascending (byte order) within a column */
  rank: string
  priority: Priority
  assigneeEmail: string | null
  labels: string[]
  /** YYYY-MM-DD */
  dueDate: string | null
  /** Free-form reference to a job / inventory item (to be linked to the inventory app later) */
  jobRef: string | null
  /** Blocked flag: the card is stuck (waiting on customer, material, etc.) whatever column it's in */
  blocked?: boolean
  blockedReason?: string | null
  createdBy: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface Comment {
  id: string
  text: string
  authorUid: string
  authorName: string
  createdAt?: Timestamp
}
