import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import AuthLayout from '../components/AuthLayout'
import { API_URL } from '../config'
function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const response = await fetch(`${API_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const data = await response.json()
      setError(data.detail || 'Signup failed')
      return
    }

    navigate('/login')
  }

  return (
    <AuthLayout
      headline={
        <>
          Stop losing track
          <br />
          of what matters.
        </>
      }
      subtext="Create your account and start making your documents searchable in minutes."
    >
      <form onSubmit={handleSubmit} className="bg-app-surface p-8 rounded-app-lg w-80 flex flex-col gap-4 border border-app-border">
        <div className="flex justify-center mb-4">
          <Logo size={48} />
        </div>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-app-bg text-app-text p-2 rounded-app-md border border-app-border"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-app-bg text-app-text p-2 rounded-app-md border border-app-border"
        />

        {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}

        <button type="submit" className="bg-accent hover:bg-accent-hover text-white p-2 rounded-app-md">
          Sign up
        </button>

        <p className="text-app-text-secondary text-sm text-center">
          Already have an account?{' '}
          <a href="/login" className="text-accent hover:underline">
            Log in
          </a>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Signup