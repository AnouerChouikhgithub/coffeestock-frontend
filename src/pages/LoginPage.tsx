import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { TextField } from '../components/FormField'
import { useAuth } from '../auth/useAuth'
import { ApiError } from '../services/api'
import { errorMessage } from '../services/types'

interface FieldIssues {
  username?: string
  password?: string
}

/** Only same-origin, absolute paths are honoured after sign-in (no open redirect). */
function redirectTarget(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const from = (state as { from?: unknown }).from
    if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && from !== '/login') {
      return from
    }
  }
  return '/'
}

/** Never distinguish "no such user" from "wrong password" (REQ-081). */
function describeLoginError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return 'Invalid username or password.'
    }
    if (err.status === 429) {
      // The backend's own message already states the cooldown without revealing
      // whether the account exists.
      return err.message
    }
    if (err.status === 400 || err.status === 422) {
      return 'Enter both a username and a password.'
    }
  }
  return errorMessage(err, 'Could not sign in. Please try again.')
}

export function LoginPage() {
  const { status, login } = useAuth()
  const location = useLocation()
  const target = redirectTarget(location.state)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [issues, setIssues] = useState<FieldIssues>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // An already-authenticated tab does not belong on the login screen.
  if (status === 'authenticated') {
    return <Navigate to={target} replace />
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextIssues: FieldIssues = {}
    if (username.trim() === '') {
      nextIssues.username = 'Enter your username.'
    }
    if (password === '') {
      nextIssues.password = 'Enter your password.'
    }
    setIssues(nextIssues)
    setFormError(null)
    if (Object.keys(nextIssues).length > 0) {
      return
    }

    setSubmitting(true)
    try {
      await login(username.trim(), password)
      // The guard in RequireAuth observes the session and renders the target route.
    } catch (err) {
      setFormError(describeLoginError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main id="main-content" className="login-main">
      <div className="login-card">
        <p className="eyebrow">CoffeeStock</p>
        <h1 className="login-title">Sign in</h1>
        <p className="page-subtitle">
          Internal stock control. Use the credentials issued by your manager.
        </p>

        {formError ? (
          <Alert variant="error" title="Sign-in failed">
            <p>{formError}</p>
          </Alert>
        ) : null}

        <form className="login-form" onSubmit={(e) => void onSubmit(e)} noValidate>
          <TextField
            label="Username"
            name="username"
            value={username}
            autoComplete="username"
            autoFocus
            error={issues.username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            value={password}
            autoComplete="current-password"
            error={issues.password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="button login-submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-footnote">
          Sessions last up to 8 hours and are stored in this tab only.
        </p>
      </div>
    </main>
  )
}
