import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Input, Button } from '@postpilot/ui'
import { apiFetch } from '../../lib/api.js'
import { queryKeys } from '../../lib/queries.js'

interface CreateWorkspaceFormProps {
  orgId: string
  onCreated?: () => void
}

export function CreateWorkspaceForm({ orgId, onCreated }: CreateWorkspaceFormProps) {
  const [name, setName] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch('/api/workspaces', {
        method: 'POST',
        orgId,
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces(orgId) })
      setName('')
      onCreated?.()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    mutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        placeholder="Workspace name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={mutation.isPending}
        className="flex-1"
      />
      <Button type="submit" disabled={mutation.isPending || !name.trim()}>
        {mutation.isPending ? 'Creating…' : 'Create'}
      </Button>
      {mutation.isError && (
        <p className="text-sm text-destructive">
          {(mutation.error as Error).message}
        </p>
      )}
    </form>
  )
}
