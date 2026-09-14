import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { GroupBand } from '@/components/dashboard/group-band'
import {
  groupOfWidgetType,
  STREAM_REVEAL_MS,
  useActiveHistoryId,
  useDashboardGroupOrder,
  useDashboardStore,
  useDashboardWidgets,
  useIsStreaming,
  useRevealedCount,
  type GroupKind,
} from '@/stores/dashboard-store'

/** How long the auto-scroll-to-follow animation below takes — deliberately slower than the browser's native "smooth" scroll, which has no duration knob of its own. */
const REVEAL_SCROLL_DURATION_MS = 700

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

/**
 * Scrolls `container` just enough to bring `target` fully into view — same
 * "nearest" semantics as `Element.scrollIntoView({block: 'nearest'})`, which
 * this replaces specifically so the duration can be controlled (the native
 * smooth-scroll behavior has no duration option, and read as too abrupt for
 * a widget quietly streaming in).
 *
 * `rafIdRef` lets the caller cancel an in-flight animation before starting a
 * new one — reveal steps (every `STREAM_REVEAL_MS`) fire faster than one
 * animation takes (`REVEAL_SCROLL_DURATION_MS`), so without this, successive
 * calls stack overlapping rAF loops that fight over `container.scrollTop`.
 */
function scrollIntoViewSlowly(
  target: HTMLElement,
  container: HTMLElement,
  duration: number,
  rafIdRef: { current: number | null }
) {
  if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)

  const containerRect = container.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()

  let delta = 0
  if (targetRect.top < containerRect.top) delta = targetRect.top - containerRect.top
  else if (targetRect.bottom > containerRect.bottom) delta = targetRect.bottom - containerRect.bottom
  if (delta === 0) {
    rafIdRef.current = null
    return
  }

  const startTop = container.scrollTop
  const targetTop = startTop + delta
  const startTime = performance.now()

  function step(now: number) {
    const elapsed = Math.min((now - startTime) / duration, 1)
    container.scrollTop = startTop + (targetTop - startTop) * easeInOutQuad(elapsed)
    rafIdRef.current = elapsed < 1 ? requestAnimationFrame(step) : null
  }
  rafIdRef.current = requestAnimationFrame(step)
}

/**
 * Snaps the page back to the top the instant a *different* investigation
 * becomes active — whether that's a fresh generate about to stream in, or an
 * already-cached one `selectHistory` replays instantly. Without this, opening
 * an investigation while scrolled down from the last one left you looking at
 * the middle of it. `useLayoutEffect` (not `useEffect`) so the jump happens
 * before paint — no visible flash of the wrong scroll position first.
 */
function useScrollToTopOnInvestigationChange() {
  const activeHistoryId = useActiveHistoryId()
  const previousActiveHistoryIdRef = useRef(activeHistoryId)

  useLayoutEffect(() => {
    if (activeHistoryId === previousActiveHistoryIdRef.current) return
    previousActiveHistoryIdRef.current = activeHistoryId
    document.querySelector('main')?.scrollTo({ top: 0 })
  }, [activeHistoryId])
}

/**
 * Drives the simulated "streaming" reveal: while `isStreaming`, reveals one
 * more widget every `STREAM_REVEAL_MS` until the whole dashboard has
 * "arrived". Re-schedules itself off `revealedCount` (not just `isStreaming`,
 * which only flips once at the very end) so each reveal step queues the next.
 * Also auto-scrolls the page to follow each newly-arrived widget WHILE it's
 * actively streaming in — never for an already-cached investigation, and
 * never again once the stream finishes (see `useScrollToTopOnInvestigationChange`
 * for the "always start at the top" half of this).
 */
function useStreamingReveal(revealOrderIds: string[]) {
  const isStreaming = useIsStreaming()
  const revealedCount = useRevealedCount()
  const activeHistoryId = useActiveHistoryId()
  const revealNextWidget = useDashboardStore((s) => s.revealNextWidget)
  const previousRevealedCountRef = useRef(revealedCount)
  const previousIsStreamingRef = useRef(isStreaming)
  const previousActiveHistoryIdRef = useRef(activeHistoryId)
  const scrollRafIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isStreaming) return
    const timer = setTimeout(() => revealNextWidget(), STREAM_REVEAL_MS)
    return () => clearTimeout(timer)
  }, [isStreaming, revealedCount, revealNextWidget])

  useEffect(() => {
    const previousRevealedCount = previousRevealedCountRef.current
    const wasStreaming = previousIsStreamingRef.current
    const previousActiveHistoryId = previousActiveHistoryIdRef.current
    previousRevealedCountRef.current = revealedCount
    previousIsStreamingRef.current = isStreaming
    previousActiveHistoryIdRef.current = activeHistoryId
    // Three independent conditions, all required:
    //   1. A genuine one-at-a-time step (not a jump/reset).
    //   2. Streaming is (or, for the very last step, just was) actually in
    //      progress — `isStreaming` flips to false in the same update as its
    //      own final increment, so "just was" still has to count.
    //   3. Still the SAME investigation as the previous run of this effect —
    //      the decisive guard. `selectHistory` can interrupt a mid-stream
    //      investigation (isStreaming was true) and happen to jump
    //      `revealedCount` to exactly `previousRevealedCount + 1` in the new
    //      investigation, which would otherwise satisfy both conditions
    //      above and yank the scroll position right after
    //      `useScrollToTopOnInvestigationChange` just reset it. A genuine
    //      reveal step never changes `activeHistoryId` mid-stream, so this
    //      alone rules out every investigation-swap case, cached or fresh.
    if (!isStreaming && !wasStreaming) return
    if (activeHistoryId !== previousActiveHistoryId) return
    if (revealedCount !== previousRevealedCount + 1) return
    const latestId = revealOrderIds[revealedCount - 1]
    if (!latestId) return
    const target = document.querySelector<HTMLElement>(`[data-widget-id="${latestId}"]`)
    const container = target?.closest<HTMLElement>('main')
    if (target && container) scrollIntoViewSlowly(target, container, REVEAL_SCROLL_DURATION_MS, scrollRafIdRef)
  }, [revealedCount, revealOrderIds, isStreaming, activeHistoryId])

  useEffect(
    () => () => {
      if (scrollRafIdRef.current !== null) cancelAnimationFrame(scrollRafIdRef.current)
    },
    []
  )
}

