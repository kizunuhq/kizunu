import { z } from 'zod'

export const WorkspaceMemberSchema = z.object({
  membershipId: z.uuid(),
  userId: z.uuid(),
  userEmail: z.email(),
  userName: z.string(),
  role: z.enum(['admin', 'member']),
  status: z.enum(['active', 'inactive']),
  joinedAt: z.iso.datetime(),
})

export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>

export const ListMembersResponseSchema = z.object({
  members: z.array(WorkspaceMemberSchema),
})

export type ListMembersResponse = z.infer<typeof ListMembersResponseSchema>
