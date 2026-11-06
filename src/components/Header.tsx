import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from './Avatar'

export function Header({ children }: { children?: React.ReactNode }) {
  const { user, email, signOut } = useAuth()
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-stone-300 bg-stone-800 px-4 text-stone-100">
      <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
        <span className="grid h-7 w-7 place-items-center rounded bg-amber-600 text-sm font-bold">P</span>
        <span className="hidden sm:inline">Peak Stoneworkz Boards</span>
      </Link>
      <div className="flex-1">{children}</div>
      <div className="flex items-center gap-3">
        <Avatar email={email} name={user?.displayName} photoURL={user?.photoURL} />
        <button onClick={signOut} className="text-sm text-stone-300 hover:text-white">
          Sign out
        </button>
      </div>
    </header>
  )
}
