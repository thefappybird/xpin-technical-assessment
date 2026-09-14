// POST /api/generate-dashboard — accepts { prompt }, returns one full
// DashboardResponse. No streaming (see the frozen contract) — artificial
// latency is added below so the frontend's initial loading skeleton is
// actually exercised instead of resolving instantly.

import { Router } from 'express'
import { generateDashboard } from '../data/dashboard-builder.js'
import { ApiError } from '../middleware/error-handler.js'
import type { DashboardResponse, GenerateDashboardRequest } from '../types/dashboard.js'

const router = Router()

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

router.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<GenerateDashboardRequest> | undefined
    const prompt = body?.prompt

    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new ApiError(400, 'INVALID_PROMPT', 'Request body must include a non-empty "prompt" string.')
    }

    await delay(randomBetween(400, 700))

    const dashboard: DashboardResponse = generateDashboard(prompt)
    res.json(dashboard)
  } catch (err) {
    next(err)
  }
})

export default router
