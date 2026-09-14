// Filter/sort/paginate over the master account array. Used both to build the
// DATA_TABLE widget's first page (dashboard-builder.ts) and to serve the
// `table/query` widget-action (routes/widget-action.ts). Stateless: every
// call recomputes from the master `accounts` array plus whatever page/sort
// /filters the caller passes — there's no server-side table state to persist.

import { accounts, type Account } from './accounts.js'
import type { TableColumn, TableQueryPayload, TableRow } from '../types/dashboard.js'

export const PAGE_SIZE = 25

/** Column definitions shared by every scenario's DATA_TABLE widget. */
export const TABLE_COLUMNS: TableColumn[] = [
  { key: 'id', label: 'Account ID', align: 'left' },
  { key: 'accountName', label: 'Account Name', align: 'left' },
  { key: 'segment', label: 'Segment', filterable: true, align: 'left' },
  { key: 'riskScore', label: 'Risk Score', sortable: true, filterable: true, align: 'right' },
  { key: 'status', label: 'Status', filterable: true, align: 'left' },
  { key: 'lastReviewed', label: 'Last Reviewed', sortable: true, align: 'left' },
  { key: 'flaggedReason', label: 'Flagged Reason', align: 'left' },
]

const SORTABLE_KEYS = new Set(['riskScore', 'lastReviewed'])
/** Multiselect filters — value is a `string[]`, row matches if its value is one of them. */
const MULTISELECT_FILTER_KEYS = new Set(['segment', 'status'])
/** Range filters — value is a `[min, max]` tuple, inclusive. */
const RANGE_FILTER_KEYS = new Set(['riskScore'])

function accountToRow(account: Account): TableRow {
  return {
    id: account.id,
    accountName: account.accountName,
    segment: account.segment,
    riskScore: account.riskScore,
    status: account.status,
    lastReviewed: account.lastReviewed,
    flaggedReason: account.flaggedReason,
  }
}

function matchesMultiselect(row: Account, key: string, values: string[]): boolean {
  if (values.length === 0) return true
  const rowValue = String(row[key as keyof Account]).toLowerCase()
  return values.some((value) => String(value).toLowerCase() === rowValue)
}

/** Row matches if it falls inside ANY selected range (bucket multiselect) — an empty selection means "no filter". */
function matchesRanges(row: Account, key: string, ranges: [number, number][]): boolean {
  if (ranges.length === 0) return true
  const rowValue = row[key as keyof Account]
  if (typeof rowValue !== 'number') return true
  return ranges.some(([min, max]) => rowValue >= min && rowValue <= max)
}

function applyFilters(rows: Account[], filters: TableQueryPayload['filters']): Account[] {
  if (!filters) return rows
  const entries = Object.entries(filters)
  if (entries.length === 0) return rows

  return rows.filter((row) =>
    entries.every(([key, value]) => {
      if (MULTISELECT_FILTER_KEYS.has(key) && Array.isArray(value)) {
        return matchesMultiselect(row, key, value as string[])
      }
      if (RANGE_FILTER_KEYS.has(key) && Array.isArray(value)) {
        return matchesRanges(row, key, value as [number, number][])
      }
      return true
    }),
  )
}

function applySort(rows: Account[], sort: TableQueryPayload['sort']): Account[] {
  if (!sort || !SORTABLE_KEYS.has(sort.key)) return rows
  const { key, direction } = sort
  const sorted = [...rows].sort((a, b) => {
    const left = a[key as keyof Account]
    const right = b[key as keyof Account]
    if (typeof left === 'number' && typeof right === 'number') return left - right
    return String(left).localeCompare(String(right))
  })
  if (direction === 'desc') sorted.reverse()
  return sorted
}

export interface QueryResult {
  rows: TableRow[]
  pagination: { page: number; pageSize: number; totalCount: number }
  sort: TableQueryPayload['sort']
  filters: TableQueryPayload['filters']
}

/** Runs a page/sort/filter query over the master account array. */
export function queryAccounts(payload: TableQueryPayload): QueryResult {
  const filtered = applyFilters([...accounts], payload.filters)
  const sorted = applySort(filtered, payload.sort ?? null)

  const totalCount = sorted.length
  const lastPage = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const page = Math.min(Math.max(1, Math.trunc(payload.page) || 1), lastPage)
  const start = (page - 1) * PAGE_SIZE
  const pageRows = sorted.slice(start, start + PAGE_SIZE).map(accountToRow)

  return {
    rows: pageRows,
    pagination: { page, pageSize: PAGE_SIZE, totalCount },
    sort: payload.sort ?? null,
    filters: payload.filters ?? {},
  }
}
