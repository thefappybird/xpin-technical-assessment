// 100-row fictional account master dataset, generated once at module load
// and held in memory for the life of the process. This is the single source
// the DATA_TABLE widget and its table/query action page/sort/filter over
// (see table-query.ts). Deliberately seeded so the dataset is stable across
// server restarts (nicer for demoing), but reads as organically varied.

export type Segment = 'Retail' | 'Commercial' | 'Institutional'
export type AccountStatus = 'success' | 'warning' | 'error'

export interface Account {
  id: string
  accountName: string
  segment: Segment
  riskScore: number
  status: AccountStatus
  lastReviewed: string
  flaggedReason: string
}

// Small deterministic PRNG (mulberry32) so the 100 rows are reproducible
// across restarts without needing a stored dataset file.
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(0x51a6_e1f0)

function pick<T>(arr: readonly T[]): T {
  const item = arr[Math.floor(rand() * arr.length)]
  if (item === undefined) throw new Error('pick() called on empty array')
  return item
}

function randomInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min
}

// Invented company name fragments — deliberately generic/fictional, never
// resembling a real bank or financial institution.
const NAME_PREFIXES = [
  'Northwind', 'Vertex', 'Meridian', 'Cobalt', 'Summit', 'Ashcroft', 'Beacon',
  'Cedarline', 'Highbridge', 'Ironwood', 'Lakeshore', 'Marlow', 'Oakstone',
  'Pinehurst', 'Quarrystone', 'Redwood', 'Silverline', 'Trailhead',
  'Underbrook', 'Wavecrest', 'Amberfield', 'Brightpath', 'Clearwater',
  'Driftwood', 'Elmsworth', 'Fairmont', 'Granville', 'Hollowridge',
  'Ivorygate', 'Juniper Bay', 'Kestrel', 'Longmere', 'Millbrook',
  'Nightingale', 'Orchard Hill', 'Palisade', 'Quiet River', 'Stonebridge',
  'Timberline', 'Westgate',
] as const

const NAME_SUFFIXES = [
  'Trading Co.', 'Holdings LLC', 'Capital Partners', 'Financial Group',
  'Ventures', 'Industries', 'Logistics', 'Consolidated', 'Enterprises',
  'Advisory Group', 'Investments', 'Partners LLC', '& Co.', 'Holdings',
  'Group',
] as const

function makeAccountName(): string {
  return `${pick(NAME_PREFIXES)} ${pick(NAME_SUFFIXES)}`
}

const SEGMENTS: readonly Segment[] = ['Retail', 'Commercial', 'Institutional']

function pickSegment(): Segment {
  // Roughly 45% Retail, 35% Commercial, 20% Institutional.
  const roll = rand()
  if (roll < 0.45) return 'Retail'
  if (roll < 0.8) return 'Commercial'
  return 'Institutional'
}

function computeStatus(riskScore: number): AccountStatus {
  if (riskScore >= 80) return 'error'
  if (riskScore >= 50) return 'warning'
  return 'success'
}

const CRITICAL_REASONS = [
  'Elevated transaction velocity flagged by monitoring',
  'Beneficial ownership documentation incomplete',
  'Sanctions screening match requires manual review',
  'Unusual cross-border transfer pattern detected',
]

const WARNING_REASONS = [
  'Pending periodic KYC refresh',
  'Minor discrepancy in source-of-funds documentation',
  'Dormant account reactivated without review',
  'Risk score trending upward over last quarter',
]

function flagReasonFor(status: AccountStatus): string {
  if (status === 'error') return pick(CRITICAL_REASONS)
  if (status === 'warning') return pick(WARNING_REASONS)
  return ''
}

// "Today" is fixed to the environment's current date so lastReviewed always
// reads as recent relative to the assessment being reviewed.
const NOW = new Date('2026-09-14T00:00:00.000Z')

function randomRecentDate(maxDaysAgo: number): string {
  const daysAgo = randomInt(0, maxDaysAgo)
  const date = new Date(NOW)
  date.setUTCDate(date.getUTCDate() - daysAgo)
  return date.toISOString().slice(0, 10)
}

function generateAccounts(count: number): Account[] {
  return Array.from({ length: count }, (_, index) => {
    const riskScore = randomInt(0, 100)
    const status = computeStatus(riskScore)
    return {
      id: `ACC-${10001 + index}`,
      accountName: makeAccountName(),
      segment: pickSegment(),
      riskScore,
      status,
      lastReviewed: randomRecentDate(180),
      flaggedReason: flagReasonFor(status),
    }
  })
}

/** The 100-row account master dataset. Never mutated in place — treated as read-only. */
export const accounts: readonly Account[] = generateAccounts(100)

export { SEGMENTS }
