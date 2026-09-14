import { useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { GripHorizontalIcon } from 'lucide-react'

import { SortableWidgetTile } from '@/components/dashboard/sortable-widget-tile'
import { UnknownWidgetFallback } from '@/components/dashboard/unknown-widget-fallback'
import { WidgetBoundary } from '@/components/dashboard/widget-boundary'
import { WidgetSkeleton } from '@/components/dashboard/widget-skeleton'
import { widgetRegistry } from '@/lib/widget-registry'
import { cn } from '@/lib/utils'
import type { GroupKind } from '@/stores/dashboard-store'
import type { Widget } from '@/types/dashboard'

/** Every widget within a group is the same archetype, so span rules are simple (no cross-type interleaving to compute). */
const GROUP_CONTAINER_CLASSNAME: Record<GroupKind, string> = {
  metrics: 'grid grid-cols-2 items-stretch gap-4 lg:grid-cols-4',
  secondary: 'grid grid-cols-2 items-stretch gap-4 lg:grid-cols-4',
  table: 'grid grid-cols-1 items-stretch gap-4',
}

/** Metrics: always one track. Table: always the full row. Secondary: pairs up, trailing odd one out gets a full row. */
function spanClassName(group: GroupKind, index: number, count: number): string {
  if (group === 'metrics') return 'col-span-1'
  if (group === 'table') return 'col-span-full'
  const isTrailingOdd = count % 2 === 1 && index === count - 1
  return isTrailingOdd ? 'col-span-2 md:col-span-2 lg:col-span-4' : 'col-span-2 md:col-span-1 lg:col-span-2'
}

interface GroupBandProps {
  group: GroupKind
  widgets: Widget[]
  /** Widget ids "arrived" so far in the simulated stream reveal — see `dashboard-grid.tsx`'s `useStreamingReveal`. */
  revealedIds: Set<string>
}

/**
 * One drag-and-drop tier (metrics / secondary / table). The band itself is
 * bulk-draggable via the grab rail at its top (`useSortable` with `data:
 * {kind:'group'}` — see `dashboard-grid.tsx`'s single `handleDragEnd`), and
 * its contents are independently reorderable via a nested `SortableContext`
 * scoped to just this group's widget ids.
 */
export function GroupBand({ group, widgets, revealedIds }: GroupBandProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: group,
    data: { kind: 'group' },
  })

  // `CSS.Translate`, not `CSS.Transform`: dropping the auto-scaleX/scaleY
  // dnd-kit applies to match a differently-sized neighbor is what stops the
  // dragged band from visibly "ballooning" as it passes the much-taller
  // table band.
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  const widgetIds = useMemo(() => widgets.map((widget) => widget.id), [widgets])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg transition-[opacity,transform,box-shadow] duration-150',
        isDragging && 'opacity-60',
        isOver && !isDragging && 'scale-[1.01] ring-2 ring-ring'
      )}
    >
      <button
        type="button"
        aria-label={`Drag to move the whole ${group} section`}
        className="hidden h-5 w-full cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground/50 outline-none hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing md:flex"
        {...attributes}
        {...listeners}
      >
        <GripHorizontalIcon className="size-4" />
      </button>

      <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
        <div className={GROUP_CONTAINER_CLASSNAME[group]}>
          {widgets.map((widget, index) => {
            const WidgetComponent = widgetRegistry[widget.type]
            const isRevealed = revealedIds.has(widget.id)
            return (
              <SortableWidgetTile
                key={widget.id}
                id={widget.id}
                group={group}
                className={spanClassName(group, index, widgets.length)}
              >
                {isRevealed ? (
                  <WidgetBoundary type={widget.type} widgetId={widget.id}>
                    {WidgetComponent ? (
                      <WidgetComponent widget={widget} />
                    ) : (
                      <UnknownWidgetFallback type={widget.type} title={widget.title} />
                    )}
                  </WidgetBoundary>
                ) : (
                  <WidgetSkeleton type={widget.type} className="h-full" />
                )}
              </SortableWidgetTile>
            )
          })}
        </div>
      </SortableContext>
    </div>
  )
}
