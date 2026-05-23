import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { SettingsRow } from '@kizunu/web/components/composed/settings-row'
import { buttonVariants } from '@kizunu/web/components/primitives/button'
import { Card } from '@kizunu/web/components/primitives/card'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/settings/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { user } = useCurrentUser()
  const isVerified = Boolean(user?.emailVerifiedAt)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profile" description="Account details and password recovery." />
      <Card>
        <SettingsRow title="Name" description={user?.name ?? '—'} />
        <SettingsRow
          title="Email"
          description={user?.email ?? '—'}
          action={
            isVerified ? (
              <span className="text-kizunu-green inline-flex items-center gap-1 font-mono text-xs">
                <span className="bg-kizunu-green inline-block size-1.5 rounded-full" />
                Verified
              </span>
            ) : (
              <Link
                to="/auth/verify-email"
                search={{ token: '' }}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Verify
              </Link>
            )
          }
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
    </div>
  )
}
