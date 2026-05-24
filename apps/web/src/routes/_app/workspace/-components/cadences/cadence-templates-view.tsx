import { useCadences } from '@kizunu/api-client/cadence/use-cadences'
import { useTemplates } from '@kizunu/api-client/cadence/use-templates'
import { EmptyState } from '@kizunu/web/components/composed/empty-state'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { Card } from '@kizunu/web/components/primitives/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kizunu/web/components/primitives/tabs'
import { CadenceBuilder } from '@kizunu/web/routes/_app/workspace/-components/cadences/cadence-builder'
import { CadencesTable } from '@kizunu/web/routes/_app/workspace/-components/cadences/cadences-table'
import { TemplateForm } from '@kizunu/web/routes/_app/workspace/-components/cadences/template-form'
import { TemplatesTable } from '@kizunu/web/routes/_app/workspace/-components/cadences/templates-table'

type CadencesTab = 'cadences' | 'templates'

interface CadenceTemplatesViewProps {
  workspaceId: string
  activeTab: CadencesTab
  onTabChange: (tab: CadencesTab) => void
}

export function CadenceTemplatesView({
  workspaceId,
  activeTab,
  onTabChange,
}: CadenceTemplatesViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Cadences" kicker="Operations" />
      <Tabs value={activeTab} onValueChange={(next) => onTabChange(coerceTab(next))}>
        <TabsList>
          <TabsTrigger value="cadences">Cadences</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="cadences">
          <CadencesTabPanel workspaceId={workspaceId} />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTabPanel workspaceId={workspaceId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function coerceTab(value: string | number | null): CadencesTab {
  return value === 'templates' ? 'templates' : 'cadences'
}

function CadencesTabPanel({ workspaceId }: { workspaceId: string }) {
  const { data, isPending } = useCadences(workspaceId)
  const isEmpty = !isPending && (data?.cadences.length ?? 0) === 0

  return (
    <div className="flex flex-col gap-6">
      {isEmpty ? (
        <EmptyState
          title="No cadences yet"
          description="Build your first cadence below — order steps, pick templates, set onReply actions."
        />
      ) : (
        <Card>
          <div className="p-2">
            <CadencesTable workspaceId={workspaceId} />
          </div>
        </Card>
      )}
      <Card>
        <div className="flex flex-col gap-4 p-4">
          <h2 className="text-foreground text-base font-medium">New cadence</h2>
          <CadenceBuilder workspaceId={workspaceId} />
        </div>
      </Card>
    </div>
  )
}

function TemplatesTabPanel({ workspaceId }: { workspaceId: string }) {
  const { data, isPending } = useTemplates(workspaceId)
  const isEmpty = !isPending && (data?.templates.length ?? 0) === 0

  return (
    <div className="flex flex-col gap-6">
      {isEmpty ? (
        <EmptyState
          title="No templates yet"
          description="Add a template below to reference in your cadences (HSM name + language)."
        />
      ) : (
        <Card>
          <div className="p-2">
            <TemplatesTable workspaceId={workspaceId} />
          </div>
        </Card>
      )}
      <Card>
        <div className="flex flex-col gap-4 p-4">
          <h2 className="text-foreground text-base font-medium">New template</h2>
          <TemplateForm workspaceId={workspaceId} />
        </div>
      </Card>
    </div>
  )
}
