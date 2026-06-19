import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button, Input } from '@postpilot/ui'
import { authClient } from '../../lib/auth-client'

export function ResetPasswordForm({ token }: { token: string }) {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const mismatch = confirm.length > 0 && password !== confirm
  const weak = password.length > 0 && password.length < 8

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mismatch || weak) return
    setError('')
    setLoading(true)
    const { error: err } = await authClient.resetPassword({ newPassword: password, token })
    setLoading(false)
    if (err) {
      setError(err.message ?? 'Reset failed — the link may have expired')
    } else {
      navigate({ to: '/login', replace: true })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">New password</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
          disabled={loading}
        />
        {weak && <p className="mt-1 text-xs text-destructive">Must be at least 8 characters</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Confirm password</label>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat password"
          required
          disabled={loading}
        />
        {mismatch && <p className="mt-1 text-xs text-destructive">Passwords don't match</p>}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading || mismatch || weak || !password}>
        {loading ? 'Resetting…' : 'Set new password'}
      </Button>
    </form>
  )
}
