import { memo } from 'react'

import { StatusPill } from '@/components/dashboard/status-pill'
import { WidgetDragHandle } from '@/components/dashboard/widget-drag-handle'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WidgetComponentProps } from '@/lib/widget-registry'
import type { TextInsightWidget as TextInsightWidgetType } from '@/types/dashboard'

const TONE_LABEL: Record<NonNullable<TextInsightWidgetType['data']['tone']>, string> = {
  success: 'Improving',
  warning: 'Watch',
  error: 'Critical',
  neutral: 'Neutral',
}

/**
 * `TEXT_INSIGHT` — DESIGN.md's "Narrative Summary" card: read-only prose
 * commentary, no interactivity (same simplest-widget tier as `METRIC_CARD`).
 * `tone` reuses the shared status vocabulary/`StatusPill` rather than
 * inventing a parallel one.
 */
function TextInsightWidgetImpl({ widget }: WidgetComponentProps) {
  const insight = widget as TextInsightWidgetType
  const { body, tone } = insight.data

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-2">
        <WidgetDragHandle />
        <CardTitle className="flex-1">{insight.title}</CardTitle>
        {tone && <StatusPill status={tone} label={TONE_LABEL[tone]} />}
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-foreground">{body}</p>
      </CardContent>
    </Card>
  )
}

// Memoized: the registry renders N widgets from a schema array, so a change
// to one widget shouldn't re-render its siblings.
export default memo(TextInsightWidgetImpl)