/**
 * Renders the current widget array as three drag-and-drop tiers (metrics /
 * secondary / table — see `groupOfWidgetType`), each independently
 * reorderable, and each movable as a whole block relative to the other
 * tiers. One `DndContext` covers both grains: every draggable tags itself
 * with `data.kind` ('group' | 'widget') so this single `handleDragEnd` can
 * dispatch to the right store action — `dashboard-store.ts` owns both as
 * client-side-only concerns, same as the flat reorder it replaces.
 */
export function DashboardGrid() {
  const widgets = useDashboardWidgets()
  const groupOrder = useDashboardGroupOrder()
  const revealedCount = useRevealedCount()
  const reorderGroups = useDashboardStore((s) => s.reorderGroups)
  const reorderWithinGroup = useDashboardStore((s) => s.reorderWithinGroup)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const widgetsByGroup = useMemo(() => {
    const grouped: Record<GroupKind, typeof widgets> = { metrics: [], secondary: [], table: [] }
    for (const widget of widgets) {
      grouped[groupOfWidgetType(widget.type)].push(widget)
    }
    return grouped
  }, [widgets])

  // Visual reading order (groupOrder, then within-group order) determines
  // which widgets have "arrived" in the simulated stream so far.
  const revealOrderIds = useMemo(
    () => groupOrder.flatMap((group) => widgetsByGroup[group].map((widget) => widget.id)),
    [groupOrder, widgetsByGroup]
  )
  const revealedIds = useMemo(
    () => new Set(revealOrderIds.slice(0, revealedCount)),
    [revealOrderIds, revealedCount]
  )

  useScrollToTopOnInvestigationChange()
  useStreamingReveal(revealOrderIds)

  /**
   * Two different drag "grains" (group bands and widget tiles) are
   * registered as droppables in this one `DndContext` at once, since a
   * group band's `useSortable` node wraps its own widgets' `useSortable`
   * nodes. dnd-kit's default `closestCenter` compares an active item's rect
   * against *every* registered droppable regardless of grain, which — for
   * nested sortables like this — tends to keep resolving `over` back to
   * whatever container the drag started in. Scoping the candidate pool by
   * `data.kind`/`data.group` before delegating to `closestCenter` is the
   * standard dnd-kit fix for mixed-grain nested sortables.
   */
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const activeData = args.active.data.current
    const scoped =
      activeData?.kind === 'group'
        ? args.droppableContainers.filter((container) => container.data.current?.kind === 'group')
        : args.droppableContainers.filter((container) => container.data.current?.group === activeData?.group)
    return closestCenter({ ...args, droppableContainers: scoped })
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      if (active.data.current?.kind === 'group') {
        const fromIndex = groupOrder.indexOf(active.id as GroupKind)
        const toIndex = groupOrder.indexOf(over.id as GroupKind)
        if (fromIndex === -1 || toIndex === -1) return
        reorderGroups(fromIndex, toIndex)
        return
      }

      const group = active.data.current?.group as GroupKind | undefined
      if (!group) return
      const groupWidgets = widgetsByGroup[group]
      const fromIndex = groupWidgets.findIndex((widget) => widget.id === active.id)
      const toIndex = groupWidgets.findIndex((widget) => widget.id === over.id)
      if (fromIndex === -1 || toIndex === -1) return
      reorderWithinGroup(group, fromIndex, toIndex)
    },
    [groupOrder, widgetsByGroup, reorderGroups, reorderWithinGroup]
  )

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd}>
      <SortableContext items={groupOrder} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-4">
          {groupOrder.map((group) => (
            <GroupBand key={group} group={group} widgets={widgetsByGroup[group]} revealedIds={revealedIds} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
