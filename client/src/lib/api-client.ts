import axios, { type AxiosError } from 'axios'

import type {
  DashboardResponse,
  GenerateDashboardRequest,
  WidgetActionRequest,
  WidgetActionResponse,
  ApiErrorResponse,
} from '@/types/dashboard'

/** Thrown by every failed request — the one error shape the UI/toast layer handles. */
export class ApiError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const payload = error.response?.data?.error
    if (payload) {
      return Promise.reject(new ApiError(payload.code, payload.message))
    }
    return Promise.reject(
      new ApiError('NETWORK_ERROR', error.message || 'Something went wrong. Please try again.')
    )
  }
)

export async function generateDashboard(prompt: string): Promise<DashboardResponse> {
  const body: GenerateDashboardRequest = { prompt }
  const { data } = await apiClient.post<DashboardResponse>('/generate-dashboard', body)
  return data
}

export async function postWidgetAction(
  req: WidgetActionRequest
): Promise<WidgetActionResponse> {
  const { data } = await apiClient.post<WidgetActionResponse>('/widget-action', req)
  return data
}
