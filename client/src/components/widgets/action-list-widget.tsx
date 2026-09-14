import { memo } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WidgetDragHandle } from '@/components/dashboard/widget-drag-handle'
import { useWidgetAction } from '@/hooks/use-widget-action'
import { cn } from '@/lib/utils'
import type { WidgetComponentProps } from '@/lib/widget-registry'
import type { ActionListWidget as ActionListWidgetType, ChecklistToggleItemPayload } from '@/types/dashboard'

/**
 * `ACTION_LIST` — DESIGN.md's checklist item exactly: an invisible native
 * checkbox behind a custom 18px box (checked → Signal Green fill), the
 * entire row as one `<label>` hit target, and the label strikes through +
 * dims when done. Toggling is optimistic via the one shared
 * `useWidgetAction` hook — instant feedback, automatic rollback + toast on
 * failure (see the backend's deliberate first-attempt-fails demo item).
 */
function ActionListWidgetImpl({ widget }: WidgetComponentProps) {
  const list = widget as ActionListWidgetType
  const toggleItem = useWidgetAction({ successMessage: 'Action updated.' })

  const pendingItemId =
    toggleItem.isPending && (toggleItem.variables?.payload as ChecklistToggleItemPayload | undefined)?.itemId

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-2">
        <WidgetDragHandle />
        <CardTitle>{list.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {list.data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recommended actions right now.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {list.data.items.map((item) => {
              const isItemPending = pendingItemId === item.id
              return (
                <li key={item.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-accent',
                      isItemPending && 'opacity-60'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      disabled={isItemPending}
                      onChange={() => {
                        const payload: ChecklistToggleItemPayload = { itemId: item.id }
                        toggleItem.mutate({
                          widgetId: list.id,
                          action: 'checklist/toggle-item',
                          payload,
                        })
                      }}
                      className="absolute size-px opacity-0"
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-input text-transparent transition-colors',
                        item.done && 'border-status-success-dot bg-status-success-dot text-background'
                      )}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span
                      className={cn(
                        'text-sm text-foreground',
                        item.done && 'text-muted-foreground line-through'
                      )}
                    >
                      {item.label}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// Memoized: the registry renders N widgets from a schema array, so a change
// to one widget shouldn't re-render its siblings.
export default memo(ActionListWidgetImpl)
