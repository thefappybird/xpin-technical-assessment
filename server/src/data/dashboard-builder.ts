// Composes a scenario template + live account data + per-call jitter into a
// full DashboardResponse, and holds the single mutable "current investigation"
// in memory (there's no auth/session in the contract, so one shared
// in-process dashboard is the simplest coherent behavior). Every
// generate-dashboard call throws the previous one away and builds a fresh
// one from scratch — that's what "resets to scenario defaults" means here.

import type {
  ActionListWidget,
  DashboardResponse,
  DataTableWidget,
  DistributionChartWidget,
  DynamicFormWidget,
  MetricCardWidget,
  TextInsightWidget,
  Widget,
} from '../types/dashboard.js'
import {
  matchScenario,
  type DistributionSpec,
  type FormSpec,
  type MetricCardSpec,
  type ScenarioTemplate,
  type TextInsightSpec,
} from './scenarios.js'
import { queryAccounts, TABLE_COLUMNS } from './table-query.js'

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function formatMetricValue(value: number, decimals: 0 | 1): string {
  if (decimals === 0) return Math.round(value).toLocaleString('en-US')
  return value.toFixed(1)
}

function formatTrend(pct: number): string {
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

/** +/- a small random percentage, so repeated calls don't look frozen. */
function jitterPct(spread: number): number {
  return 1 + (Math.random() - 0.5) * spread
}

function buildMetricCard(spec: MetricCardSpec): MetricCardWidget {
  const value = spec.baseValue * jitterPct(0.06)
  const trend = spec.baseTrendPct + (Math.random() - 0.5) * 1.5
  const sparkline = spec.sparklineBase.map((point) => Math.max(0, roundTo(point * jitterPct(0.08), spec.decimals)))

  return {
    id: spec.id,
    type: 'METRIC_CARD',
    title: spec.title,
    data: {
      value: formatMetricValue(value, spec.decimals),
      unit: spec.unit,
      trend: formatTrend(trend),
      status: spec.status,
      sparkline,
    },
  }
}

function buildTable(spec: ScenarioTemplate['table']): DataTableWidget {
  const result = queryAccounts({ page: 1, sort: { key: 'riskScore', direction: 'desc' }, filters: {} })
  return {
    id: spec.id,
    type: 'DATA_TABLE',
    title: spec.title,
    data: {
      columns: TABLE_COLUMNS,
      rows: result.rows,
      pagination: result.pagination,
      sort: result.sort,
      filters: result.filters,
    },
  }
}

function buildDynamicForm(spec: FormSpec): DynamicFormWidget {
  return {
    id: spec.id,
    type: 'DYNAMIC_FORM',
    title: spec.title,
    data: {
      fields: spec.fields,
      values: Object.fromEntries(spec.fields.map((field) => [field.name, field.default])),
    },
  }
}

function buildTextInsight(spec: TextInsightSpec): TextInsightWidget {
  return {
    id: spec.id,
    type: 'TEXT_INSIGHT',
    title: spec.title,
    data: { body: spec.body, tone: spec.tone },
  }
}

function buildActionList(spec: ScenarioTemplate['actionList']): ActionListWidget {
  return {
    id: spec.id,
    type: 'ACTION_LIST',
    title: spec.title,
    data: { items: spec.items.map((item) => ({ ...item })) },
  }
}

/** Jitters bucket values by a few points while keeping the total pinned at 100. */
function jitterBucketsSumTo100(spec: DistributionSpec): DistributionChartWidget['data']['buckets'] {
  const jittered = spec.baseBuckets.map((bucket) => ({
    ...bucket,
    value: Math.max(1, bucket.value + Math.round((Math.random() - 0.5) * 4)),
  }))

  const largestIndex = jittered.reduce(
    (maxIndex, bucket, index) => (bucket.value > jittered[maxIndex]!.value ? index : maxIndex),
    0,
  )
  const sum = jittered.reduce((total, bucket) => total + bucket.value, 0)
  jittered[largestIndex]!.value = Math.max(1, jittered[largestIndex]!.value + (100 - sum))

  return jittered
}

function buildDistribution(spec: DistributionSpec): DistributionChartWidget {
  return {
    id: spec.id,
    type: 'DISTRIBUTION_CHART',
    title: spec.title,
    data: { buckets: jitterBucketsSumTo100(spec), unit: spec.unit },
  }
}

function composeDashboard(template: ScenarioTemplate): DashboardResponse {
  const widgets: Widget[] = [
    ...template.metricCards.map(buildMetricCard),
    buildTable(template.table),
    buildDynamicForm(template.form),
    buildTextInsight(template.insight),
    buildActionList(template.actionList),
    ...template.distributions.map(buildDistribution),
  ]

  return { layout: template.layout, theme: template.theme, widgets }
}

let currentDashboard: DashboardResponse | null = null

/** Matches the prompt to a scenario, builds a fresh dashboard, and makes it "current". */
export function generateDashboard(prompt: string): DashboardResponse {
  const template = matchScenario(prompt)
  currentDashboard = composeDashboard(template)
  return currentDashboard
}

export function getCurrentDashboard(): DashboardResponse | null {
  return currentDashboard
}

export function findWidget(widgetId: string): Widget | undefined {
  return currentDashboard?.widgets.find((widget) => widget.id === widgetId)
}

/** Full replace of one widget within the current dashboard (widget-action results are always full replaces). */
export function replaceWidget(updated: Widget): void {
  if (!currentDashboard) return
  currentDashboard = {
    ...currentDashboard,
    widgets: currentDashboard.widgets.map((widget) => (widget.id === updated.id ? updated : widget)),
  }
}
