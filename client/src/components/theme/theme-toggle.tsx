import { useTheme } from 'next-themes'
import { ContrastIcon, MoonIcon, SunIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'high-contrast', label: 'HC', icon: ContrastIcon },
] as const

interface ThemeToggleProps {
  className?: string
}

/**
 * Three-way theme control (Dark / Light / High-Contrast) as a segmented
 * toggle group — not a dropdown, since there are only three options and a
 * click-to-open-then-click-again dropdown was an unnecessary extra step for
 * something this small. Backed by `next-themes`' own `theme`/`setTheme`,
 * which toggles `.dark`/`.light`/`.high-contrast` on `<html>`.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  // No hydration-mismatch guard needed: this is a Vite CSR SPA (no
  // server-rendered HTML to mismatch against), so the persisted theme is
  // simply derived during render rather than synced in an effect.
  const { theme, setTheme } = useTheme()
  const current = theme ?? 'dark'

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn('flex items-center gap-0.5 rounded-lg border bg-muted p-0.5', className)}
    >
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
        const isActive = current === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'bg-background text-foreground shadow-resting'
                : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
            )}
          >
            <Icon className="size-3.5" />
          </button>
        )
      })}
    </div>
  )
}
