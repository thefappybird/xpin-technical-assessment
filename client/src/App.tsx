import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { LayoutDashboardIcon, MenuIcon } from 'lucide-react'

import { DashboardGrid } from '@/components/dashboard/dashboard-grid'
import { PromptBar } from '@/components/dashboard/prompt-bar'
import { HistoryRail } from '@/components/layout/history-rail'
import { NavRail } from '@/components/layout/nav-rail'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { useGenerateDashboard } from '@/hooks/use-generate-dashboard'
import { queryClient } from '@/lib/query-client'
import { PRESET_INVESTIGATIONS } from '@/lib/preset-investigations'
import { useDashboardStore, useDashboardWidgets, useHasHydrated } from '@/stores/dashboard-store'

const SAMPLE_PROMPT = 'Which accounts are high-risk and need review?'

/**
 * The workspace shell: a left nav rail (brand, New investigation, theme
 * toggle), the main column (a slim mobile-only top bar, the widget grid or
 * its empty/loading state, and the bottom-docked prompt bar), and a right
 * history rail (desktop only). Per CLAUDE.md, "New investigation" is
 * client-side-only (clears local state, no backend call).
 */
function DashboardWorkspace() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const widgets = useDashboardWidgets()
  const hasHydrated = useHasHydrated()
  const seedPresets = useDashboardStore((s) => s.seedPresets)
  const generateDashboard = useGenerateDashboard()
  const isLoading = generateDashboard.isPending

  // The dashboard (widgets/history/reorder) persists to localStorage — see
  // `dashboard-store.ts` — so a refresh restores exactly what was on screen.
  // This effect must wait for `hasHydrated` before deciding anything: seeding
  // presets or auto-loading the first one before rehydration finishes would
  // clobber a just-restored dashboard with a fresh one. Runs once, right
  // after hydration completes — by then `widgets`/`history` already reflect
  // whatever was (or wasn't) in storage.
  useEffect(() => {
    if (!hasHydrated) return
    seedPresets(PRESET_INVESTIGATIONS)
    if (widgets.length === 0 && !generateDashboard.isPending) {
      const first = PRESET_INVESTIGATIONS[0]
      generateDashboard.mutate({ prompt: first.prompt, presetId: first.id })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated])

  return (
    <div className="flex h-svh w-full overflow-hidden">
      <NavRail mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3 lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Open navigation"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(true)}
          >
            <MenuIcon />
          </Button>
          <h1 className="text-sm font-bold text-foreground">Dynamic Engine</h1>
        </header>

        <main className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6 lg:p-8">
          {isLoading && widgets.length === 0 ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy="true" aria-live="polite">
              <span className="sr-only">Generating dashboard…</span>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          ) : widgets.length > 0 ? (
            <DashboardGrid />
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <LayoutDashboardIcon />
                </EmptyMedia>
                <EmptyTitle>No dashboard yet</EmptyTitle>
                <EmptyDescription>
                  Ask a question below to generate a dashboard, or try a sample prompt.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button type="button" onClick={() => generateDashboard.mutate({ prompt: SAMPLE_PROMPT })}>
                  Try a sample prompt
                </Button>
              </EmptyContent>
            </Empty>
          )}
        </main>

        <div className="border-t bg-card/60 px-4 py-3 sm:px-6 lg:px-8">
          <PromptBar onSubmit={(prompt) => generateDashboard.mutate({ prompt })} isPending={isLoading} />
        </div>
      </div>

      <HistoryRail
        isGenerating={isLoading}
        onGeneratePreset={(id, prompt) => generateDashboard.mutate({ prompt, presetId: id })}
      />
    </div>
  )
}

function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      themes={['dark', 'light', 'high-contrast']}
      enableSystem={false}
    >
      <QueryClientProvider client={queryClient}>
        <DashboardWorkspace />
        <Toaster position="bottom-right" richColors closeButton />
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
