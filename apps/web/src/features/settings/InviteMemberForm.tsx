import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Label, Button } from '@postpilot/ui'
import { apiFetch } from '../../lib/api.js'
import { queryKeys } from '../../lib/queries.js'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['admin', 'billing', 'member']),
})

type FormData = z.infer<typeof schema>

interface InviteMemberFormProps {
  orgId: string
}

export function InviteMemberForm({ orgId }: InviteMemberFormProps) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'member' },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      apiFetch('/api/invites', { method: 'POST', orgId, data }),
    onSuccess: () => {
      reset()
      queryClient.invalidateQueries({ queryKey: queryKeys.orgInvites(orgId) })
    },
    onError: (err: Error) => setError('root', { message: err.message }),
  })

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold">Invite a member</h3>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-email">Email address</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="colleague@example.com"
            {...register('email')}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-role">Role</Label>
          <select
            id="invite-role"
            {...register('role')}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="billing">Billing</option>
          </select>
        </div>

        {errors.root && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errors.root.message}
          </p>
        )}

        {isSubmitSuccessful && !errors.root && (
          <p className="text-sm text-emerald-600">Invite sent successfully!</p>
        )}

        <Button type="submit" disabled={isSubmitting} className="self-start">
          {isSubmitting ? 'Sending…' : 'Send invite'}
        </Button>
      </form>
    </div>
  )
}
