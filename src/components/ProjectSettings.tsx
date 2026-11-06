import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { updateProject } from '../lib/db'
import type { Project } from '../lib/types'
import { Modal } from './Modal'

const field = 'rounded border border-stone-300 px-2.5 py-1.5 text-sm'
const label = 'mb-1 block text-xs font-medium text-stone-500 uppercase'

export function ProjectSettings({ project, onClose }: { project: Project; onClose: () => void }) {
  const { user } = useAuth()
  const [name, setName] = useState(project.name)
  const [members, setMembers] = useState(project.memberEmails)
  const [newMember, setNewMember] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const isOwner = user?.uid === project.ownerUid

  function addMember(e: React.FormEvent) {
    e.preventDefault()
    const email = newMember.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.')
    if (!members.includes(email)) setMembers([...members, email])
    setNewMember('')
    setError(null)
  }

  async function save() {
    if (!name.trim()) return setError('Project name is required.')
    setSaving(true)
    try {
      await updateProject(project.id, { name: name.trim(), memberEmails: members })
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="space-y-6 p-5">
        <h2 className="text-lg font-semibold">Project settings</h2>
        <div>
          <label className={label}>Project name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={`${field} w-full`} />
        </div>
        <div>
          <label className={label}>Members (shared by all boards in this project)</label>
          <ul className="space-y-1 text-sm">
            {members.map((m) => {
              const isSelf = m === user?.email?.toLowerCase()
              return (
                <li key={m} className="flex items-center justify-between rounded bg-stone-50 px-2.5 py-1.5">
                  <span>
                    {m}
                    {isSelf && <span className="ml-1 text-stone-400">(you)</span>}
                  </span>
                  {!(isSelf && isOwner) && (
                    <button onClick={() => setMembers(members.filter((x) => x !== m))} className="text-rose-600">
                      Remove
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
          <form onSubmit={addMember} className="mt-2 flex gap-2">
            <input
              value={newMember}
              onChange={(e) => setNewMember(e.target.value)}
              placeholder="teammate@peakstoneworkz.com"
              className={`${field} flex-1`}
            />
            <button className="rounded bg-stone-800 px-3 text-sm font-medium text-white">Add</button>
          </form>
          <p className="mt-1 text-xs text-stone-500">Members sign in with Google using this email.</p>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
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
