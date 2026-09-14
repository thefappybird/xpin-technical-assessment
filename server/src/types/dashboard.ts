// Mirrors client/src/types/dashboard.ts exactly. That file is the single
// source of truth for the Dynamic Engine API contract — this copy must never
// silently diverge from it (see CLAUDE.md's "Contract-first parallel
// development" section). If you change a shape here, change it there too.

export type WidgetType =
  | 'METRIC_CARD'
  | 'DATA_TABLE'
  | 'ACTION_LIST'
  | 'DISTRIBUTION_CHART'

interface WidgetBase {
  id: string
  type: WidgetType
  title: string
}

export interface MetricCardWidget extends WidgetBase {
  type: 'METRIC_CARD'
  data: {
    value: string
    unit?: string
    trend?: string
    status: 'success' | 'warning' | 'error' | 'neutral'
    sparkline?: number[]
  }
}

export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  align?: 'left' | 'right' | 'center'
}

export type TableRow = Record<string, string | number | boolean | null> & { id: string }

export interface TableSort {
  key: string
  direction: 'asc' | 'desc'
}

export interface DataTableWidget extends WidgetBase {
  type: 'DATA_TABLE'
  data: {
    columns: TableColumn[]
    /** Current page only — never the full dataset. */
    rows: TableRow[]
    /** pageSize is fixed at 25; totalCount is bounded to 100 for this mock. */
    pagination: {
      page: number
      pageSize: number
      totalCount: number
    }
    sort?: TableSort | null
    filters?: Record<string, string[] | [number, number][]>
  }
}

export interface ActionListItem {
  id: string
  label: string
  done: boolean
}

export interface ActionListWidget extends WidgetBase {
  type: 'ACTION_LIST'
  data: {
    items: ActionListItem[]
  }
}

export interface DistributionBucket {
  label: string
  value: number
}

export interface DistributionChartWidget extends WidgetBase {
  type: 'DISTRIBUTION_CHART'
  data: {
    buckets: DistributionBucket[]
    unit?: string
  }
}

export type Widget =
  | MetricCardWidget
  | DataTableWidget
  | ActionListWidget
  | DistributionChartWidget

export type Theme = 'light' | 'dark' | 'high-contrast'
export type Layout = 'grid-2-col' | 'grid-3-col' | 'grid-4-col' | 'auto'

export interface DashboardResponse {
  layout: Layout
  theme: Theme
  /** Array order is display order — it drives both the grid auto-flow and drag-and-drop reordering. There is no separate position/span field. */
  widgets: Widget[]
}

export interface GenerateDashboardRequest {
  prompt: string
}

/**
 * `action` is a free-form, widget-defined string (e.g. `'table/query'`,
 * `'checklist/toggle-item'`) rather than a closed union — each widget type
 * owns its own action vocabulary. `TableQueryPayload` and
 * `ChecklistToggleItemPayload` below are the concrete payload shapes defined
 * so far; more get added per widget as they're built, without changing this
 * envelope.
 */
export interface WidgetActionRequest {
  widgetId: string
  action: string
  payload?: unknown
}

/** Full widget replace — the client swaps its optimistic guess for this. */
export interface WidgetActionResponse {
  widget: Widget
}

/**
 * Payload for the `'table/query'` action — page, sort, and filters travel
 * together as one query state. Filter values are either a multiselect
 * (`string[]` — row matches if its value is one of these; segment/status) or
 * a multiselect of inclusive numeric ranges (`[number, number][]` — row
 * matches if it falls in ANY selected bucket; risk score, e.g. `[[0, 25],
 * [75, 100]]` for "0–25 or 75–100").
 */
export interface TableQueryPayload {
  page: number
  sort?: TableSort | null
  filters?: Record<string, string[] | [number, number][]>
}

/** Payload for the `'checklist/toggle-item'` action on ACTION_LIST widgets. */
export interface ChecklistToggleItemPayload {
  itemId: string
}

/**
 * Drag-and-drop widget reordering is NOT a `widget-action` — it doesn't scope
 * to one widget the way `WidgetActionRequest` does, and this demo has no
 * persisted per-user dashboard to save a layout back to (each prompt
 * generates a fresh one). Reordering is purely client-side: a Zustand store
 * holds the current widget order (seeded from `DashboardResponse.widgets`),
 * updated directly on drag-end. No API call, no server round-trip.
 */

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
  }
}
