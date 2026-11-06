import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { createProject, subscribeMyProjects } from '../lib/db'
import type { Project } from '../lib/types'

const suggestKey = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 4)

export function ProjectsPage() {
  const { user, email } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [keyTouched, setKeyTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => subscribeMyProjects(email, setProjects, (e) => setError(e.message)), [email])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !key.trim() || !user) return
    setBusy(true)
    try {
      const id = await createProject({ name, key, ownerUid: user.uid, ownerEmail: email })
      navigate(`/p/${id}`)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Projects</h1>
      {error && <p className="mb-4 rounded bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects === null && <p className="text-stone-500">Loading…</p>}
        {projects?.map((p) => (
          <Link
            key={p.id}
            to={`/p/${p.id}`}
            className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition hover:border-amber-500 hover:shadow"
          >
            <div className="text-xs font-semibold text-amber-700">{p.key}</div>
            <div className="mt-1 font-medium">{p.name}</div>
            <div className="mt-2 text-xs text-stone-500">
              {p.memberEmails.length} member{p.memberEmails.length === 1 ? '' : 's'} · {p.cardCounter} cards
            </div>
          </Link>
        ))}
        {projects?.length === 0 && <p className="text-stone-500 sm:col-span-2">No projects yet. Create one below.</p>}
      </div>

      <form onSubmit={onCreate} className="mt-8 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-medium">New project</h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (!keyTouched) setKey(suggestKey(e.target.value))
            }}
            placeholder="e.g. Residential Installs"
            className="min-w-48 flex-1 rounded border border-stone-300 px-3 py-2"
          />
          <input
            value={key}
            onChange={(e) => {
              setKeyTouched(true)
              setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
            }}
            placeholder="KEY"
            className="w-24 rounded border border-stone-300 px-3 py-2 font-mono uppercase"
          />
          <button
            disabled={busy || !name.trim() || !key}
            className="rounded bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            Create
          </button>
        </div>
        <p className="mt-2 text-xs text-stone-500">The key prefixes card numbers, like {key || 'KEY'}-1.</p>
      </form>
    </div>
  )
}
