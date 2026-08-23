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
      ? 'px-3 py-2 rounded-md bg-slate-100 dark:bg-app-surface text-slate-900 dark:text-white text-sm font-medium'
      : 'px-3 py-2 rounded-md text-slate-500 dark:text-slate-400 text-sm'

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-56 shrink-0 overflow-y-auto border-r border-slate-200 dark:border-app-border bg-white dark:bg-app-bg p-6 flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0 ${
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
            <label className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-slate-100 dark:bg-app-surface text-sm cursor-pointer">
              <span className="text-slate-700 dark:text-slate-300">
                Auto-add notes &amp; assignments
              </span>
              <input
                type="checkbox"
                checked={sweepNotesAssignments}
                onChange={toggleSweepNotesAssignments}
                className="accent-blue-600"
              />
            </label>
          )}
          {userEmail && (
            <div className="flex items-center gap-2 px-1 mb-1">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</span>
            </div>
          )}
          <button
            onClick={onToggleTheme}
            className="bg-slate-100 dark:bg-app-surface text-slate-900 dark:text-white px-3 py-2 rounded-md text-sm"
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button
            onClick={onLogout}
            className="bg-slate-100 dark:bg-app-surface text-slate-900 dark:text-white px-3 py-2 rounded-md text-sm"
          >
            Log out
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
