// Prompt-keyword-matched scenario templates. Each template describes the
// *shape* of a dashboard (widget titles/copy/composition) — dashboard-builder.ts
// combines a template with live account data + per-call jitter to produce the
// actual DashboardResponse. Keeping three distinct templates (rather than one
// static payload with swapped labels) is deliberate: PRODUCT.md's positioning
// claim is that the schema itself varies per query, not just the numbers —
// Template C proves this by adding a second DISTRIBUTION_CHART widget.

import type {
  ActionListItem,
  DistributionBucket,
  Layout,
  Theme,
} from '../types/dashboard.js'

/** Stable id shared by every template's escalation action-item, so the
 * deliberate first-toggle-fails demo (see routes/widget-action.ts) works
 * no matter which template the current dashboard happens to be. */
export const ESCALATE_ITEM_ID = 'action-escalate-compliance'

export interface MetricCardSpec {
  id: string
  title: string
  baseValue: number
  unit?: string
  decimals: 0 | 1
  baseTrendPct: number
  status: 'success' | 'warning' | 'error' | 'neutral'
  sparklineBase: number[]
}

export interface DistributionSpec {
  id: string
  title: string
  unit: string
  baseBuckets: DistributionBucket[]
}

export interface ScenarioTemplate {
  id: 'A' | 'B' | 'C'
  layout: Layout
  theme: Theme
  metricCards: MetricCardSpec[]
  table: { id: string; title: string }
  actionList: { id: string; title: string; items: ActionListItem[] }
  distributions: DistributionSpec[]
}

// ---------------------------------------------------------------------------
// Template A — default / "risk", "review", "account" keywords
// ---------------------------------------------------------------------------

