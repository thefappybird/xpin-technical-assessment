import { createContext, memo, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'

import { cn } from '@/lib/utils'
import type { GroupKind } from '@/stores/dashboard-store'

interface DragHandleValue {
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners
}

const DragHandleContext = createContext<DragHandleValue | null>(null)

/** Consumed by `<WidgetDragHandle />`, rendered inline in each widget's own `CardHeader`. */
export function useDragHandle() {
  return useContext(DragHandleContext)
}

interface SortableWidgetTileProps {
  id: string
  group: GroupKind
  className?: string
  children: ReactNode
}

/**
 * Module-scope drag wrapper around one widget tile — never defined inside
 * `DashboardGrid`. Per DESIGN.md's "Drag handle" spec: the source card dims
 * to 45% opacity while dragging, and a valid drop target gets a 2px Electric
 * Cyan ring + 1.01x scale. Unlike the earlier iteration, this component no
 * longer renders the handle itself as an absolutely-positioned overlay — it
 * hands its `attributes`/`listeners` down via context so each widget can
 * compose `<WidgetDragHandle />` inline in its own `CardHeader`, beside the
 * title, matching the mockup's `.panel-header-start` pattern instead of
 * looking bolted on. `React.memo`'d since the grid renders one of these per
 * widget in a list — a drag/hover state change on one tile shouldn't
 * re-render the rest.
 */
function SortableWidgetTileImpl({ id, group, className, children }: SortableWidgetTileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id, data: { kind: 'widget', group } })

  // `CSS.Translate` (not `CSS.Transform`) deliberately drops dnd-kit's
  // auto-scaleX/scaleY — it stretches the dragged element to match whatever
  // differently-sized neighbor it's passing over, which read as the tile
  // "ballooning" mid-drag. Translate keeps the tile's own size fixed and only
  // moves it.
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  const handleValue = useMemo(() => ({ attributes, listeners }), [attributes, listeners])

  return (
    <div
      ref={setNodeRef}
      style={style}
      // Queried by `dashboard-grid.tsx`'s streaming-reveal auto-scroll to
      // bring each newly-arrived widget into view.
      data-widget-id={id}
      className={cn(
        'relative transition-[opacity,transform,box-shadow] duration-150',
        isDragging && 'opacity-45 shadow-overlay',
        isOver && !isDragging && 'scale-[1.01] rounded-lg ring-2 ring-ring',
        className
      )}
    >
      <DragHandleContext.Provider value={handleValue}>{children}</DragHandleContext.Provider>
    </div>
  )
}

export const SortableWidgetTile = memo(SortableWidgetTileImpl)
