import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Label, Button } from '@postpilot/ui'
import { apiFetch } from '../../lib/api.js'
import { queryKeys } from '../../lib/queries.js'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(60, 'Name is too long'),
})

type FormData = z.infer<typeof schema>

interface CreateWorkspaceFormProps {
  orgId: string
  onCreated?: () => void
}

export function CreateWorkspaceForm({ orgId, onCreated }: CreateWorkspaceFormProps) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      apiFetch('/api/workspaces', { method: 'POST', orgId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces(orgId) })
      reset()
      onCreated?.()
    },
    onError: (err: Error) => setError('root', { message: err.message }),
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ws-name">Workspace name</Label>
        <div className="flex gap-2">
          <Input
            id="ws-name"
            placeholder="e.g. Marketing, Product…"
            disabled={isSubmitting}
            className="flex-1"
            {...register('name')}
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create'}
          </Button>
        </div>
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      {errors.root && (
        <p className="text-sm text-destructive">{errors.root.message}</p>
      )}
    </form>
  )
}
