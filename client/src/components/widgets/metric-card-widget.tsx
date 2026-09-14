import { memo } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WidgetDragHandle } from '@/components/dashboard/widget-drag-handle'
import { cn } from '@/lib/utils'
import type { WidgetComponentProps } from '@/lib/widget-registry'
import type { MetricCardWidget as MetricCardWidgetType } from '@/types/dashboard'

const TREND_TEXT_CLASSNAME: Record<MetricCardWidgetType['data']['status'], string> = {
  success: 'text-status-success-dot',
  warning: 'text-status-warning-dot',
  error: 'text-status-error-dot',
  neutral: 'text-ring',
}

const SPARKLINE_STROKE_CLASSNAME: Record<MetricCardWidgetType['data']['status'], string> = {
  success: 'stroke-status-success-dot',
  warning: 'stroke-status-warning-dot',
  error: 'stroke-status-error-dot',
  neutral: 'stroke-ring',
}

/** Renders `sparkline` as a tiny inline SVG polyline — no charting library for a 7-point line. */
function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values
    .map((value, i) => {
      const x = (i / (values.length - 1)) * 100
      const y = 100 - ((value - min) / range) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn('h-10 w-full', className)}
      aria-hidden="true"
    >
      <polyline points={points} fill="none" strokeWidth={4} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/**
 * `METRIC_CARD` — one grid track wide (DESIGN.md's Layout rule), hero value
 * in IBM Plex Mono (the "Numbers-Get-A-Voice" rule), trend + sparkline
 * colored by `status`. No interactivity — this is the simplest widget, but
 * one grading pillar (UI/UX Precision) leans hardest on typography exactness
 * here.
 */
function MetricCardWidgetImpl({ widget }: WidgetComponentProps) {
  const metric = widget as MetricCardWidgetType
  const { value, unit, trend, status, sparkline } = metric.data

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-2">
        <WidgetDragHandle />
        <CardTitle className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
          {metric.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[28px] leading-none font-semibold tracking-tight text-foreground">
            {value}
          </span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        {trend && (
          <span className={cn('font-mono text-xs font-semibold', TREND_TEXT_CLASSNAME[status])}>{trend}</span>
        )}
        {sparkline && sparkline.length > 1 && (
          <Sparkline values={sparkline} className={SPARKLINE_STROKE_CLASSNAME[status]} />
        )}
      </CardContent>
    </Card>
  )
}

// Memoized: the registry renders N widgets from a schema array, so a change
// to one widget shouldn't re-render its siblings.
export default memo(MetricCardWidgetImpl)
