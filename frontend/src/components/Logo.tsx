interface LogoProps {
  size?: number
  showWordmark?: boolean
  light?: boolean
}

function Logo({ size = 40, showWordmark = true, light = false }: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 100 130" fill="none">
        <path d="M50 0 L100 18 L100 60 Q100 105 50 130 Q0 105 0 60 L0 18 Z" fill="#0C447C" />
        <path d="M50 8 L92 23 L92 60 Q92 98 50 120 Q8 98 8 60 L8 23 Z" fill="#E6F1FB" />
        <path d="M28 30 L64 30 L76 42 L76 100 L28 100 Z" fill="#ffffff" stroke="#0C447C" strokeWidth="2" />
        <path d="M64 30 L64 42 L76 42 Z" fill="#B5D4F4" stroke="#0C447C" strokeWidth="2" />
        <circle cx="52" cy="72" r="16" fill="#ffffff" stroke="#185FA5" strokeWidth="3" />
        <circle cx="52" cy="72" r="7" fill="#1D9E75" />
        <rect x="49" y="72" width="6" height="10" rx="2" fill="#1D9E75" />
        <line x1="30" y1="72" x2="36" y2="72" stroke="#185FA5" strokeWidth="2" />
        <line x1="68" y1="72" x2="74" y2="72" stroke="#185FA5" strokeWidth="2" />
        <line x1="52" y1="54" x2="52" y2="60" stroke="#185FA5" strokeWidth="2" />
      </svg>

      {showWordmark && (
        <span className="text-xl font-bold">
          <span className={light ? 'text-white' : 'text-blue-900 dark:text-blue-300'}>Doc</span>
          <span className={light ? 'text-blue-300' : 'text-blue-500 dark:text-blue-400'}>Vault</span>
        </span>
      )}
    </div>
  )
}

export default Logo