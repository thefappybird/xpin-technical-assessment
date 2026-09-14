import { GripVerticalIcon } from 'lucide-react'

import { useDragHandle } from '@/components/dashboard/sortable-widget-tile'

/**
 * Grip handle meant to be composed inline inside each widget's own
 * `CardHeader`, beside `CardTitle` — matches the mockup's
 * `.panel-header-start` pattern (handle reads as part of the card, not an
 * absolutely-positioned overlay). Reads its drag `attributes`/`listeners`
 * from the nearest `SortableWidgetTile` via context; renders nothing if used
 * outside one (e.g. a widget rendered in isolation/storybook-style).
 */
export function WidgetDragHandle() {
  const handle = useDragHandle()
  if (!handle) return null

  return (
    <button
      type="button"
      aria-label="Drag to reorder widget"
      className="hidden size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:cursor-grabbing md:flex"
      {...handle.attributes}
      {...handle.listeners}
    >
      <GripVerticalIcon className="size-4" />
    </button>
  )
}
