import { arrayMove } from '@dnd-kit/sortable'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { DashboardResponse, Layout, Widget, WidgetType } from '@/types/dashboard'

/**
 * The three drag-and-drop tiers: metric cards, the "secondary" panels
 * (everything that isn't a metric or the table — currently ACTION_LIST and
 * DISTRIBUTION_CHART), and the table. Membership is derived purely from
 * `Widget['type']`, same idea as `dashboard-grid.tsx`'s old span logic, just
 * at group granularity.
 */
export type GroupKind = 'metrics' | 'secondary' | 'table'

export function groupOfWidgetType(type: WidgetType): GroupKind {
  if (type === 'METRIC_CARD') return 'metrics'
  if (type === 'DATA_TABLE') return 'table'
  return 'secondary'
}

/** First-occurrence order of each group present in `widgets` — groups with zero widgets are omitted. */
function deriveGroupOrder(widgets: Widget[]): GroupKind[] {
  const order: GroupKind[] = []
  for (const widget of widgets) {
    const group = groupOfWidgetType(widget.type)
    if (!order.includes(group)) order.push(group)
  }
  return order
}

export interface HistoryEntry {
  id: string
  /** Human label for a seeded preset investigation — absent for freeform prompt submissions. */
  title?: string
  prompt: string
  /** `null` for a seeded preset that hasn't been run yet — see `seedPresets`/`fillHistoryEntry`. */
  submittedAt: number | null
  response: DashboardResponse | null
  /**
   * Snapshot of THIS investigation's own tier order, kept in sync with
   * `reorderGroups`/`reorderWithinGroup`/`updateWidget` (see
   * `syncActiveHistory` below) — without it, switching to a different
   * investigation and back would silently discard any reordering, filtering,
   * or checklist toggles made on this one, since `selectHistory` would fall
   * back to re-deriving a fresh default order from `response.widgets`.
   * Undefined only for a not-yet-run preset (`response` is also null then).
   */
  groupOrder?: GroupKind[]
}

const MAX_HISTORY = 20
/** How long the reveal of one more widget is held back — see `revealNextWidget`. */
export const STREAM_REVEAL_MS = 220

/** Shared fields set whenever a full dashboard (fresh or replayed) becomes the current one. */
function dashboardFields(dashboard: DashboardResponse) {
  return {
    widgets: dashboard.widgets,
    layout: dashboard.layout,
    groupOrder: deriveGroupOrder(dashboard.widgets),
  }
}

/**
 * Whenever the CURRENT dashboard's widgets or group order change (reorder,
 * table filter/sort/page results, checklist toggles), mirror that change
 * into the active history entry too — so switching to a different
 * investigation and back doesn't revert to the investigation's original,
 * unedited state. A no-op if nothing is active yet (still streaming in from
 * a fresh generate, before it's been pushed to history).
 */
function syncActiveHistory(
  history: HistoryEntry[],
  activeHistoryId: string | null,
  patch: { widgets?: Widget[]; groupOrder?: GroupKind[] }
): HistoryEntry[] {
  if (!activeHistoryId) return history
  return history.map((entry) => {
    if (entry.id !== activeHistoryId || !entry.response) return entry
    return {
      ...entry,
      groupOrder: patch.groupOrder ?? entry.groupOrder,
      response: patch.widgets ? { ...entry.response, widgets: patch.widgets } : entry.response,
    }
  })
}

/**
 * Client-authoritative widget order + per-widget content for the current
 * dashboard, plus a session-local history of past investigations. This store
 * deliberately holds ONLY client-side-only concerns — drag-and-drop order,
 * optimistic/replaced widget content, history, and the simulated streaming
 * reveal all have no server round-trip of their own (see CLAUDE.md's
 * "Finalized contract" section). Persisted to `localStorage` (via the
 * `persist` middleware below) so a page refresh restores exactly where the
 * user left off — still purely client-side, no backend involved, same spirit
 * as CLAUDE.md's "no persisted per-user dashboard to save a layout back to"
 * decision, just surviving a reload instead of only a re-render.
 *
 * Fetch status (loading/error/data) for `generate-dashboard` and
 * `widget-action` stays owned by TanStack Query's own mutation/query state —
 * it is NOT duplicated or persisted here.
 */
