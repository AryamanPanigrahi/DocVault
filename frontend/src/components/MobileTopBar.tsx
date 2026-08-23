import Logo from './Logo'

interface MobileTopBarProps {
  onOpenMenu: () => void
}

function MobileTopBar({ onOpenMenu }: MobileTopBarProps) {
  return (
    <div className="md:hidden flex items-center justify-between mb-6">
      <Logo size={28} />
      <button
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="p-2 rounded-md bg-slate-100 dark:bg-app-surface text-slate-900 dark:text-white"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <line x1="3" y1="5" x2="17" y2="5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="3" y1="15" x2="17" y2="15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

export default MobileTopBar
