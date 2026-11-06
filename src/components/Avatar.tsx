const COLORS = ['bg-amber-600', 'bg-sky-600', 'bg-emerald-600', 'bg-rose-600', 'bg-violet-600', 'bg-teal-600']

function colorFor(s: string) {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0
  return COLORS[Math.abs(h) % COLORS.length]
}

export function initials(nameOrEmail: string) {
  const base = nameOrEmail.split('@')[0]
  const parts = base.split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function Avatar({
  email,
  name,
  photoURL,
  size = 'md',
}: {
  email: string
  name?: string | null
  photoURL?: string | null
  size?: 'sm' | 'md'
}) {
  const cls = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs'
  if (photoURL) return <img src={photoURL} alt={name ?? email} title={email} className={`${cls} rounded-full`} />
  return (
    <span
      title={email}
      className={`${cls} ${colorFor(email)} inline-grid shrink-0 place-items-center rounded-full font-semibold text-white`}
    >
      {initials(name || email)}
    </span>
  )
}
