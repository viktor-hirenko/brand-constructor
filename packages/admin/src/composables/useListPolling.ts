import { onMounted, onUnmounted, unref, type Ref } from 'vue'
import { ADMIN_LIST_POLL_INTERVAL_MS } from '@/constants/polling'

export interface UseListPollingOptions {
  intervalMs?: number
  /** When true, interval and visibility refetch are skipped */
  paused?: Ref<boolean>
  refetchOnVisible?: boolean
}

/**
 * Periodically refetches list/detail data and refetches when the browser tab becomes visible.
 * Cleans up on component unmount (no polling on inactive routes).
 */
export function useListPolling(
  refresh: () => void | Promise<void>,
  options?: UseListPollingOptions
): { refreshNow: () => void } {
  const intervalMs = options?.intervalMs ?? ADMIN_LIST_POLL_INTERVAL_MS
  const refetchOnVisible = options?.refetchOnVisible ?? true
  let intervalId: ReturnType<typeof setInterval> | null = null
  let inFlight = false

  function isPaused(): boolean {
    return options?.paused ? unref(options.paused) : false
  }

  async function runRefresh(): Promise<void> {
    if (inFlight || isPaused()) return
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return

    inFlight = true
    try {
      await refresh()
    } finally {
      inFlight = false
    }
  }

  function refreshNow(): void {
    void runRefresh()
  }

  function onVisibilityChange(): void {
    if (!refetchOnVisible) return
    if (document.visibilityState === 'visible') {
      void runRefresh()
    }
  }

  onMounted(() => {
    intervalId = setInterval(() => {
      void runRefresh()
    }, intervalMs)

    if (refetchOnVisible && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
  })

  onUnmounted(() => {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  })

  return { refreshNow }
}
