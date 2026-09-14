// Single place that produces the contract's { error: { code, message } }
// shape (see ApiErrorResponse in types/dashboard.ts) for every thrown or
// validation error, so routes never hand-roll error JSON themselves.

import type { NextFunction, Request, Response } from 'express'
import type { ApiErrorResponse } from '../types/dashboard.js'

/** Throw this from a route (or call `next(new ApiError(...))`) for any
 * expected failure — validation, unknown ids, the deliberate demo failure,
 * etc. Anything else that throws is treated as an unexpected 500. */
export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function isBodyParseError(err: unknown): boolean {
  return err instanceof SyntaxError && 'body' in err
}

// Express identifies error-handling middleware by arity (4 params) — `_next`
// must stay in the signature even though this handler never calls it.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    const body: ApiErrorResponse = { error: { code: err.code, message: err.message } }
    res.status(err.status).json(body)
    return
  }

  if (isBodyParseError(err)) {
    const body: ApiErrorResponse = { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } }
    res.status(400).json(body)
    return
  }

  console.error(err)
  const body: ApiErrorResponse = { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }
  res.status(500).json(body)
}

export function notFoundHandler(_req: Request, res: Response): void {
  const body: ApiErrorResponse = { error: { code: 'NOT_FOUND', message: 'Route not found.' } }
  res.status(404).json(body)
}
