import { AlertTriangleIcon, RotateCcwIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface WidgetErrorFallbackProps {
  error: Error
  onRetry: () => void
}

/** Scoped, per-widget error fallback — one bad widget's payload/render error never takes down the rest of the workspace. */
export function WidgetErrorFallback({ error, onRetry }: WidgetErrorFallbackProps) {
  return (
    <Card className="h-full border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangleIcon className="size-4" />
          Widget failed to load
        </CardTitle>
        <CardDescription>
          {error.message || 'An unexpected error occurred while rendering this widget.'}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
          <RotateCcwIcon data-icon="inline-start" />
          Retry
        </Button>
      </CardFooter>
    </Card>
  )
}
