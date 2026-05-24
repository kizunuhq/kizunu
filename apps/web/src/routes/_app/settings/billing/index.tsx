import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { SettingsRow } from '@kizunu/web/components/composed/settings-row'
import { Card } from '@kizunu/web/components/primitives/card'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/settings/billing/')({
  component: BillingPage,
})

function BillingPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Billing" description="Billing is part of the managed cloud." />
      <Card>
        <SettingsRow
          title="Self-hosted plan"
          description="The open-source distribution is free to run yourself."
          action={
            <a
              href="https://github.com/kizunuhq/kizunu"
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground font-mono text-xs underline-offset-2 hover:underline"
            >
              github.com/kizunuhq/kizunu
            </a>
          }
        />
        <SettingsRow
          title="Managed cloud"
          description="Hosted billing, SSO, audit log, and premium connectors arrive in Phase 2."
        />
      </Card>
    </div>
  )
}
