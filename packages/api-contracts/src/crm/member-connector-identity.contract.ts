import { z } from 'zod'

export const MemberConnectorIdentitySchema = z.object({
  id: z.uuid(),
  membershipId: z.uuid(),
  userId: z.uuid(),
  userEmail: z.email(),
  userName: z.string(),
  externalId: z.string().min(1).max(120),
  createdBy: z.string().min(1).max(80),
  sourceEmail: z.email().nullable(),
  createdAt: z.iso.datetime(),
})

export type MemberConnectorIdentity = z.infer<typeof MemberConnectorIdentitySchema>

export const ListMemberConnectorIdentitiesResponseSchema = z.object({
  items: MemberConnectorIdentitySchema.array(),
})

export type ListMemberConnectorIdentitiesResponse = z.infer<
  typeof ListMemberConnectorIdentitiesResponseSchema
>

export const CreateMemberConnectorIdentityRequestSchema = z.object({
  membershipId: z.uuid(),
  externalId: z.string().min(1).max(120),
})

export type CreateMemberConnectorIdentityRequest = z.infer<
  typeof CreateMemberConnectorIdentityRequestSchema
>

export const CreateMemberConnectorIdentityResponseSchema = z.object({
  id: z.uuid(),
})

export type CreateMemberConnectorIdentityResponse = z.infer<
  typeof CreateMemberConnectorIdentityResponseSchema
>

export const UpdateMemberConnectorIdentityRequestSchema = z.object({
  membershipId: z.uuid(),
})

export type UpdateMemberConnectorIdentityRequest = z.infer<
  typeof UpdateMemberConnectorIdentityRequestSchema
>
