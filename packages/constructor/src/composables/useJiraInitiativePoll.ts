import { ref, onUnmounted, watch, type Ref } from 'vue'
import type { Brand } from '@brand-constructor/shared/types'
import { apiGet } from '@/composables/useApi'

const POLL_INTERVAL_MS = 2000
const MAX_ATTEMPTS = 15

export function useJiraInitiativePoll(brandId: Ref<string | null>, enabled: Ref<boolean>) {
  const jiraKey = ref<string | null>(null)
  const jiraUrl = ref<string | null>(null)
  const isPending = ref(false)

  let timer: ReturnType<typeof setTimeout> | undefined
  let attempts = 0

  function stopPolling() {
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
    isPending.value = false
  }

  async function pollOnce() {
    const id = brandId.value
    if (!id || !enabled.value) {
      stopPolling()
      return
    }

    try {
      const brand = await apiGet<Brand>(`/api/brands/${id}`)
      if (brand.jiraInitiativeUrl) {
        jiraKey.value = brand.jiraInitiativeKey ?? null
        jiraUrl.value = brand.jiraInitiativeUrl
        stopPolling()
        return
      }
    } catch {
      // Keep polling — Jira may still be creating.
    }

    attempts += 1
    if (attempts >= MAX_ATTEMPTS) {
      stopPolling()
      return
    }

    timer = setTimeout(() => {
      void pollOnce()
    }, POLL_INTERVAL_MS)
  }

  function startPolling() {
    stopPolling()
    jiraKey.value = null
    jiraUrl.value = null
    attempts = 0

    if (!brandId.value || !enabled.value) return

    isPending.value = true
    void pollOnce()
  }

  watch(
    [brandId, enabled],
    () => {
      startPolling()
    },
    { immediate: true }
  )

  onUnmounted(stopPolling)

  return { jiraKey, jiraUrl, isPending }
}
