// POST /api/widget-action — the one mutation endpoint for every widget
// interaction. Dispatches on `action`, always returns { widget: <full
// updated Widget> } (full replace, never a patch) per the frozen contract.

import { Router } from 'express'
import { findWidget, replaceWidget } from '../data/dashboard-builder.js'
import { ESCALATE_ITEM_ID } from '../data/scenarios.js'
import { queryAccounts, TABLE_COLUMNS } from '../data/table-query.js'
import { ApiError } from '../middleware/error-handler.js'
import type {
  ActionListWidget,
  ChecklistToggleItemPayload,
  DataTableWidget,
  DynamicFormSubmitPayload,
  DynamicFormWidget,
  TableQueryPayload,
  Widget,
  WidgetActionRequest,
  WidgetActionResponse,
} from '../types/dashboard.js'

const router = Router()

// Deliberate demo behavior: the escalation checklist item fails its very
// first toggle attempt per server process, then succeeds on every retry —
// gives the frontend's optimistic-rollback + toast + retry path something
// reliably demoable without random flakiness.
let escalateItemHasFailedOnce = false

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseTableQueryPayload(payload: unknown): TableQueryPayload {
  if (!isRecord(payload) || typeof payload.page !== 'number') {
    throw new ApiError(400, 'INVALID_PAYLOAD', '"table/query" requires a payload with a numeric "page".')
  }

  let sort: TableQueryPayload['sort'] = null
  const rawSort = payload.sort
  if (
    isRecord(rawSort) &&
    typeof rawSort.key === 'string' &&
    (rawSort.direction === 'asc' || rawSort.direction === 'desc')
  ) {
    sort = { key: rawSort.key, direction: rawSort.direction }
  }

  const filters = isRecord(payload.filters) ? (payload.filters as TableQueryPayload['filters']) : undefined

  return { page: payload.page, sort, filters }
}

function parseChecklistTogglePayload(payload: unknown): ChecklistToggleItemPayload {
  if (!isRecord(payload) || typeof payload.itemId !== 'string') {
    throw new ApiError(400, 'INVALID_PAYLOAD', '"checklist/toggle-item" requires a payload with a string "itemId".')
  }
  return { itemId: payload.itemId }
}

function parseDynamicFormSubmitPayload(payload: unknown): DynamicFormSubmitPayload {
  if (!isRecord(payload) || !isRecord(payload.values)) {
    throw new ApiError(400, 'INVALID_PAYLOAD', '"form/submit" requires a payload with a "values" object.')
  }
  return { values: payload.values as DynamicFormSubmitPayload['values'] }
}

function handleTableQuery(widget: Widget, payload: unknown): DataTableWidget {
  if (widget.type !== 'DATA_TABLE') {
    throw new ApiError(400, 'WIDGET_TYPE_MISMATCH', `Widget "${widget.id}" is not a DATA_TABLE widget.`)
  }
  const query = parseTableQueryPayload(payload)
  const result = queryAccounts(query)
  return {
    ...widget,
    data: {
      columns: TABLE_COLUMNS,
      rows: result.rows,
      pagination: result.pagination,
      sort: result.sort,
      filters: result.filters,
    },
  }
}

function handleChecklistToggle(widget: Widget, payload: unknown): ActionListWidget {
  if (widget.type !== 'ACTION_LIST') {
    throw new ApiError(400, 'WIDGET_TYPE_MISMATCH', `Widget "${widget.id}" is not an ACTION_LIST widget.`)
  }
  const { itemId } = parseChecklistTogglePayload(payload)
  const item = widget.data.items.find((candidate) => candidate.id === itemId)
  if (!item) {
    throw new ApiError(400, 'UNKNOWN_ITEM', `No action-list item "${itemId}" on widget "${widget.id}".`)
  }

  if (itemId === ESCALATE_ITEM_ID && !escalateItemHasFailedOnce) {
    escalateItemHasFailedOnce = true
    throw new ApiError(500, 'ESCALATION_FAILED', 'Failed to escalate accounts to compliance. Please retry.')
  }

  return {
    ...widget,
    data: {
      items: widget.data.items.map((candidate) =>
        candidate.id === itemId ? { ...candidate, done: !candidate.done } : candidate,
      ),
    },
  }
}

/**
 * Server-side counterpart to `dynamic-form-widget.tsx`'s `validate()` —
 * defense in depth, never trust the client. Per-field range/option/type
 * checks against the widget's own field specs, plus the same cross-field
 * "escalation >= review" rule the client enforces before it ever lets the
 * request through (see that file's docstring for why this rule exists at
 * all — the concrete demo of "dynamic" validation).
 */
function validateDynamicFormValues(widget: DynamicFormWidget, values: DynamicFormSubmitPayload['values']): void {
  for (const field of widget.data.fields) {
    const value = values[field.name]
    if (field.type === 'slider') {
      if (typeof value !== 'number' || value < field.min || value > field.max) {
        throw new ApiError(
          400,
          'INVALID_PAYLOAD',
          `"${field.name}" must be a number between ${field.min} and ${field.max}.`,
        )
      }
    } else if (field.type === 'toggle') {
      if (typeof value !== 'boolean') {
        throw new ApiError(400, 'INVALID_PAYLOAD', `"${field.name}" must be a boolean.`)
      }
    } else if (field.type === 'select') {
      if (typeof value !== 'string' || !field.options.some((option) => option.value === value)) {
        throw new ApiError(400, 'INVALID_PAYLOAD', `"${field.name}" must be one of the field's own options.`)
      }
    }
  }

  if (typeof values.reviewThreshold === 'number' && typeof values.escalationThreshold === 'number') {
    if (values.escalationThreshold < values.reviewThreshold) {
      throw new ApiError(
        400,
        'INVALID_PAYLOAD',
        'Escalation threshold must be greater than or equal to the review threshold.',
      )
    }
  }
}

function handleFormSubmit(widget: Widget, payload: unknown): DynamicFormWidget {
  if (widget.type !== 'DYNAMIC_FORM') {
    throw new ApiError(400, 'WIDGET_TYPE_MISMATCH', `Widget "${widget.id}" is not a DYNAMIC_FORM widget.`)
  }
  const { values } = parseDynamicFormSubmitPayload(payload)
  validateDynamicFormValues(widget, values)

  return { ...widget, data: { ...widget.data, values } }
}

router.post('/', (req, res, next) => {
  try {
    const body = req.body as Partial<WidgetActionRequest> | undefined
    const widgetId = body?.widgetId
    const action = body?.action

    if (typeof widgetId !== 'string' || typeof action !== 'string') {
      throw new ApiError(400, 'INVALID_REQUEST', 'Request body must include "widgetId" and "action" strings.')
    }

    const widget = findWidget(widgetId)
    if (!widget) {
      throw new ApiError(400, 'UNKNOWN_WIDGET', `No widget "${widgetId}" in the current dashboard.`)
    }

    let updated: Widget
    switch (action) {
      case 'table/query':
        updated = handleTableQuery(widget, body?.payload)
        break
      case 'checklist/toggle-item':
        updated = handleChecklistToggle(widget, body?.payload)
        break
      case 'form/submit':
        updated = handleFormSubmit(widget, body?.payload)
        break
      default:
        throw new ApiError(400, 'UNKNOWN_ACTION', `Unknown widget action "${action}".`)
    }

    replaceWidget(updated)
    const response: WidgetActionResponse = { widget: updated }
    res.json(response)
  } catch (err) {
    next(err)
  }
})

export default router
