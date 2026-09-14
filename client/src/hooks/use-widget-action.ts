import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError, postWidgetAction } from '@/lib/api-client'
import { useDashboardStore } from '@/stores/dashboard-store'
import type { Widget, WidgetActionRequest, WidgetActionResponse } from '@/types/dashboard'

interface UseWidgetActionOptions {
  /**
   * Supplying this makes the call OPTIMISTIC: the returned widget patch is
   * applied to the store immediately (onMutate) and rolled back on failure
   * (onError). Used by checklist-toggle and dynamic-form field changes.
   *
   * Omit it for a NON-optimistic, loading-state call (table/query): the
   * contract's own note is that a table query result isn't predictable
   * client-side, so the widget is left untouched until the real response
   * arrives — callers show a skeleton/loading UI off this hook's own
   * `isPending`, exactly like TanStack Query intends server state to work.
   */
  optimisticUpdate?: (current: Widget) => Widget
  successMessage?: string
  /** Falls back to the thrown error's own message when omitted. */
  errorMessage?: string
}

interface MutationContext {
  previousWidget?: Widget
}

/**
 * The ONE shared mutation hook for every widget interaction (checklist
 * toggles, dynamic-form submits, table page/sort/filter queries, ...) — see
 * CLAUDE.md's DRY rule. Two thin call sites over this one core:
 *
 *   // optimistic (instant feedback, rollback + toast on failure)
 *   useWidgetAction({
 *     optimisticUpdate: (w) => ({ ...w, data: { ...w.data, items: nextItems } }),
 *     successMessage: 'Action updated.',
 *   })
 *
 *   // non-optimistic, loading-state only (table/query)
 *   useWidgetAction()
 *
 * Reads/writes the dashboard store via `getState()` rather than a subscribed
 * selector — this hook's callbacks don't need to re-render when `widgets`
 * changes, only to read/write it at mutation time.
 */
export function useWidgetAction(options: UseWidgetActionOptions = {}) {
  return useMutation<WidgetActionResponse, ApiError, WidgetActionRequest, MutationContext>({
    mutationFn: (request) => postWidgetAction(request),

    onMutate: (request) => {
      const { widgets, updateWidget } = useDashboardStore.getState()
      const previousWidget = widgets.find((widget) => widget.id === request.widgetId)

      if (options.optimisticUpdate && previousWidget) {
        updateWidget(request.widgetId, options.optimisticUpdate(previousWidget))
      }

      return { previousWidget }
    },

    onError: (error, request, context) => {
      if (context?.previousWidget) {
        useDashboardStore.getState().updateWidget(request.widgetId, context.previousWidget)
      }
      toast.error(options.errorMessage ?? error.message ?? 'That action failed. Please try again.')
    },

    onSuccess: (data) => {
      useDashboardStore.getState().updateWidget(data.widget.id, data.widget)
      if (options.successMessage) {
        toast.success(options.successMessage)
      }
    },
  })
}