const templateA: ScenarioTemplate = {
  id: 'A',
  layout: 'grid-3-col',
  theme: 'dark',
  metricCards: [
    {
      id: 'wgt_metric_flagged',
      title: 'Accounts Flagged High-Risk',
      baseValue: 2988,
      decimals: 0,
      baseTrendPct: 12.4,
      status: 'warning',
      sparklineBase: [40, 55, 50, 62, 58, 70, 75],
    },
    {
      id: 'wgt_metric_critical',
      title: 'Critical Accounts',
      baseValue: 996,
      decimals: 0,
      baseTrendPct: 4.1,
      status: 'error',
      sparklineBase: [10, 14, 12, 18, 20, 19, 24],
    },
    {
      id: 'wgt_metric_avgrisk',
      title: 'Avg Risk Score',
      baseValue: 61.4,
      unit: '/100',
      decimals: 1,
      baseTrendPct: 2.3,
      status: 'warning',
      sparklineBase: [55, 57, 58, 60, 59, 61, 62],
    },
    {
      id: 'wgt_metric_cleared',
      title: 'Cleared This Week',
      baseValue: 214,
      decimals: 0,
      baseTrendPct: -3.2,
      status: 'success',
      sparklineBase: [30, 28, 32, 26, 29, 24, 22],
    },
  ],
  table: { id: 'wgt_table', title: 'Top accounts by risk' },
  actionList: {
    id: 'wgt_actions',
    title: 'Recommended actions',
    items: [
      { id: 'action-review-critical', label: 'Review 996 critical accounts flagged this week', done: false },
      { id: ESCALATE_ITEM_ID, label: 'Escalate accounts scoring above 90 to compliance', done: false },
      { id: 'action-reverify-kyc', label: 'Re-verify KYC documentation for 42 dormant accounts', done: false },
      { id: 'action-confirm-ownership', label: 'Confirm beneficial ownership on flagged shell entities', done: true },
      { id: 'action-schedule-review', label: 'Schedule quarterly review for accounts nearing the 80 threshold', done: false },
      { id: 'action-archive-cleared', label: 'Archive cleared accounts from active monitoring queue', done: true },
    ],
  },
  distributions: [
    {
      id: 'wgt_chart',
      title: 'Risk score distribution',
      unit: 'accounts',
      baseBuckets: [
        { label: '0-20', value: 18 },
        { label: '21-40', value: 27 },
        { label: '41-60', value: 24 },
        { label: '61-80', value: 19 },
        { label: '81-100', value: 12 },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Template B — "compliance", "kyc", "aml", "audit" keywords
// ---------------------------------------------------------------------------

const templateB: ScenarioTemplate = {
  id: 'B',
  layout: 'grid-3-col',
  theme: 'dark',
  metricCards: [
    {
      id: 'wgt_metric_open_cases',
      title: 'Open Compliance Cases',
      baseValue: 1842,
      decimals: 0,
      baseTrendPct: 6.7,
      status: 'warning',
      sparklineBase: [35, 40, 44, 41, 48, 52, 55],
    },
    {
      id: 'wgt_metric_aml_alerts',
      title: 'AML Alerts Pending Review',
      baseValue: 573,
      decimals: 0,
      baseTrendPct: 9.5,
      status: 'error',
      sparklineBase: [12, 15, 14, 20, 22, 25, 28],
    },
    {
      id: 'wgt_metric_audit_cycle',
      title: 'Avg Audit Cycle Time',
      baseValue: 6.8,
      unit: 'days',
      decimals: 1,
      baseTrendPct: -8.4,
      status: 'success',
      sparklineBase: [9, 8.5, 8, 7.5, 7.2, 7, 6.8],
    },
    {
      id: 'wgt_metric_cases_closed',
      title: 'Cases Closed This Week',
      baseValue: 128,
      decimals: 0,
      baseTrendPct: 5.1,
      status: 'success',
      sparklineBase: [18, 20, 19, 24, 22, 26, 28],
    },
  ],
  table: { id: 'wgt_table', title: 'Accounts under compliance review' },
  actionList: {
    id: 'wgt_actions',
    title: 'Compliance checklist',
    items: [
      { id: 'action-triage-aml', label: 'Complete AML alert triage for 573 pending cases', done: false },
      { id: ESCALATE_ITEM_ID, label: 'Escalate accounts scoring above 90 to compliance', done: false },
      { id: 'action-reverify-kyc', label: 'Re-verify KYC documentation for 42 dormant accounts', done: false },
      { id: 'action-confirm-ownership', label: 'Confirm beneficial ownership on flagged shell entities', done: false },
      { id: 'action-sar-filing', label: 'Complete quarterly SAR filing review', done: true },
      { id: 'action-close-findings', label: 'Close out remediated audit findings', done: true },
    ],
  },
  distributions: [
    {
      id: 'wgt_chart',
      title: 'Compliance case severity distribution',
      unit: 'cases',
      baseBuckets: [
        { label: '0-20', value: 22 },
        { label: '21-40', value: 25 },
        { label: '41-60', value: 23 },
        { label: '61-80', value: 18 },
        { label: '81-100', value: 12 },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Template C — "performance", "portfolio", "trend" keywords
// Adds a second DISTRIBUTION_CHART widget, to prove the schema itself varies
// per query rather than just its copy/values.
// ---------------------------------------------------------------------------

const templateC: ScenarioTemplate = {
  id: 'C',
  layout: 'grid-4-col',
  theme: 'dark',
  metricCards: [
    {
      id: 'wgt_metric_var',
      title: 'Portfolio Value at Risk',
      baseValue: 4.2,
      unit: '$M',
      decimals: 1,
      baseTrendPct: -1.8,
      status: 'success',
      sparklineBase: [5.1, 4.9, 4.8, 4.6, 4.5, 4.3, 4.2],
    },
    {
      id: 'wgt_metric_improving',
      title: 'Accounts Improving',
      baseValue: 341,
      decimals: 0,
      baseTrendPct: 7.9,
      status: 'success',
      sparklineBase: [22, 26, 28, 31, 33, 36, 38],
    },
    {
      id: 'wgt_metric_deteriorating',
      title: 'Accounts Deteriorating',
      baseValue: 189,
      decimals: 0,
      baseTrendPct: 3.4,
      status: 'warning',
      sparklineBase: [14, 15, 17, 16, 18, 19, 21],
    },
    {
      id: 'wgt_metric_trend_score',
      title: '30-Day Trend Score',
      baseValue: 58.6,
      unit: '/100',
      decimals: 1,
      baseTrendPct: 1.2,
      status: 'neutral',
      sparklineBase: [54, 55, 56, 55, 57, 58, 58.6],
    },
  ],
  table: { id: 'wgt_table', title: 'Accounts by performance trend' },
  actionList: {
    id: 'wgt_actions',
    title: 'Portfolio actions',
    items: [
      { id: 'action-review-critical', label: 'Review 996 critical accounts flagged this week', done: false },
      { id: ESCALATE_ITEM_ID, label: 'Escalate accounts scoring above 90 to compliance', done: false },
      { id: 'action-reverify-kyc', label: 'Re-verify KYC documentation for 42 dormant accounts', done: false },
      { id: 'action-rebalance', label: 'Rebalance exposure across the Institutional segment', done: false },
      { id: 'action-schedule-review', label: 'Schedule quarterly review for accounts nearing the 80 threshold', done: true },
    ],
  },
  distributions: [
    {
      id: 'wgt_chart',
      title: 'Risk score distribution',
      unit: 'accounts',
      baseBuckets: [
        { label: '0-20', value: 20 },
        { label: '21-40', value: 26 },
        { label: '41-60', value: 25 },
        { label: '61-80', value: 18 },
        { label: '81-100', value: 11 },
      ],
    },
    {
      id: 'wgt_chart_trend',
      title: '30-day risk score trend distribution',
      unit: 'accounts',
      baseBuckets: [
        { label: 'Improved', value: 38 },
        { label: 'Stable', value: 41 },
        { label: 'Worsened', value: 21 },
      ],
    },
  ],
}

const TEMPLATES: Record<ScenarioTemplate['id'], ScenarioTemplate> = {
  A: templateA,
  B: templateB,
  C: templateC,
}

const TEMPLATE_B_KEYWORDS = ['compliance', 'kyc', 'aml', 'audit']
const TEMPLATE_C_KEYWORDS = ['performance', 'portfolio', 'trend']

function matchTemplateId(prompt: string): ScenarioTemplate['id'] {
  const normalized = prompt.toLowerCase()
  if (TEMPLATE_B_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'B'
  if (TEMPLATE_C_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'C'
  return 'A'
}

/** Case-insensitive substring keyword match on the prompt; falls back to Template A. */
export function matchScenario(prompt: string): ScenarioTemplate {
  return TEMPLATES[matchTemplateId(prompt)]
}
