import { Button } from '@kizunu/web/components/primitives/button'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'

interface TablePaginationProps {
  page: number
  pageSize: number
  totalCount: number
  pageCount: number
  onPageChange: (page: number) => void
}

export function TablePagination(props: TablePaginationProps) {
  const { page, pageSize, totalCount, pageCount, onPageChange } = props
  if (pageCount <= 1) return null

  const firstRow = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const lastRow = Math.min(page * pageSize, totalCount)

  return (
    <div className="text-muted-foreground flex items-center justify-between text-sm">
      <span>
        {firstRow}–{lastRow} of {totalCount}
      </span>
      <div className="flex items-center gap-2">
        <span>
          Page {page} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <CaretLeft />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <CaretRight />
        </Button>
      </div>
    </div>
  )
}
