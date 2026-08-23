import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import AuthLayout from '../components/AuthLayout'
import { API_URL } from '../config'
function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)

    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    })

    if (!response.ok) {
      setError('Incorrect email or password')
      return
    }

    const data = await response.json()
    localStorage.setItem('access_token', data.access_token)
    navigate('/')
  }

  return (
    <AuthLayout
      headline={
        <>
          Welcome back to
          <br />
          your documents.
        </>
      }
      subtext="Log in to search, upload, and manage everything in one place."
    >
      <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-app-surface p-8 rounded-lg w-80 flex flex-col gap-4 border border-slate-200 dark:border-app-border">
        <div className="flex justify-center mb-4">
          <Logo size={48} />
        </div>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-white dark:bg-app-bg text-slate-900 dark:text-white p-2 rounded border border-slate-300 dark:border-app-border"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-white dark:bg-app-bg text-slate-900 dark:text-white p-2 rounded border border-slate-300 dark:border-app-border"
        />

        {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}

        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded">
          Log in
        </button>

        <p className="text-slate-500 dark:text-slate-400 text-sm text-center">
          Don't have an account?{' '}
          <a href="/signup" className="text-blue-600 dark:text-blue-400 hover:underline">
            Sign up
          </a>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Login