interface DashboardState {
  widgets: Widget[]
  layout: Layout
  groupOrder: GroupKind[]
  history: HistoryEntry[]
  activeHistoryId: string | null
  /** How many widgets (in visual order) have "arrived" in the simulated stream — see `revealNextWidget`. */
  revealedCount: number
  /** True while a freshly-generated dashboard is still revealing widgets one by one. */
  isStreaming: boolean
  /** True once `persist` has finished reading (or confirming the absence of) saved state — see `App.tsx`'s mount effect. */
  hasHydrated: boolean
  setHasHydrated: (hydrated: boolean) => void
  /** Seeds the store from a fresh `POST /api/generate-dashboard` response — starts the streamed reveal. */
  setDashboard: (dashboard: DashboardResponse) => void
  /** Reveals the next widget in the simulated stream; a no-op once every widget has arrived. */
  revealNextWidget: () => void
  /** Bulk-reorders the three drag-and-drop tiers relative to each other. */
  reorderGroups: (fromIndex: number, toIndex: number) => void
  /** Reorders widgets within one tier only — other tiers' items are untouched. */
  reorderWithinGroup: (group: GroupKind, fromIndex: number, toIndex: number) => void
  /** Full-replace of one widget — used by optimistic patches and rollbacks alike. */
  updateWidget: (widgetId: string, updatedWidget: Widget) => void
  /** "New investigation" — client-side only, no backend call (see CLAUDE.md). History survives this. */
  reset: () => void
  /** Records a successful generate-dashboard call as a restorable history entry. */
  pushHistory: (prompt: string, response: DashboardResponse) => void
  /** Seeds a set of named sample investigations into history — no-ops if history already has entries. */
  seedPresets: (presets: { id: string; title: string; prompt: string }[]) => void
  /** Fills in a previously-seeded (unfetched) preset entry once its dashboard has been generated. */
  fillHistoryEntry: (id: string, response: DashboardResponse) => void
  /** Replays a cached history entry back through the dashboard — no network call, no streamed reveal. */
  selectHistory: (id: string) => void
}

