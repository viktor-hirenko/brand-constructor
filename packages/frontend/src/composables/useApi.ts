import { ref, type Ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { ApiResponse, ApiListResponse, ApiErrorResponse } from '@brand-constructor/shared'

const API_BASE = import.meta.env.VITE_API_URL || ''

// F-05: HTTP methods that do not require a CSRF token (no side effects).
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function getAssetUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('/api')) return `${API_BASE}${url}`
  return url
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const fullUrl = url.startsWith('/api') ? `${API_BASE}${url}` : url
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }

  // F-05: attach the in-memory CSRF token for mutating requests — see
  // packages/constructor/src/composables/useApi.ts for the rationale.
  const method = (options.method || 'GET').toUpperCase()
  if (!SAFE_METHODS.has(method)) {
    try {
      const auth = useAuthStore()
      if (auth.csrfToken) headers['X-CSRF-Token'] = auth.csrfToken
    } catch {
      // Pinia not yet initialised — worker will reject with 403.
    }
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  // F-05: include credentials so the HttpOnly auth cookie flows on every
  // API request.
  const response = await fetch(fullUrl, { ...options, credentials: 'include', headers })
  const json = await response.json()

  if (!response.ok) {
    const errorData = json as ApiErrorResponse
    throw new Error(errorData.error || `HTTP ${response.status}`)
  }

  return json as T
}

export function useApi<T>(url: string) {
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchData(queryParams?: Record<string, string>) {
    loading.value = true
    error.value = null

    try {
      const queryString = queryParams ? '?' + new URLSearchParams(queryParams).toString() : ''
      const result = await request<ApiResponse<T>>(`${url}${queryString}`)
      data.value = result.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, fetchData }
}

export function useApiList<T>(url: string) {
  const data = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)
  const error = ref<string | null>(null)
  const total = ref(0)
  const page = ref(1)
  const perPage = ref(20)

  async function fetchData(queryParams?: Record<string, string>) {
    loading.value = true
    error.value = null

    try {
      const params = {
        page: String(page.value),
        per_page: String(perPage.value),
        ...queryParams,
      }
      const queryString = '?' + new URLSearchParams(params).toString()
      const result = await request<ApiListResponse<T>>(`${url}${queryString}`)
      data.value = result.data
      total.value = result.total
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, total, page, perPage, fetchData }
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const result = await request<ApiResponse<T>>(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return result.data
}

export async function apiPut<T>(url: string, body: unknown): Promise<T> {
  const result = await request<ApiResponse<T>>(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  return result.data
}

export async function apiDelete(url: string): Promise<void> {
  await request(url, { method: 'DELETE' })
}

export async function apiUpload<T>(url: string, formData: FormData): Promise<T> {
  const result = await request<ApiResponse<T>>(url, {
    method: 'POST',
    body: formData,
  })
  return result.data
}

export async function apiGet<T>(url: string): Promise<T> {
  const result = await request<ApiResponse<T>>(url)
  return result.data
}
