interface LogoProps {
  size?: number
  showWordmark?: boolean
  light?: boolean
}

function Logo({ size = 40, showWordmark = true, light = false }: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 100 130" fill="none">
        <path d="M50 0 L100 18 L100 60 Q100 105 50 130 Q0 105 0 60 L0 18 Z" fill="var(--color-accent-800)" />
        <path d="M50 8 L92 23 L92 60 Q92 98 50 120 Q8 98 8 60 L8 23 Z" fill="var(--color-accent-100)" />
        <path d="M28 30 L64 30 L76 42 L76 100 L28 100 Z" fill="#fff" stroke="var(--color-accent-800)" strokeWidth="2" />
        <path d="M64 30 L64 42 L76 42 Z" fill="var(--color-accent-200)" stroke="var(--color-accent-800)" strokeWidth="2" />
        <circle cx="52" cy="72" r="16" fill="#fff" stroke="var(--color-accent-700)" strokeWidth="3" />
        <circle cx="52" cy="72" r="7" fill="var(--color-accent)" />
        <rect x="49" y="72" width="6" height="10" rx="2" fill="var(--color-accent)" />
      </svg>

      {showWordmark && (
        <span className="text-xl font-heading font-semibold">
          <span className={light ? 'text-white' : 'text-[color:var(--color-accent-800)]'}>Doc</span>
          <span className={light ? 'text-accent-200' : 'text-accent'}>Vault</span>
        </span>
      )}
    </div>
  )
}

export default Logo
