import { useCadences } from '@kizunu/api-client/cadence/use-cadences'
import { useTemplates } from '@kizunu/api-client/cadence/use-templates'
import { EmptyState } from '@kizunu/web/components/composed/empty-state'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { Button } from '@kizunu/web/components/primitives/button'
import { Card } from '@kizunu/web/components/primitives/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kizunu/web/components/primitives/tabs'
import { CadencesTable } from '@kizunu/web/routes/_app/workspace/-components/cadences/cadences-table'
import { TemplatesTable } from '@kizunu/web/routes/_app/workspace/-components/cadences/templates-table'
import { CreateCadenceDialog } from '@kizunu/web/routes/_app/workspace/-dialogs/create-cadence-dialog'
import { CreateTemplateDialog } from '@kizunu/web/routes/_app/workspace/-dialogs/create-template-dialog'
import { Plus } from '@phosphor-icons/react'
import { useState } from 'react'

type CadencesTab = 'cadences' | 'templates'

interface CadenceTemplatesViewProps {
  workspaceId: string
  activeTab: CadencesTab
  onTabChange: (tab: CadencesTab) => void
}

export function CadenceTemplatesView(props: CadenceTemplatesViewProps) {
  const { workspaceId, activeTab, onTabChange } = props

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
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus weight="bold" />
          New cadence
        </Button>
      </div>
      {isEmpty ? (
        <EmptyState
          title="No cadences yet"
          description="Create your first cadence — order steps, pick templates, set onReply actions."
          action={<Button onClick={() => setCreateOpen(true)}>New cadence</Button>}
        />
      ) : (
        <Card>
          <div className="p-2">
            <CadencesTable workspaceId={workspaceId} />
          </div>
        </Card>
      )}
      <CreateCadenceDialog
        workspaceId={workspaceId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  )
}

function TemplatesTabPanel({ workspaceId }: { workspaceId: string }) {
  const { data, isPending } = useTemplates(workspaceId)
  const isEmpty = !isPending && (data?.templates.length ?? 0) === 0
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus weight="bold" />
          New template
        </Button>
      </div>
      {isEmpty ? (
        <EmptyState
          title="No templates yet"
          description="Add a template to reference in your cadences (HSM name + language)."
          action={<Button onClick={() => setCreateOpen(true)}>New template</Button>}
        />
      ) : (
        <Card>
          <div className="p-2">
            <TemplatesTable workspaceId={workspaceId} />
          </div>
        </Card>
      )}
      <CreateTemplateDialog
        workspaceId={workspaceId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  )
}
