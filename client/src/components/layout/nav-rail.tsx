import { useState } from 'react'
import {
  BookmarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
  ZapIcon,
} from 'lucide-react'

import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useDashboardStore } from '@/stores/dashboard-store'

const DISABLED_WORKSPACE_ITEMS = [
  { label: 'Chat with Data', icon: MessageSquareIcon },
  { label: 'Dashboards', icon: LayoutDashboardIcon },
  { label: 'Saved Reports', icon: BookmarkIcon },
]

const DISABLED_MANAGE_ITEMS = [
  { label: 'Admin Console', icon: ShieldIcon },
  { label: 'Settings', icon: SettingsIcon },
]

function DisabledNavItem({ label, icon: Icon }: { label: string; icon: typeof BookmarkIcon }) {
  return (
    <div
      aria-disabled="true"
      className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground/60"
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1">{label}</span>
      <Badge variant="outline" className="text-[9px] text-muted-foreground/70">
        Soon
      </Badge>
    </div>
  )
}

interface NavRailProps {
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

/**
 * Left sidebar: brand, "New investigation" + theme toggle (stacked, per the
 * user's explicit ask), then the workspace/manage nav lists. Only
 * "Investigations" is real — this app has exactly one destination. The rest
 * of the mockup's nav items are kept for visual fidelity but rendered
 * disabled with a "Soon" badge rather than omitted or left as silent dead
 * links. Collapse state is local (ephemeral, single-component UI concern,
 * not a Zustand-worthy shared concern).
 */
export function NavRail({ mobileOpen, onMobileOpenChange }: NavRailProps) {
  const [collapsed, setCollapsed] = useState(false)
  const reset = useDashboardStore((s) => s.reset)

  const handleNewInvestigation = () => {
    reset()
    onMobileOpenChange(false)
  }

  const railBody = (
    <div className="flex h-full w-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ZapIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-foreground">Dynamic Engine</p>
            <p className="truncate text-[11px] text-muted-foreground">Risk &amp; Investigations</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="hidden shrink-0 lg:inline-flex"
          aria-label="Collapse navigation"
          onClick={() => setCollapsed(true)}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full justify-start gap-2 border-dashed"
        onClick={handleNewInvestigation}
      >
        <PlusIcon data-icon="inline-start" />
        New investigation
      </Button>

      <div className="-mx-1 flex-1 overflow-y-auto px-1">
        <div className="flex flex-col gap-1">
          <p className="px-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Workspace</p>
          <div className="flex items-center gap-2.5 rounded-md bg-accent px-2.5 py-2 text-sm font-medium text-accent-foreground">
            <SearchIcon className="size-4 shrink-0 text-accent-foreground" />
            Investigations
          </div>
          {DISABLED_WORKSPACE_ITEMS.map((item) => (
            <DisabledNavItem key={item.label} {...item} />
          ))}
        </div>
      </div>

      {/* Footer: pinned to the bottom, not part of the scrollable list above —
          the theme control and the (currently non-functional) admin items
          both read as account-level chrome, not workspace navigation, so no
          "Manage" heading is needed once they're visually set apart here. */}
      <div className="flex flex-col gap-2 border-t pt-3">
        <ThemeToggle className="w-full" />
        {DISABLED_MANAGE_ITEMS.map((item) => (
          <DisabledNavItem key={item.label} {...item} />
        ))}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop/tablet: persistent, collapsible rail. */}
      <aside
        aria-label="Primary"
        className={cn(
          'hidden shrink-0 overflow-hidden border-r bg-card transition-[width] duration-200 lg:block',
          collapsed ? 'w-0 border-r-0' : 'w-64'
        )}
      >
        {railBody}
      </aside>
      {collapsed && (
        <button
          type="button"
          aria-label="Show navigation panel"
          onClick={() => setCollapsed(false)}
          className="fixed top-4 left-0 z-40 hidden h-8 w-5 items-center justify-center rounded-r-md border border-l-0 bg-card text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:flex"
        >
          <ChevronRightIcon className="size-3.5" />
        </button>
      )}

      {/* Mobile: slide-in drawer with scrim. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/60"
            onClick={() => onMobileOpenChange(false)}
          />
          <aside aria-label="Primary" className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r bg-card shadow-overlay">
            {railBody}
          </aside>
        </div>
      )}
    </>
  )
}
