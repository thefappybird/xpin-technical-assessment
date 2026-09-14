import { HelpCircleIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface UnknownWidgetFallbackProps {
  type: string
  title?: string
}

/**
 * Distinct from `WidgetErrorFallback`: this is a recognized-but-invalid
 * schema (a `type` string with no registry entry), not a runtime crash — the
 * widget payload parsed fine, it just names something the client doesn't
 * know how to render.
 */
export function UnknownWidgetFallback({ type, title }: UnknownWidgetFallbackProps) {
  return (
    <Card className="h-full border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-muted-foreground">
          <HelpCircleIcon className="size-4" />
          {title ?? 'Unsupported widget'}
        </CardTitle>
        <CardDescription>
          This dashboard included a widget type the client doesn&apos;t recognize.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Badge variant="outline">{type}</Badge>
      </CardContent>
    </Card>
  )
}
