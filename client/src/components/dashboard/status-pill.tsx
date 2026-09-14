import { cn } from '@/lib/utils'

export type PillStatus = 'success' | 'warning' | 'error'

const STATUS_CLASSNAME: Record<PillStatus, string> = {
  success: 'bg-status-success-bg text-status-success-text',
  warning: 'bg-status-warning-bg text-status-warning-text',
  error: 'bg-status-error-bg text-status-error-text',
}

const DOT_CLASSNAME: Record<PillStatus, string> = {
  success: 'bg-status-success-dot',
  warning: 'bg-status-warning-dot',
  error: 'bg-status-error-dot',
}

function isPillStatus(value: unknown): value is PillStatus {
  return value === 'success' || value === 'warning' || value === 'error'
}

interface StatusPillProps {
  status: unknown
  label: string
  className?: string
}

/**
 * DESIGN.md's status pill: a soft-tinted background + solid dot + matching
 * text — never a solid-fill badge (see the Don't rule; High-Contrast mode
 * overrides these tokens to solid fills on purpose, see index.css). Shared
 * across the data table and metric card rather than copy-pasted per widget.
 *
 * Falls back to a plain neutral badge for a status value this widget doesn't
 * recognize — corrupted/unexpected payload data should degrade gracefully,
 * not crash the widget (CLAUDE.md's "Resilience & Grace" pillar).
 */
export function StatusPill({ status, label, className }: StatusPillProps) {
  if (!isPillStatus(status)) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-pill bg-muted px-2.5 py-1 text-[11.5px] font-semibold text-muted-foreground',
          className
        )}
      >
        {label}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill py-1 pr-2.5 pl-2 text-[11.5px] font-semibold',
        STATUS_CLASSNAME[status],
        className
      )}
    >
      <span className={cn('size-1.5 rounded-full', DOT_CLASSNAME[status])} aria-hidden="true" />
      {label}
    </span>
  )
}
