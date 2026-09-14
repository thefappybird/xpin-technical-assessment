import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon, ChevronDownIcon } from 'lucide-react'

import { StatusPill } from '@/components/dashboard/status-pill'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useWidgetAction } from '@/hooks/use-widget-action'
import { cn } from '@/lib/utils'
import type { WidgetComponentProps } from '@/lib/widget-registry'
import { useDashboardStore } from '@/stores/dashboard-store'
import type { DataTableWidget as DataTableWidgetType, TableQueryPayload, TableSort } from '@/types/dashboard'

const SEGMENT_OPTIONS = ['Retail', 'Commercial', 'Institutional']
const STATUS_OPTIONS = ['success', 'warning', 'error']
const RISK_BUCKETS: { label: string; range: [number, number] }[] = [
  { label: '0–25', range: [0, 25] },
  { label: '25–50', range: [25, 50] },
  { label: '50–75', range: [50, 75] },
  { label: '75–100', range: [75, 100] },
]

/**
 * Fixed per-column widths (used with `table-fixed`) so the table's layout
 * never depends on which rows happen to be mounted. Without this, the
 * browser's default "auto" table layout recomputes column widths from
 * whatever content is CURRENTLY in the DOM — and since rows are virtualized,
 * that set changes every time you scroll or sort, producing a horizontal
 * jitter (and, when sorting reveals shorter/empty cells like an empty
 * Flagged Reason, visibly shifting every other column). `flaggedReason` gets
 * an explicit width too, not "leave it to absorb the remainder" — on a
 * narrower container that remainder can shrink to almost nothing; an
 * explicit width instead lets the table overflow into its own horizontal
 * scrollbar (this widget's `scrollRef` already handles that), which is a far
 * better outcome than a near-invisible last column.
 */
const COLUMN_WIDTHS: Partial<Record<string, string>> = {
  id: '100px',
  accountName: '170px',
  segment: '120px',
  riskScore: '90px',
  status: '104px',
  lastReviewed: '112px',
  flaggedReason: '240px',
}

/** Minimum time the loading skeleton stays visible once shown — a query that resolves faster than this still holds the skeleton, so it reads as a deliberate load instead of a jarring flash. */
const MIN_LOADING_MS = 250

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : []
}

/** Reverse-maps a `riskScore` filter's ranges back to the bucket labels that produced them, for lazy state init. */
function asRiskBucketLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const ranges = value as [number, number][]
  return RISK_BUCKETS.filter((bucket) =>
    ranges.some(([min, max]) => min === bucket.range[0] && max === bucket.range[1])
  ).map((bucket) => bucket.label)
}

/** Stable key for a (page, sort, filters) query combo — used to cache already-seen results client-side. */
function cacheKeyFor(payload: Pick<TableQueryPayload, 'page' | 'sort' | 'filters'>): string {
  return JSON.stringify({ page: payload.page, sort: payload.sort ?? null, filters: payload.filters ?? {} })
}

/** IBM Plex Mono for anything that reads as a measurement/id/timestamp — DESIGN.md's "Numbers-Get-A-Voice" rule. */
function isMonoCell(key: string, value: unknown): boolean {
  if (typeof value === 'number') return true
  if (key.toLowerCase() === 'id') return true
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  return String(value)
}

function nextSort(current: TableSort | null | undefined, key: string): TableSort | null {
  if (!current || current.key !== key) return { key, direction: 'asc' }
  if (current.direction === 'asc') return { key, direction: 'desc' }
  return null
}

const ROW_HEIGHT = 40
const MAX_BODY_HEIGHT = 420

/**
 * `DATA_TABLE` — the densest single widget for evaluation coverage: real
 * `<table>` on desktop, card-per-row on mobile (same columns/rows props
 * drive both, per CLAUDE.md's `DATA_TABLE` responsive rule), sort/filter
 * dispatched through the one `table/query` widget-action (non-optimistic —
 * loading state only, per the contract's own note that results aren't
 * predictable client-side), and row virtualization via
 * `@tanstack/react-virtual` using the "spacer <tr>" pattern so the table
 * keeps real semantics instead of absolutely-positioned rows.
 */
