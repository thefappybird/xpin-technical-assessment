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
  DynamicFormField,
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

export interface FormSpec {
  id: string
  title: string
  fields: DynamicFormField[]
}

export interface TextInsightSpec {
  id: string
  title: string
  body: string
  tone?: 'success' | 'warning' | 'error' | 'neutral'
}

export interface ScenarioTemplate {
  id: 'A' | 'B' | 'C'
  layout: Layout
  theme: Theme
  metricCards: MetricCardSpec[]
  table: { id: string; title: string }
  form: FormSpec
  insight: TextInsightSpec
  actionList: { id: string; title: string; items: ActionListItem[] }
  distributions: DistributionSpec[]
}

/**
 * Field names are shared across every template on purpose — the
 * `'form/submit'` handler's cross-field validation (escalation threshold
 * must be >= review threshold) is hardcoded to these two keys, same as
 * `ESCALATE_ITEM_ID` above is hardcoded for the checklist demo. Titles/
 * defaults still vary per template so the form doesn't read as a copy-paste.
 */
const REVIEW_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

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
  form: {
    id: 'wgt_form',
    title: 'Review Parameters',
    fields: [
      { name: 'reviewThreshold', label: 'Review Threshold', type: 'slider', min: 0, max: 100, step: 1, default: 70 },
      {
        name: 'escalationThreshold',
        label: 'Escalation Threshold',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 90,
      },
      { name: 'autoEscalate', label: 'Auto-escalate Critical Accounts', type: 'toggle', default: true },
      {
        name: 'reviewPriority',
        label: 'Review Priority',
        type: 'select',
        options: REVIEW_PRIORITY_OPTIONS,
        default: 'medium',
      },
    ],
  },
  insight: {
    id: 'wgt_insight',
    title: 'Narrative Summary',
    body: 'Flagged-account volume is up 12.4% week-over-week, concentrated in the Institutional segment. Critical accounts (score 90+) grew to 996, keeping pace with the broader increase rather than accelerating independently — current review capacity should still absorb the backlog if the escalation queue stays clear this week.',
    tone: 'warning',
  },
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
  form: {
    id: 'wgt_form',
    title: 'Compliance Parameters',
    fields: [
      { name: 'reviewThreshold', label: 'Case Review Threshold', type: 'slider', min: 0, max: 100, step: 1, default: 65 },
      {
        name: 'escalationThreshold',
        label: 'Case Escalation Threshold',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 85,
      },
      { name: 'autoEscalate', label: 'Auto-escalate Confirmed Violations', type: 'toggle', default: true },
      {
        name: 'reviewPriority',
        label: 'Case Priority',
        type: 'select',
        options: REVIEW_PRIORITY_OPTIONS,
        default: 'high',
      },
    ],
  },
  insight: {
    id: 'wgt_insight',
    title: 'Narrative Summary',
    body: 'AML alert volume is up 9.5% week-over-week with 573 alerts still pending triage — the fastest-growing input to the open-case count. Average audit cycle time continues to improve (down 8.4%), suggesting the backlog is a triage bottleneck rather than a downstream review-capacity problem.',
    tone: 'error',
  },
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
  form: {
    id: 'wgt_form',
    title: 'Portfolio Parameters',
    fields: [
      { name: 'reviewThreshold', label: 'Trend Review Threshold', type: 'slider', min: 0, max: 100, step: 1, default: 55 },
      {
        name: 'escalationThreshold',
        label: 'Trend Escalation Threshold',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 80,
      },
      { name: 'autoEscalate', label: 'Auto-escalate Deteriorating Accounts', type: 'toggle', default: false },
      {
        name: 'reviewPriority',
        label: 'Review Priority',
        type: 'select',
        options: REVIEW_PRIORITY_OPTIONS,
        default: 'low',
      },
    ],
  },
  insight: {
    id: 'wgt_insight',
    title: 'Narrative Summary',
    body: 'Portfolio value at risk continues to decline (-1.8%), and improving accounts (341) now outnumber deteriorating ones (189) by a wide margin. The 30-day trend score is essentially flat, so this reads as steady, broad-based improvement rather than a shift being driven by a small number of large accounts.',
    tone: 'success',
  },
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
