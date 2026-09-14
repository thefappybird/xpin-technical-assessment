import { memo } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WidgetDragHandle } from '@/components/dashboard/widget-drag-handle'
import type { WidgetComponentProps } from '@/lib/widget-registry'
import type { DistributionChartWidget as DistributionChartWidgetType } from '@/types/dashboard'

/**
 * `DISTRIBUTION_CHART` — DESIGN.md's plain bar histogram: no axis
 * lines/gridlines, bars carry the information via an Amber Alert gradient
 * (deliberately not Electric Cyan/Primary Blue — this is aggregate summary
 * data, not a live signal or primary action, per The One Signal Rule). Only
 * three mono axis labels (first/middle/last bucket) beneath the bars, not
 * one per bucket, so the chart stays legible regardless of bucket count.
 */
function DistributionChartWidgetImpl({ widget }: WidgetComponentProps) {
  const chart = widget as DistributionChartWidgetType
  const { buckets, unit } = chart.data

  const maxValue = Math.max(...buckets.map((b) => b.value), 1)
  const midIndex = Math.floor((buckets.length - 1) / 2)

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-2">
        <WidgetDragHandle />
        <CardTitle>{chart.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {buckets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No distribution data available.</p>
        ) : (
          <>
            {/* flex-1, not a fixed height: grows to fill whatever height the
                grid row settles on (e.g. matching a taller sibling like
                Recommended actions) instead of leaving dead space below a
                short, fixed-height chart. The min-height floor matters just
                as much as the flex-1 ceiling: when this card has no taller
                sibling to stretch against (e.g. it lands alone in a
                trailing full-width row), flex-1 has nothing to grow into,
                and short-but-wide bars read as flat and disproportionate. */}
            <div
              className="flex min-h-[180px] flex-1 items-end gap-1.5"
              role="img"
              aria-label={`${chart.title} bar chart`}
            >
              {buckets.map((bucket) => (
                <div
                  key={bucket.label}
                  title={`${bucket.label}: ${bucket.value}${unit ? ` ${unit}` : ''}`}
                  className="min-w-0 flex-1 rounded-t-[3px]"
                  style={{
                    height: `${Math.max((bucket.value / maxValue) * 100, 2)}%`,
                    background:
                      'linear-gradient(180deg, var(--status-warning-dot), color-mix(in srgb, var(--status-warning-dot) 30%, transparent))',
                  }}
                />
              ))}
            </div>
            <div className="mt-2 flex shrink-0 justify-between font-mono text-[11px] text-muted-foreground">
              <span>{buckets[0]?.label}</span>
              {buckets.length > 2 && <span>{buckets[midIndex]?.label}</span>}
              {buckets.length > 1 && <span>{buckets[buckets.length - 1]?.label}</span>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Memoized: the registry renders N widgets from a schema array, so a change
// to one widget shouldn't re-render its siblings.
export default memo(DistributionChartWidgetImpl)
