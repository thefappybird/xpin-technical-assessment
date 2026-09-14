export interface PresetInvestigation {
  id: string
  title: string
  prompt: string
}

/**
 * Named sample investigations seeded into the history rail on first visit
 * (mirrors the reference mockup's pre-populated history list) — see
 * `dashboard-store.ts`'s `seedPresets`. Only the first is auto-generated on
 * load (`App.tsx`); the rest sit as unfetched "blank" entries until clicked,
 * at which point they run for real through `useGenerateDashboard`.
 */
export const PRESET_INVESTIGATIONS: PresetInvestigation[] = [
  {
    id: 'preset-risk-review',
    title: 'High-Risk Account Review',
    prompt: 'Which accounts are high-risk and need review?',
  },
  {
    id: 'preset-compliance',
    title: 'Compliance & AML Backlog',
    prompt: 'Show me open compliance and AML cases',
  },
  {
    id: 'preset-performance',
    title: 'Portfolio Performance Trend',
    prompt: 'How is portfolio performance trending this quarter?',
  },
  {
    id: 'preset-audit',
    title: 'Quarterly Audit Cycle',
    prompt: 'Give me the quarterly compliance audit overview',
  },
]
