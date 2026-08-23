import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isTauri } from '@tauri-apps/api/core'
import Logo from './Logo'
import { getSweepNotesAssignments, setSweepNotesAssignments } from '../utils/watcherSettings'

interface SidebarProps {
  activePage: 'documents' | 'trash'
  userEmail: string | null
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onLogout: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

function Sidebar({
  activePage,
  userEmail,
  theme,
  onToggleTheme,
  onLogout,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [sweepNotesAssignments, setSweepNotesAssignmentsState] = useState(getSweepNotesAssignments)

  function toggleSweepNotesAssignments() {
    const next = !sweepNotesAssignments
    setSweepNotesAssignments(next)
    setSweepNotesAssignmentsState(next)
  }

  const linkClass = (page: 'documents' | 'trash') =>
    page === activePage
      ? 'px-3 py-2 rounded-app-md bg-app-surface text-app-text text-sm font-medium'
      : 'px-3 py-2 rounded-app-md text-app-text-secondary text-sm'

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-56 shrink-0 overflow-y-auto border-r border-app-border bg-app-bg p-6 flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="mb-8">
            <Logo size={32} />
          </div>
          <nav className="flex flex-col gap-1">
            <Link to="/" onClick={onCloseMobile} className={linkClass('documents')}>
              All Documents
            </Link>
            <Link to="/trash" onClick={onCloseMobile} className={linkClass('trash')}>
              Trash
            </Link>
          </nav>
        </div>

        <div className="flex flex-col gap-3">
          {isTauri() && (
            <label className="flex items-center justify-between gap-2 px-3 py-2 rounded-app-md bg-app-surface text-sm cursor-pointer">
              <span className="text-app-text-secondary">
                Auto-add notes &amp; assignments
              </span>
              <input
                type="checkbox"
                checked={sweepNotesAssignments}
                onChange={toggleSweepNotesAssignments}
                className="accent-accent"
              />
            </label>
          )}
          {userEmail && (
            <div className="flex items-center gap-2 px-1 mb-1">
              <div className="w-7 h-7 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center shrink-0">
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-app-text-secondary truncate">{userEmail}</span>
            </div>
          )}
          <button
            onClick={onToggleTheme}
            className="bg-app-surface text-app-text px-3 py-2 rounded-app-md text-sm"
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button
            onClick={onLogout}
            className="bg-app-surface text-app-text px-3 py-2 rounded-app-md text-sm"
          >
            Log out
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
