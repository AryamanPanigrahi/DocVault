import type { ReactNode } from 'react'
import Logo from './Logo'
import useTheme from '../hooks/useTheme'

const features = [
  { title: 'OCR-powered search', desc: "Find documents by what's written inside them, not just their name." },
  { title: 'Secure by design', desc: 'Token-based auth, hashed passwords, and ownership-checked access on every file.' },
  { title: 'Light & dark themes', desc: 'A calm, focused interface that adapts to how you work.' },
  { title: 'Cross-device sync', desc: 'Windows to Android, coming soon.', comingSoon: true },
]

interface AuthLayoutProps {
  children: ReactNode
  headline: ReactNode
  subtext: string
}

function AuthLayout({ children, headline, subtext }: AuthLayoutProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-white dark:bg-app-bg">
      <header className="px-6 md:px-16 py-6 flex items-center justify-between">
        <Logo size={32} />
        <button
          onClick={toggleTheme}
          className="bg-slate-100 dark:bg-app-surface text-slate-900 dark:text-white px-3 py-2 rounded-md text-sm"
        >
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
      </header>

      <section className="px-6 md:px-16 py-10 md:py-16 grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight mb-4">
            {headline}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base">{subtext}</p>
        </div>

        <div className="flex justify-center">{children}</div>
      </section>

      <section className="border-t border-slate-200 dark:border-app-border px-6 md:px-16 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-10 text-center">
            Why DocVault
          </h2>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="grid sm:grid-cols-2 gap-6">
              {features.map((f) => (
                <div key={f.title}>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-slate-900 dark:text-white font-semibold text-sm">{f.title}</p>
                    {f.comingSoon && (
                      <span className="text-[10px] uppercase tracking-wide bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">
                        Soon
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{f.desc}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-app-border shadow-lg overflow-hidden bg-slate-50 dark:bg-app-surface">
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-200 dark:border-app-border">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <div className="p-4 flex flex-col gap-2">
                {[
                  { c: 'bg-blue-500', t: 'DOC', w: 'w-2/3' },
                  { c: 'bg-red-500', t: 'PDF', w: 'w-1/2' },
                  { c: 'bg-amber-500', t: 'IMG', w: 'w-3/4' },
                ].map((row, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-white dark:bg-app-bg rounded-lg p-2.5 border border-slate-200 dark:border-app-border"
                  >
                    <div className={`w-8 h-8 rounded-md ${row.c} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>
                      {row.t}
                    </div>
                    <div className={`h-2 ${row.w} bg-slate-200 dark:bg-slate-600 rounded-full`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AuthLayout