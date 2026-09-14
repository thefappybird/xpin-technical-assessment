import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'

import type { Widget, WidgetType } from '@/types/dashboard'

/** Every widget component receives the full widget object and narrows `data` itself from `type`. */
export interface WidgetComponentProps {
  widget: Widget
}

/**
 * The Dynamic Generative UI Registry: maps each schema `type` to its React
 * component, lazily. An unknown/rarely-used widget type is never in the
 * initial bundle — the registry render loop (dashboard-grid.tsx) looks up a
 * key here and falls back to `UnknownWidgetFallback` for a `type` that isn't
 * one of these four.
 */
export const widgetRegistry: Record<
  WidgetType,
  LazyExoticComponent<ComponentType<WidgetComponentProps>>
> = {
  METRIC_CARD: lazy(() => import('@/components/widgets/metric-card-widget')),
  DATA_TABLE: lazy(() => import('@/components/widgets/data-table-widget')),
  ACTION_LIST: lazy(() => import('@/components/widgets/action-list-widget')),
  DISTRIBUTION_CHART: lazy(() => import('@/components/widgets/distribution-chart-widget')),
}