const emptyDashboard = {
  widgets: [] as Widget[],
  layout: 'auto' as Layout,
  groupOrder: [] as GroupKind[],
  revealedCount: 0,
  isStreaming: false,
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      ...emptyDashboard,
      history: [],
      activeHistoryId: null,
      hasHydrated: false,
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      setDashboard: (dashboard) =>
        set({
          ...dashboardFields(dashboard),
          revealedCount: 0,
          isStreaming: dashboard.widgets.length > 0,
        }),

      revealNextWidget: () =>
        set((state) => {
          const next = Math.min(state.revealedCount + 1, state.widgets.length)
          return { revealedCount: next, isStreaming: next < state.widgets.length }
        }),

      reorderGroups: (fromIndex, toIndex) =>
        set((state) => {
          const groupOrder = arrayMove(state.groupOrder, fromIndex, toIndex)
          return { groupOrder, history: syncActiveHistory(state.history, state.activeHistoryId, { groupOrder }) }
        }),

      reorderWithinGroup: (group, fromIndex, toIndex) =>
        set((state) => {
          const slots: number[] = []
          const groupWidgets: Widget[] = []
          state.widgets.forEach((widget, index) => {
            if (groupOfWidgetType(widget.type) === group) {
              slots.push(index)
              groupWidgets.push(widget)
            }
          })
          const reordered = arrayMove(groupWidgets, fromIndex, toIndex)
          const widgets = [...state.widgets]
          slots.forEach((slot, i) => {
            widgets[slot] = reordered[i]!
          })
          return { widgets, history: syncActiveHistory(state.history, state.activeHistoryId, { widgets }) }
        }),

      updateWidget: (widgetId, updatedWidget) =>
        set((state) => {
          const widgets = state.widgets.map((widget) => (widget.id === widgetId ? updatedWidget : widget))
          return { widgets, history: syncActiveHistory(state.history, state.activeHistoryId, { widgets }) }
        }),

      reset: () => set({ ...emptyDashboard, activeHistoryId: null }),

      pushHistory: (prompt, response) =>
        set((state) => {
          const entry: HistoryEntry = {
            id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            prompt,
            submittedAt: Date.now(),
            response,
            groupOrder: deriveGroupOrder(response.widgets),
          }
          return {
            history: [entry, ...state.history].slice(0, MAX_HISTORY),
            activeHistoryId: entry.id,
          }
        }),

      seedPresets: (presets) =>
        set((state) => {
          if (state.history.length > 0) return {}
          return {
            history: presets.map((preset) => ({
              id: preset.id,
              title: preset.title,
              prompt: preset.prompt,
              submittedAt: null,
              response: null,
            })),
          }
        }),

      fillHistoryEntry: (id, response) =>
        set((state) => ({
          ...dashboardFields(response),
          revealedCount: 0,
          isStreaming: response.widgets.length > 0,
          history: state.history.map((entry) =>
            entry.id === id
              ? { ...entry, response, submittedAt: Date.now(), groupOrder: deriveGroupOrder(response.widgets) }
              : entry
          ),
          activeHistoryId: id,
        })),

      selectHistory: (id) => {
        const entry = get().history.find((candidate) => candidate.id === id)
        if (!entry || !entry.response) return
        set({
          widgets: entry.response.widgets,
          layout: entry.response.layout,
          // The entry's own saved arrangement, not a freshly re-derived
          // default — this is what makes reordering survive switching away
          // and back (see `syncActiveHistory`).
          groupOrder: entry.groupOrder ?? deriveGroupOrder(entry.response.widgets),
          // Instant, no-network replay — shown fully revealed, no stream.
          revealedCount: entry.response.widgets.length,
          isStreaming: false,
          activeHistoryId: id,
        })
      },
    }),
    {
      name: 'dynamic-engine-dashboard',
      storage: createJSONStorage(() => localStorage),
      // Fetch/UI-transient fields (revealedCount, isStreaming, hasHydrated)
      // are deliberately excluded — a restored dashboard should appear fully
      // resolved, not replay its original streaming-reveal animation or
      // carry a stale hydration flag.
      partialize: (state) => ({
        widgets: state.widgets,
        layout: state.layout,
        groupOrder: state.groupOrder,
        history: state.history,
        activeHistoryId: state.activeHistoryId,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // A restored dashboard (if any) should render fully revealed, never
        // replay the stream — and mark hydration done either way so
        // `App.tsx` knows it's safe to decide whether to auto-load a preset.
        state.revealedCount = state.widgets.length
        state.isStreaming = false
        state.hasHydrated = true
      },
    }
  )
)

// Narrow selectors — prefer these over selecting the whole store so a
// component only re-renders when the slice it actually reads changes
// (see .claude/skills/vercel-react-best-practices `rerender-derived-state`).
export const useDashboardWidgets = () => useDashboardStore((s) => s.widgets)
export const useDashboardLayout = () => useDashboardStore((s) => s.layout)
export const useDashboardGroupOrder = () => useDashboardStore((s) => s.groupOrder)
export const useDashboardHistory = () => useDashboardStore((s) => s.history)
export const useActiveHistoryId = () => useDashboardStore((s) => s.activeHistoryId)
export const useRevealedCount = () => useDashboardStore((s) => s.revealedCount)
export const useIsStreaming = () => useDashboardStore((s) => s.isStreaming)
export const useHasHydrated = () => useDashboardStore((s) => s.hasHydrated)
