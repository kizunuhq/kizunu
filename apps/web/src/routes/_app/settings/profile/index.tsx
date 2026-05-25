import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { SettingsRow } from '@kizunu/web/components/composed/settings-row'
import { buttonVariants } from '@kizunu/web/components/primitives/button'
import { Card } from '@kizunu/web/components/primitives/card'
import { EmailRowAction } from '@kizunu/web/routes/_app/settings/profile/-components/email-row-action'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/settings/profile/')({
  component: ProfilePage,
})

function ProfilePage() {
  const { user, connectorIdentities } = useCurrentUser()
  const isVerified = Boolean(user?.emailVerifiedAt)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profile" description="Account details and password recovery." />
      <Card>
        <SettingsRow title="Name" description={user?.name ?? '—'} />
        <SettingsRow
          title="Email"
          description={user?.email ?? '—'}
          action={<EmailRowAction isVerified={isVerified} />}
        />
        <SettingsRow
          title="Password"
          description="Password changes are handled via the email reset flow."
          action={
            <Link
              to="/auth/forgot-password"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Change password
            </Link>
          }
        />
      </Card>
      <ConnectorIdentitiesCard identities={connectorIdentities} />
    </div>
  )
}

interface ConnectorIdentitiesCardProps {
  identities: Array<{ connectorAccountId: string; connectorId: string; externalId: string }>
}

function ConnectorIdentitiesCard({ identities }: ConnectorIdentitiesCardProps) {
  if (identities.length === 0) {
    return (
      <Card>
        <SettingsRow
          title="Connector identities"
          description="No CRM identities mapped yet. Admin maps you when your first deal arrives."
        />
      </Card>
    )
  }
  return (
    <Card>
      {identities.map((identity) => (
        <SettingsRow
          key={identity.connectorAccountId + identity.externalId}
          title={identity.connectorId}
          description={`External id: ${identity.externalId}`}
        />
      ))}
    </Card>
  )
}
