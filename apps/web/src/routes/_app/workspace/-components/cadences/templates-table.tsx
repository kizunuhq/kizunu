import { useDeleteTemplate } from '@kizunu/api-client/cadence/use-delete-template'
import { useTemplates } from '@kizunu/api-client/cadence/use-templates'
import { Button } from '@kizunu/web/components/primitives/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kizunu/web/components/primitives/table'

export function TemplatesTable({ workspaceId }: { workspaceId: string }) {
  const { data, isPending } = useTemplates(workspaceId)
  const remove = useDeleteTemplate(workspaceId)

  if (isPending) return <p className="text-muted-foreground text-sm">Loading…</p>

  return (
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
          <TableRow key={template.id}>
            <TableCell>{template.name}</TableCell>
            <TableCell>{template.providerTemplateName}</TableCell>
            <TableCell>{template.language}</TableCell>
            <TableCell className="text-right">
              <Button
                variant="outline"
                size="sm"
                disabled={remove.isPending}
                onClick={() => remove.deleteTemplate(template.id)}
              >
                Remove
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