function DataTableWidgetImpl({ widget }: WidgetComponentProps) {
  const table = widget as DataTableWidgetType
  const { columns, rows, pagination, sort, filters } = table.data

  const tableQuery = useWidgetAction()
  const updateWidget = useDashboardStore((s) => s.updateWidget)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Lazy-init from the widget's current filters — same pattern the old
  // per-column draft state used, just for the new filter shapes.
  const [riskSelected, setRiskSelected] = useState<string[]>(() => asRiskBucketLabels(filters?.riskScore))
  const [segmentSelected, setSegmentSelected] = useState<string[]>(() => asStringArray(filters?.segment))
  const [statusSelected, setStatusSelected] = useState<string[]>(() => asStringArray(filters?.status))

  // Client-side cache of already-seen (page, sort, filters) query results —
  // switching back to a combo already fetched this session resolves
  // instantly from here instead of re-showing the loading skeleton. Scoped
  // to this component instance (a ref, not the store): this widget's own
  // lifetime is exactly the window in which "already seen" should apply.
  const queryCacheRef = useRef<Map<string, DataTableWidgetType>>(new Map())
  useEffect(() => {
    queryCacheRef.current.set(cacheKeyFor({ page: pagination.page, sort, filters }), table)
  }, [table, pagination.page, sort, filters])

  // Enforces `MIN_LOADING_MS` as a floor on the visible loading state for a
  // real network round trip — this mock API is fast enough that the skeleton
  // otherwise flashes in and out almost instantly, which reads as a glitch
  // rather than a load. Cache hits (above) deliberately skip this entirely;
  // they're supposed to feel instant, not slowed down to match.
  const [forcedLoading, setForcedLoading] = useState(false)

  const runQuery = useCallback(
    (overrides: Partial<TableQueryPayload>) => {
      const payload: TableQueryPayload = {
        page: pagination.page,
        sort,
        filters,
        ...overrides,
      }
      const cached = queryCacheRef.current.get(cacheKeyFor(payload))
      if (cached) {
        updateWidget(table.id, cached)
        return
      }
      const startedAt = Date.now()
      setForcedLoading(true)
      const clearForcedLoading = () => {
        const remaining = MIN_LOADING_MS - (Date.now() - startedAt)
        if (remaining > 0) setTimeout(() => setForcedLoading(false), remaining)
        else setForcedLoading(false)
      }
      tableQuery.mutate(
        { widgetId: table.id, action: 'table/query', payload },
        {
          onSuccess: (data) => {
            queryCacheRef.current.set(cacheKeyFor(payload), data.widget as DataTableWidgetType)
            clearForcedLoading()
          },
          onError: clearForcedLoading,
        }
      )
    },
    [pagination.page, sort, filters, table.id, tableQuery, updateWidget]
  )

  const handleSort = useCallback(
    (key: string) => {
      runQuery({ page: 1, sort: nextSort(sort, key) })
    },
    [runQuery, sort]
  )

  const runFilterQuery = useCallback(
    (next: { risk: string[]; segment: string[]; status: string[] }) => {
      const nextFilters: NonNullable<TableQueryPayload['filters']> = {}
      const riskRanges = RISK_BUCKETS.filter((bucket) => next.risk.includes(bucket.label)).map((b) => b.range)
      if (riskRanges.length > 0) nextFilters.riskScore = riskRanges
      if (next.segment.length > 0) nextFilters.segment = next.segment
      if (next.status.length > 0) nextFilters.status = next.status
      runQuery({ page: 1, filters: nextFilters })
    },
    [runQuery]
  )

  const toggleRisk = useCallback(
    (label: string) => {
      const next = riskSelected.includes(label) ? riskSelected.filter((v) => v !== label) : [...riskSelected, label]
      setRiskSelected(next)
      runFilterQuery({ risk: next, segment: segmentSelected, status: statusSelected })
    },
    [riskSelected, segmentSelected, statusSelected, runFilterQuery]
  )

  const toggleSegment = useCallback(
    (value: string) => {
      const next = segmentSelected.includes(value)
        ? segmentSelected.filter((v) => v !== value)
        : [...segmentSelected, value]
      setSegmentSelected(next)
      runFilterQuery({ risk: riskSelected, segment: next, status: statusSelected })
    },
    [segmentSelected, riskSelected, statusSelected, runFilterQuery]
  )

  const toggleStatus = useCallback(
    (value: string) => {
      const next = statusSelected.includes(value)
        ? statusSelected.filter((v) => v !== value)
        : [...statusSelected, value]
      setStatusSelected(next)
      runFilterQuery({ risk: riskSelected, segment: segmentSelected, status: next })
    },
    [statusSelected, riskSelected, segmentSelected, runFilterQuery]
  )

  const totalPages = Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize))

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
    getItemKey: (index) => rows[index]?.id ?? index,
  })
  const virtualItems = virtualizer.getVirtualItems()
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0
  const paddingBottom =
    virtualItems.length > 0 ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0

  const isLoading = tableQuery.isPending || forcedLoading

  return (
    <Card className="col-span-full h-full">
      {/* No drag handle here — the table is always the sole member of its
          group (see `groupOfWidgetType`), so per-widget dragging would do
          nothing; the group band's own grab rail already moves it in bulk. */}
      <CardHeader>
        <CardTitle>{table.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Inline filter bar — risk score buckets + segment/status multiselects, just below the header. */}
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted p-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 text-xs" disabled={isLoading}>
                Risk score
                {riskSelected.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                    {riskSelected.length}
                  </Badge>
                )}
                <ChevronDownIcon className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {RISK_BUCKETS.map((bucket) => (
                <DropdownMenuCheckboxItem
                  key={bucket.label}
                  checked={riskSelected.includes(bucket.label)}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={() => toggleRisk(bucket.label)}
                >
                  <span className="font-mono">{bucket.label}</span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 text-xs" disabled={isLoading}>
                Segment
                {segmentSelected.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                    {segmentSelected.length}
                  </Badge>
                )}
                <ChevronDownIcon className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {SEGMENT_OPTIONS.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option}
                  checked={segmentSelected.includes(option)}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={() => toggleSegment(option)}
                >
                  {option}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 text-xs" disabled={isLoading}>
                Status
                {statusSelected.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                    {statusSelected.length}
                  </Badge>
                )}
                <ChevronDownIcon className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {STATUS_OPTIONS.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option}
                  checked={statusSelected.includes(option)}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={() => toggleStatus(option)}
                >
                  {capitalize(option)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop: real <table>, virtualized body. */}
        <div className="hidden rounded-md border md:block">
          {/* overscroll-contain: without it, once this box hits its own
              scroll boundary, leftover wheel/trackpad input "chains" up to
              the page's own scroll container — a tiny extra vertical shift
              right at the bottom that reads as a jitter even though nothing
              in the table itself moved. */}
          <div
            ref={scrollRef}
            className="overflow-auto overscroll-contain"
            style={{ maxHeight: MAX_BODY_HEIGHT }}
          >
            <Table
              className="table-fixed"
              // This widget's own `scrollRef` div above is already the sole
              // scrolling ancestor (both axes) — the shared `Table`
              // component's default `overflow-x-auto` wrapper would
              // otherwise nest a SECOND scroll container inside it, which
              // breaks the header's `sticky` positioning (sticky computes
              // against the *nearest* scrolling ancestor, and that inner
              // wrapper doesn't scroll vertically at all).
              containerClassName="overflow-visible"
            >
              <colgroup>
                {columns.map((column) => (
                  <col key={column.key} style={COLUMN_WIDTHS[column.key] ? { width: COLUMN_WIDTHS[column.key] } : undefined} />
                ))}
              </colgroup>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow className="hover:bg-transparent">
                  {columns.map((column) => (
                    <TableHead
                      key={column.key}
                      aria-sort={
                        sort?.key === column.key
                          ? sort.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                      className={cn(
                        'text-[11px] font-bold tracking-wide text-muted-foreground uppercase',
                        column.align === 'right' && 'text-right',
                        column.align === 'center' && 'text-center'
                      )}
                    >
                      {column.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(column.key)}
                          className="inline-flex items-center gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {column.label}
                          {sort?.key === column.key ? (
                            sort.direction === 'asc' ? (
                              <ArrowUpIcon className="size-3" />
                            ) : (
                              <ArrowDownIcon className="size-3" />
                            )
                          ) : (
                            <ArrowUpDownIcon className="size-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        column.label
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Matches the row count AND row height already on screen
                  // (this query is non-optimistic, so `rows` still holds the
                  // previous page/filter's results throughout the loading
                  // window) — otherwise a shorter, uncapped skeleton height
                  // shrinks the table for the loading window and then grows
                  // it back once real data lands, which reads as a glitch.
                  Array.from({ length: Math.max(rows.length, 1) }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`} style={{ height: ROW_HEIGHT }}>
                      {columns.map((column) => (
                        <TableCell key={column.key}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                      No matching rows.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {paddingTop > 0 && (
                      <tr aria-hidden="true">
                        <td colSpan={columns.length} style={{ height: paddingTop }} />
                      </tr>
                    )}
                    {virtualItems.map((virtualRow) => {
                      const row = rows[virtualRow.index]
                      if (!row) return null
                      return (
                        <TableRow key={row.id} style={{ height: ROW_HEIGHT }}>
                          {columns.map((column) => {
                            const value = row[column.key]
                            return (
                              <TableCell
                                key={column.key}
                                // Every column truncates now (fixed widths —
                                // see `ui/table.tsx`), so the full value goes
                                // in `title` for a hover tooltip whenever it
                                // doesn't fit. Wrapping instead of truncating
                                // isn't an option here: it would vary row
                                // height per row, which the virtualizer's
                                // fixed `ROW_HEIGHT` can't account for.
                                title={column.key !== 'status' ? formatCellValue(value) : undefined}
                                className={cn(
                                  column.align === 'right' && 'text-right',
                                  column.align === 'center' && 'text-center',
                                  isMonoCell(column.key, value) && 'font-mono'
                                )}
                              >
                                {column.key === 'status' ? (
                                  <StatusPill status={value} label={formatCellValue(value)} />
                                ) : (
                                  formatCellValue(value)
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      )
                    })}
                    {paddingBottom > 0 && (
                      <tr aria-hidden="true">
                        <td colSpan={columns.length} style={{ height: paddingBottom }} />
                      </tr>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Mobile/tablet: card-per-row — same columns/rows, no horizontal scroll (DESIGN.md's No-Sideways-Scroll Rule). */}
        <div className="flex flex-col gap-2 md:hidden">
          {isLoading ? (
            // Same reasoning as the desktop skeleton above: match the row
            // count already on screen so this doesn't shrink then grow.
            Array.from({ length: Math.max(rows.length, 1) }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-md" />
            ))
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No matching rows.</p>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="rounded-md border p-3">
                {columns.map((column) => {
                  const value = row[column.key]
                  return (
                    <div key={column.key} className="flex items-center justify-between gap-2 py-1 text-sm">
                      <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                        {column.label}
                      </span>
                      {column.key === 'status' ? (
                        <StatusPill status={value} label={formatCellValue(value)} />
                      ) : (
                        <span className={cn(isMonoCell(column.key, value) && 'font-mono')}>
                          {formatCellValue(value)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-xs text-muted-foreground">
            Page {pagination.page} of {totalPages} · {pagination.totalCount} total
          </p>
          <div className="flex items-center gap-1" role="navigation" aria-label="Table pagination">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => runQuery({ page: pagination.page - 1 })}
            >
              Prev
            </Button>
            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNumber = i + 1
              return (
                <Button
                  key={pageNumber}
                  type="button"
                  variant={pageNumber === pagination.page ? 'default' : 'outline'}
                  size="sm"
                  aria-current={pageNumber === pagination.page ? 'page' : undefined}
                  disabled={isLoading}
                  onClick={() => runQuery({ page: pageNumber })}
                >
                  {pageNumber}
                </Button>
              )
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page >= totalPages || isLoading}
              onClick={() => runQuery({ page: pagination.page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Memoized: the registry renders N widgets from a schema array, so a change
// to one widget shouldn't re-render its siblings.
export default memo(DataTableWidgetImpl)
