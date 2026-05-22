import { Card, CardContent, CardHeader, CardTitle } from '@kizunu/web/components/primitives/card'
import { CadenceBuilder } from '@kizunu/web/features/cadence/components/cadence-builder'
import { CadencesTable } from '@kizunu/web/features/cadence/components/cadences-table'
import { TemplateForm } from '@kizunu/web/features/cadence/components/template-form'
import { TemplatesTable } from '@kizunu/web/features/cadence/components/templates-table'

export function CadencesManager({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>New template</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateForm workspaceId={workspaceId} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplatesTable workspaceId={workspaceId} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>New cadence</CardTitle>
        </CardHeader>
        <CardContent>
          <CadenceBuilder workspaceId={workspaceId} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cadences</CardTitle>
        </CardHeader>
        <CardContent>
          <CadencesTable workspaceId={workspaceId} />
        </CardContent>
      </Card>
    </div>
  )
}
