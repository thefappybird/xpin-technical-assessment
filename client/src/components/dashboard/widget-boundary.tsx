import { Component, Suspense } from 'react'
import type { ReactNode } from 'react'

import { WidgetErrorFallback } from '@/components/dashboard/widget-error-fallback'
import { WidgetSkeleton } from '@/components/dashboard/widget-skeleton'
import type { WidgetType } from '@/types/dashboard'

interface WidgetErrorBoundaryProps {
  children: ReactNode
  /** Remounts the subtree so a retry actually re-attempts the failed render/lazy-import. */
  resetKey: unknown
}

interface WidgetErrorBoundaryState {
  error: Error | null
  resetKey: unknown
}

/**
 * Module-scope error boundary — never defined inside another component.
 * Catches a broken widget's render/payload error without taking down the
 * rest of the workspace (CLAUDE.md's "Resilience & Grace" pillar).
 *
 * Auto-reset on a `resetKey` change is derived during render via
 * `getDerivedStateFromProps` rather than synced from `componentDidUpdate` —
 * the same "derive, don't sync" rule CLAUDE.md applies to function
 * components' effects also applies here to avoid a same-render setState loop.
 */
class WidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
  state: WidgetErrorBoundaryState = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error: Error): Partial<WidgetErrorBoundaryState> {
    return { error }
  }

  static getDerivedStateFromProps(
    props: WidgetErrorBoundaryProps,
    state: WidgetErrorBoundaryState
  ): Partial<WidgetErrorBoundaryState> | null {
    if (props.resetKey !== state.resetKey) {
      return { error: null, resetKey: props.resetKey }
    }
    return null
  }

  handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return <WidgetErrorFallback error={this.state.error} onRetry={this.handleRetry} />
    }
    return this.props.children
  }
}

interface WidgetBoundaryProps {
  /** Used to pick a size-appropriate Suspense skeleton (CLS requirement). */
  type: WidgetType
  /** Included in the boundary's reset key so a different widget gets a fresh boundary. */
  widgetId: string
  children: ReactNode
}

/**
 * ONE shared error boundary + Suspense wrapper, applied generically by the
 * registry's render loop around every widget — never copy-pasted per widget
 * type (CLAUDE.md's DRY rule). Unknown/missing schema types are handled
 * separately by `UnknownWidgetFallback` before a widget ever reaches this
 * boundary; this only catches genuine render-time crashes and lazy-import
 * failures.
 */
export function WidgetBoundary({ type, widgetId, children }: WidgetBoundaryProps) {
  return (
    <WidgetErrorBoundary resetKey={widgetId}>
      <Suspense fallback={<WidgetSkeleton type={type} />}>{children}</Suspense>
    </WidgetErrorBoundary>
  )
}
