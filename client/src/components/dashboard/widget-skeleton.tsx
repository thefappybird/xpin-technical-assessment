import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { WidgetType } from '@/types/dashboard'

/**
 * Content-area height per widget type, chosen to roughly match each
 * archetype's real footprint — the CLS requirement is that swapping this
 * skeleton for the real widget must not visibly shift the page. Re-tune
 * these once the real (non-stub) widget components ship.
 */
const CONTENT_HEIGHT: Record<WidgetType, string> = {
  METRIC_CARD: 'h-20',
  DATA_TABLE: 'h-80',
  ACTION_LIST: 'h-48',
  DISTRIBUTION_CHART: 'h-48',
}

interface WidgetSkeletonProps {
  type: WidgetType
  className?: string
}

/** Suspense fallback for a lazy-loaded widget — sized by `type` to reserve the right amount of space. */
export function WidgetSkeleton({ type, className }: WidgetSkeletonProps) {
  return (
    <Card className={cn('h-full', className)} role="status" aria-live="polite">
      <span className="sr-only">Loading widget…</span>
      <CardHeader>
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </CardHeader>
      <CardContent>
        <Skeleton className={cn('w-full rounded-md', CONTENT_HEIGHT[type])} />
      </CardContent>
    </Card>
  )
}
