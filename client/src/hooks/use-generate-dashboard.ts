import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError, generateDashboard } from '@/lib/api-client'
import { useDashboardStore } from '@/stores/dashboard-store'

export interface GenerateDashboardVariables {
  prompt: string
  /** Set when this call is running a previously-seeded, not-yet-fetched preset investigation — see `preset-investigations.ts`. */
  presetId?: string
}

/**
 * Wraps `POST /api/generate-dashboard`. Server state (isPending/isError/data)
 * stays owned by this mutation, per CLAUDE.md's "Server state → TanStack
 * Query" rule — only the resulting widget array/layout is handed off to the
 * Zustand store, which owns client-side reordering/optimistic edits from
 * there. A `presetId` fills that seeded history entry in place instead of
 * pushing a duplicate new one.
 */
export function useGenerateDashboard() {
  const setDashboard = useDashboardStore((s) => s.setDashboard)
  const pushHistory = useDashboardStore((s) => s.pushHistory)
  const fillHistoryEntry = useDashboardStore((s) => s.fillHistoryEntry)

  return useMutation({
    mutationFn: ({ prompt }: GenerateDashboardVariables) => generateDashboard(prompt),
    onSuccess: (dashboard, variables) => {
      if (variables.presetId) {
        fillHistoryEntry(variables.presetId, dashboard)
      } else {
        setDashboard(dashboard)
        pushHistory(variables.prompt, dashboard)
      }
    },
    onError: (error) => {
      const message =
        error instanceof ApiError ? error.message : 'Failed to generate the dashboard.'
      toast.error(message)
    },
  })
}
