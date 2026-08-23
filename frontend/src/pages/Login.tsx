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
          Log in
        </button>

        <p className="text-app-text-secondary text-sm text-center">
          Don't have an account?{' '}
          <a href="/signup" className="text-accent hover:underline">
            Sign up
          </a>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Login