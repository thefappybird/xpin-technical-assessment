import { useCallback, useEffect, useMemo } from 'react'
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
  useDashboardGroupOrder,
  useDashboardStore,
  useDashboardWidgets,
  useIsStreaming,
  useRevealedCount,
  type GroupKind,
} from '@/stores/dashboard-store'

/**
 * Drives the simulated "streaming" reveal: while `isStreaming`, reveals one
 * more widget every `STREAM_REVEAL_MS` until the whole dashboard has
 * "arrived". Re-schedules itself off `revealedCount` (not just `isStreaming`,
 * which only flips once at the very end) so each reveal step queues the next.
 */
function useStreamingReveal() {
  const isStreaming = useIsStreaming()
  const revealedCount = useRevealedCount()
  const revealNextWidget = useDashboardStore((s) => s.revealNextWidget)

  useEffect(() => {
    if (!isStreaming) return
    const timer = setTimeout(() => revealNextWidget(), STREAM_REVEAL_MS)
    return () => clearTimeout(timer)
  }, [isStreaming, revealedCount, revealNextWidget])
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

  useStreamingReveal()

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
  const revealedIds = useMemo(() => {
    const orderedIds = groupOrder.flatMap((group) => widgetsByGroup[group].map((widget) => widget.id))
    return new Set(orderedIds.slice(0, revealedCount))
  }, [groupOrder, widgetsByGroup, revealedCount])

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
