import { EmptyState } from '@kizunu/web/components/composed/empty-state'
import { Skeleton } from '@kizunu/web/components/primitives/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kizunu/web/components/primitives/table'
import { cn } from '@kizunu/web/lib/utils'
import type { ReactNode } from 'react'

const PENDING_ROW_COUNT = 3

type DataTableAlign = 'left' | 'right'

export interface DataTableColumn<Row> {
  key: string
  header: string
  cell: (row: Row) => ReactNode
  align?: DataTableAlign
}

interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[]
  rows: Row[]
  isPending?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  rowKey: (row: Row) => string
  onRowClick?: (row: Row) => void
  footer?: ReactNode
}

export function DataTable<Row>(props: DataTableProps<Row>) {
  const { columns, rows, isPending, rowKey, onRowClick, footer } = props
  if (!isPending && rows.length === 0) return <DataTableEmpty {...props} />
  return (
    <div className="space-y-4">
      <Table>
        <DataTableHeader columns={columns} />
        <TableBody>
          {isPending && rows.length === 0
            ? buildSkeletonRows(columns)
            : rows.map((row) => (
                <DataTableRow
                  key={rowKey(row)}
                  columns={columns}
                  row={row}
                  onRowClick={onRowClick}
                />
              ))}
        </TableBody>
      </Table>
      {footer}
    </div>
  )
}

function DataTableEmpty<Row>({ emptyTitle, emptyDescription, emptyAction }: DataTableProps<Row>) {
  return (
    <EmptyState
      title={emptyTitle ?? 'Nothing here yet'}
      description={emptyDescription}
      action={emptyAction}
    />
  )
}

interface HeaderProps<Row> {
  columns: DataTableColumn<Row>[]
}

function DataTableHeader<Row>({ columns }: HeaderProps<Row>) {
  return (
    <TableHeader>
      <TableRow>
        {columns.map((column) => (
          <TableHead
            key={column.key}
            className={cn(
              'text-muted-foreground font-mono text-xs font-medium tracking-wide uppercase',
              column.align === 'right' && 'text-right',
            )}
          >
            {column.header}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  )
}

interface RowProps<Row> {
  columns: DataTableColumn<Row>[]
  row: Row
  onRowClick?: (row: Row) => void
}

function DataTableRow<Row>({ columns, row, onRowClick }: RowProps<Row>) {
  const isClickable = Boolean(onRowClick)
  return (
    <TableRow
      onClick={onRowClick ? () => onRowClick(row) : undefined}
      className={cn(isClickable && 'hover:bg-muted/40 cursor-pointer')}
    >
      {columns.map((column) => (
        <TableCell key={column.key} className={cn(column.align === 'right' && 'text-right')}>
          {column.cell(row)}
        </TableCell>
      ))}
    </TableRow>
  )
}

function buildSkeletonRows<Row>(columns: DataTableColumn<Row>[]) {
  return Array.from({ length: PENDING_ROW_COUNT }).map((_, index) => (
    <TableRow key={`skeleton-${index}`}>
      {columns.map((column) => (
        <TableCell key={column.key}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ))
}
