import { useTemplates } from '@kizunu/api-client/cadence/use-templates'
import { Button } from '@kizunu/web/components/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kizunu/web/components/primitives/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kizunu/web/components/primitives/table'
import { DeleteTemplateDialog } from '@kizunu/web/routes/_app/workspace/-dialogs/delete-template-dialog'
import { DotsThree } from '@phosphor-icons/react'
import { useState } from 'react'

interface TemplateRowData {
  id: string
  name: string
  providerTemplateName: string
  language: string
}

export function TemplatesTable({ workspaceId }: { workspaceId: string }) {
  const { data, isPending } = useTemplates(workspaceId)
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null)

  if (isPending) return <p className="text-muted-foreground text-sm">Loading…</p>

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Provider template</TableHead>
            <TableHead>Language</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data?.templates ?? []).map((template) => (
            <TemplateRow
              key={template.id}
              template={template}
              onRequestRemove={() => setDeleting({ id: template.id, name: template.name })}
            />
          ))}
        </TableBody>
      </Table>
      <DeleteTemplateDialog
        workspaceId={workspaceId}
        template={deleting}
        onClose={() => setDeleting(null)}
      />
    </>
  )
}

interface TemplateRowProps {
  template: TemplateRowData
  onRequestRemove: () => void
}

function TemplateRow({ template, onRequestRemove }: TemplateRowProps) {
  return (
    <TableRow>
      <TableCell>{template.name}</TableCell>
      <TableCell>{template.providerTemplateName}</TableCell>
      <TableCell>{template.language}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${template.name}`}>
                <DotsThree weight="bold" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={onRequestRemove}>
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
