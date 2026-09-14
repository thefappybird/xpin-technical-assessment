import { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, HistoryIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useActiveHistoryId, useDashboardHistory, useDashboardStore } from '@/stores/dashboard-store'

function formatRelativeTime(timestamp: number): string {
  const diffMinutes = Math.round((Date.now() - timestamp) / 60_000)
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hr ago`
  return `${Math.round(diffHours / 24)}d ago`
}

interface HistoryRailProps {
  /** True while a generate-dashboard call is in flight — disables starting another. */
  isGenerating: boolean
  /** Runs a not-yet-fetched preset investigation for real (see `preset-investigations.ts`). */
  onGeneratePreset: (id: string, prompt: string) => void
}

/**
 * Right sidebar: a genuinely functional session-local history of past
 * investigations (not decorative) — clicking an already-run entry replays
 * its cached `DashboardResponse` through `selectHistory`, no network call,
 * same "client-side only" precedent as reorder/reset. Some entries are
 * seeded, named presets that haven't been run yet (`response: null`) —
 * clicking one of those runs it for real via `onGeneratePreset`. Desktop-only
 * (lg+), matching the mockup's own choice to hide this rail below 1024px —
 * no mobile bottom-sheet equivalent (a deliberate, disclosed scope cut).
 */
export function HistoryRail({ isGenerating, onGeneratePreset }: HistoryRailProps) {
  const [collapsed, setCollapsed] = useState(false)
  const history = useDashboardHistory()
  const activeId = useActiveHistoryId()
  const selectHistory = useDashboardStore((s) => s.selectHistory)

  return (
    <>
      <aside
        aria-label="Investigation history"
        className={cn(
          'hidden shrink-0 overflow-hidden border-l bg-card transition-[width] duration-200 lg:block',
          collapsed ? 'w-0 border-l-0' : 'w-72'
        )}
      >
        <div className="flex h-full w-72 flex-col">
          <div className="flex items-center justify-between gap-2 border-b p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <HistoryIcon className="size-4 text-muted-foreground" />
              Investigation History
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Collapse history panel"
              onClick={() => setCollapsed(true)}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {history.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground">Your investigations will appear here.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {history.map((entry) => {
                  const isActive = entry.id === activeId
                  const isUnfetched = entry.response === null
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        aria-current={isActive ? 'true' : undefined}
                        disabled={isUnfetched && isGenerating}
                        onClick={() =>
                          isUnfetched ? onGeneratePreset(entry.id, entry.prompt) : selectHistory(entry.id)
                        }
                        className={cn(
                          'w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50',
                          isActive && 'bg-accent'
                        )}
                      >
                        <p
                          className={cn(
                            'line-clamp-2 text-xs font-medium',
                            isActive ? 'text-accent-foreground' : 'text-foreground'
                          )}
                        >
                          {entry.title ?? entry.prompt}
                        </p>
                        <p className={cn('mt-1 text-[11px]', isActive ? 'text-ring' : 'text-muted-foreground')}>
                          {isUnfetched
                            ? 'Not yet run — tap to generate'
                            : `${isActive ? 'Active · ' : ''}${formatRelativeTime(entry.submittedAt!)}`}
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </aside>
      {collapsed && (
        <button
          type="button"
          aria-label="Show investigation history panel"
          onClick={() => setCollapsed(false)}
          className="fixed top-4 right-0 z-40 hidden h-8 w-5 items-center justify-center rounded-l-md border border-r-0 bg-card text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:flex"
        >
          <ChevronLeftIcon className="size-3.5" />
        </button>
      )}
    </>
  )
}
