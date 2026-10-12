import { ref, type Ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { handleSessionExpired } from '@/utils/sessionExpiry';
import type { ApiResponse, ApiListResponse, ApiErrorResponse } from '@brand-constructor/shared/types';

const API_BASE = import.meta.env.VITE_API_URL || '';

// HTTP methods that do not require a CSRF token (no side effects).
// TRACE / CONNECT are intentionally excluded — they are never emitted by
// the SPA and would be blocked at the CORS preflight stage anyway.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * What every wizard screen says when the request never reached the server —
 * the same wording the Admin uses (`admin/src/utils/apiErrorText.ts`). The
 * browser's own text differs per engine («Failed to fetch», «Load failed»,
 * «NetworkError when attempting to fetch resource.») and tells the user nothing.
 */
export const NETWORK_ERROR_TEXT = 'Немає звʼязку. Перевірте інтернет і спробуйте ще раз.';

/** `fetch` rejects only when no response came back at all, and it does so with a TypeError. */
export function isNetworkFailure(err: unknown): boolean {
  return err instanceof TypeError;
}

/** HTTP status of a failed request, when the server did answer. */
export function apiErrorStatus(err: unknown): number | undefined {
  return err instanceof Error ? (err as Error & { status?: number }).status : undefined;
}

export function getAssetUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('/api')) return `${API_BASE}${url}`;
  return url;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const fullUrl = url.startsWith('/api') ? `${API_BASE}${url}` : url;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Attach the in-memory CSRF token for mutating requests. The token is
  // server-derived (HMAC of the JWT cookie's sub+iat) and only the worker
  // can verify it — see packages/worker/src/middleware/csrf.ts.
  const method = (options.method || 'GET').toUpperCase();
  if (!SAFE_METHODS.has(method)) {
    try {
      const auth = useAuthStore();
      if (auth.csrfToken) headers['X-CSRF-Token'] = auth.csrfToken;
    } catch {
      // Pinia not yet initialised (e.g. the very first request fired during
      // app bootstrap). The worker will reject with 403; the caller's normal
      // error path will trigger a re-login.
    }
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // `credentials: 'include'` is required for the HttpOnly auth cookie to
  // flow on both same-origin (Pages → Pages Function proxy) and direct
  // cross-origin (workers.dev) requests.
  let response: Response;
  try {
    response = await fetch(fullUrl, { ...options, credentials: 'include', headers });
  } catch (err) {
    if (isNetworkFailure(err)) throw new Error(NETWORK_ERROR_TEXT);
    throw err;
  }
  const json = await response.json();

  if (!response.ok) {
    // The session died under us (idle window elapsed, absolute cap reached, or
    // a sign-out in another tab). Hand off to the single-flight expiry handler
    // instead of surfacing "Unauthorized" as an inline field error, and clear
    // the local user so nothing keeps rendering as authenticated meanwhile.
    if (response.status === 401) {
      try {
        useAuthStore().clearSession();
      } catch {
        // Pinia not active (request fired outside a component) — the redirect
        // below still tears the page down.
      }
      handleSessionExpired();
    }
    const errorData = json as ApiErrorResponse;
    throw Object.assign(new Error(errorData.error || `HTTP ${response.status}`), {
      status: response.status,
    });
  }

  return json as T;
}

export function useApi<T>(url: string) {
  const data = ref<T | null>(null) as Ref<T | null>;
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchData(queryParams?: Record<string, string>) {
    loading.value = true;
    error.value = null;

    try {
      const queryString = queryParams ? '?' + new URLSearchParams(queryParams).toString() : '';
      const result = await request<ApiResponse<T>>(`${url}${queryString}`);
      data.value = result.data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading.value = false;
    }
  }

  return { data, loading, error, fetchData };
}

export function useApiList<T>(url: string) {
  const data = ref<T[]>([]) as Ref<T[]>;
  const loading = ref(false);
  const error = ref<string | null>(null);
  const total = ref(0);
  const page = ref(1);
  const perPage = ref(20);

  async function fetchData(queryParams?: Record<string, string>) {
    loading.value = true;
    error.value = null;

    try {
      // `per_page` — from the params or from `perPage` — is the size of one
      // request, not of the list: the list is read to its end (`apiGetAll`).
      // A pick list that stopped at its first page hid the oldest rows from
      // the person choosing; `page` is not honoured, there is nothing to page.
      const { per_page: asked, page: _page, ...filters } = queryParams ?? {};
      const pageSize = parseInt(asked ?? '') || perPage.value;
      const queryString = new URLSearchParams(filters).toString();
      data.value = await apiGetAll<T>(queryString ? `${url}?${queryString}` : url, pageSize);
      total.value = data.value.length;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading.value = false;
    }
  }

  return { data, loading, error, total, page, perPage, fetchData };
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const result = await request<ApiResponse<T>>(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return result.data;
}

export async function apiPut<T>(url: string, body: unknown): Promise<T> {
  const result = await request<ApiResponse<T>>(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return result.data;
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const result = await request<ApiResponse<T>>(url, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return result.data;
}

export async function apiDelete(url: string): Promise<void> {
  await request(url, { method: 'DELETE' });
}

export async function apiGet<T>(url: string): Promise<T> {
  const result = await request<ApiResponse<T>>(url);
  return result.data;
}

/** A list endpoint's page together with its `total` — for callers that page through it. */
export async function apiGetList<T>(url: string): Promise<ApiListResponse<T>> {
  return request<ApiListResponse<T>>(url);
}

/** Rows asked for per request when a list is read whole. The server allows 100 on every list. */
export const LIST_PAGE_SIZE = 100;

/** A list that long is not a list any more; the walk stops rather than spin on a route that misreports itself. */
const LIST_MAX_REQUESTS = 200;

/**
 * A list route read to its END, page after page.
 *
 * H-59 (12.10.2026): Final review looked a picked name up in a library it had
 * read with `per_page=100`. The library is ordered newest first, so the 101st
 * free name and every older one were «not picked» for that screen — «Назву не
 * обрано» under a name the brief had saved. The same ceiling stood in every
 * pick list as a 50 or a 100. The owner: «Такого вообще никаких условий не
 * должно быть».
 *
 * So the number passed here is how much to ask for at once, never how much to
 * show. The walk ends on the server's `total`; a ceiling lower than `pageSize`
 * therefore costs requests, not rows. Three guards keep it finite on a route
 * that does not behave like the rest:
 *  - an empty page ends it, even if `total` says there is more;
 *  - a route with no `total` (`/api/pr-packages` answers with everything and
 *    ignores `page`) ends on the first short page;
 *  - rows are told apart by `id`, so such a route with more rows than a page
 *    ends on the first page that brings nothing new, and nothing is doubled.
 */
export async function apiGetAll<T>(url: string, pageSize: number = LIST_PAGE_SIZE): Promise<T[]> {
  const [path, query = ''] = url.split('?');
  const all: T[] = [];
  const seen = new Set<unknown>();

  for (let page = 1; page <= LIST_MAX_REQUESTS; page++) {
    const params = new URLSearchParams(query);
    params.set('page', String(page));
    params.set('per_page', String(pageSize));
    const result = await apiGetList<T>(`${path}?${params.toString()}`);
    const rows = result.data ?? [];

    const fresh = rows.filter(row => {
      const id = (row as { id?: unknown } | null)?.id;
      if (id === undefined) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    all.push(...fresh);

    if (rows.length === 0 || fresh.length === 0) break;
    if (typeof result.total === 'number') {
      if (all.length >= result.total) break;
    } else if (rows.length < pageSize) {
      break;
    }
  }

  return all;
}
