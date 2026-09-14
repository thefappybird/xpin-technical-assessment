import { memo, useCallback, useState } from 'react'

import { WidgetDragHandle } from '@/components/dashboard/widget-drag-handle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { useWidgetAction } from '@/hooks/use-widget-action'
import type { WidgetComponentProps } from '@/lib/widget-registry'
import { useActiveHistoryId } from '@/stores/dashboard-store'
import type {
  DynamicFormField,
  DynamicFormSubmitPayload,
  DynamicFormWidget as DynamicFormWidgetType,
} from '@/types/dashboard'

type FormValues = Record<string, string | number | boolean>

function valueAsNumber(values: FormValues, name: string, fallback: number): number {
  const value = values[name]
  return typeof value === 'number' ? value : fallback
}

function valueAsBoolean(values: FormValues, name: string, fallback: boolean): boolean {
  const value = values[name]
  return typeof value === 'boolean' ? value : fallback
}

function valueAsString(values: FormValues, name: string, fallback: string): string {
  const value = values[name]
  return typeof value === 'string' ? value : fallback
}

/**
 * Cross-field rule enforced both here (instant feedback, disables Submit) and
 * server-side (defense in depth — see server/src/routes/widget-action.ts) —
 * the concrete "dynamic form validation" the brief asks for: a constraint
 * that depends on another field's current value, not just a static
 * min/max/required check the controls already enforce by construction.
 */
function validate(values: FormValues): string | null {
  if ('reviewThreshold' in values && 'escalationThreshold' in values) {
    const review = valueAsNumber(values, 'reviewThreshold', 0)
    const escalation = valueAsNumber(values, 'escalationThreshold', 0)
    if (escalation < review) {
      return 'Escalation threshold must be greater than or equal to the review threshold.'
    }
  }
  return null
}

function FormField({
  field,
  values,
  onChange,
}: {
  field: DynamicFormField
  values: FormValues
  onChange: (name: string, value: string | number | boolean) => void
}) {
  const fieldId = `dynamic-form-field-${field.name}`

  if (field.type === 'slider') {
    const value = valueAsNumber(values, field.name, field.default)
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor={fieldId} className="text-sm text-foreground">
            {field.label}
          </label>
          <span className="font-mono text-xs text-muted-foreground">{value}</span>
        </div>
        <Slider
          id={fieldId}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={[value]}
          onValueChange={([next]) => next !== undefined && onChange(field.name, next)}
        />
      </div>
    )
  }

  if (field.type === 'toggle') {
    const value = valueAsBoolean(values, field.name, field.default)
    return (
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={fieldId} className="text-sm text-foreground">
          {field.label}
        </label>
        <Switch id={fieldId} checked={value} onCheckedChange={(next) => onChange(field.name, next)} />
      </div>
    )
  }

  const value = valueAsString(values, field.name, field.default)
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-sm text-foreground">
        {field.label}
      </label>
      <Select value={value} onValueChange={(next) => onChange(field.name, next)}>
        <SelectTrigger id={fieldId} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {field.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * `DYNAMIC_FORM` — DESIGN.md's "Review Parameters" card: one Submit button
 * in the footer (no per-field auto-submit), Slider/Toggle/Select controls
 * per field `type`. Field edits are DRAFT-only local state until Submit —
 * only then does the optimistic `useWidgetAction` call apply them to the
 * store, matching the `'form/submit'` action's single-payload contract.
 *
 * The draft resets to the widget's last-confirmed `values` on a genuine
 * investigation swap, but NOT on a submit/rollback of the SAME investigation
 * (an error rollback should leave the user's attempted edits on screen, not
 * silently discard them) — `activeHistoryId` is the one signal that tells
 * the two apart (widget ids are stable across scenario templates, so
 * `widget.id` alone can't). Adjusting state directly during render (not in
 * an effect) is the documented React pattern for this — "Storing
 * information from previous renders" in the React docs.
 */
function DynamicFormWidgetImpl({ widget }: WidgetComponentProps) {
  const form = widget as DynamicFormWidgetType
  const activeHistoryId = useActiveHistoryId()

  const [draft, setDraft] = useState<FormValues>(() => ({ ...form.data.values }))
  const [lastAppliedAt, setLastAppliedAt] = useState<number | null>(null)
  const [syncedHistoryId, setSyncedHistoryId] = useState(activeHistoryId)
  if (activeHistoryId !== syncedHistoryId) {
    setSyncedHistoryId(activeHistoryId)
    setDraft({ ...form.data.values })
    setLastAppliedAt(null)
  }

  const submit = useWidgetAction({
    optimisticUpdate: (current) =>
      current.type === 'DYNAMIC_FORM' ? { ...current, data: { ...current.data, values: draft } } : current,
    successMessage: 'Parameters applied.',
  })

  const handleFieldChange = useCallback((name: string, value: string | number | boolean) => {
    setDraft((current) => ({ ...current, [name]: value }))
  }, [])

  const validationError = validate(draft)

  const handleSubmit = useCallback(() => {
    if (validate(draft)) return
    const payload: DynamicFormSubmitPayload = { values: draft }
    submit.mutate(
      { widgetId: form.id, action: 'form/submit', payload },
      { onSuccess: () => setLastAppliedAt(Date.now()) }
    )
  }, [draft, form.id, submit])

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-2">
        <WidgetDragHandle />
        <CardTitle>{form.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {form.data.fields.map((field) => (
          <FormField key={field.name} field={field} values={draft} onChange={handleFieldChange} />
        ))}
        {validationError ? (
          <p role="alert" className="text-xs text-destructive">
            {validationError}
          </p>
        ) : lastAppliedAt ? (
          <p className="font-mono text-xs text-muted-foreground">
            Applied {new Date(lastAppliedAt).toLocaleTimeString()}
          </p>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          className="w-full"
          disabled={Boolean(validationError) || submit.isPending}
          onClick={handleSubmit}
        >
          {submit.isPending ? 'Applying…' : 'Apply parameters'}
        </Button>
      </CardFooter>
    </Card>
  )
}

// Memoized: the registry renders N widgets from a schema array, so a change
// to one widget shouldn't re-render its siblings.
export default memo(DynamicFormWidgetImpl)
