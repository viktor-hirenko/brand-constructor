import { ref, computed, onMounted } from 'vue'
import type { BrandListItem } from '@brand-constructor/shared/types'
import { apiGet } from '@/composables/useApi'

export function useLandingDrafts(isEnabled: () => boolean) {
  const drafts = ref<BrandListItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const latestDraft = computed(() => drafts.value[0] ?? null)
  const hasDrafts = computed(() => drafts.value.length > 0)
  const hasMultipleDrafts = computed(() => drafts.value.length > 1)

  async function fetchDrafts() {
    if (!isEnabled()) {
      drafts.value = []
      return
    }

    loading.value = true
    error.value = null

    try {
      const params = new URLSearchParams({
        page: '1',
        per_page: '20',
        status: 'draft',
      })
      drafts.value = await apiGet<BrandListItem[]>(`/api/brands?${params.toString()}`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load drafts'
      drafts.value = []
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    void fetchDrafts()
  })

  return {
    drafts,
    loading,
    error,
    latestDraft,
    hasDrafts,
    hasMultipleDrafts,
    fetchDrafts,
  }
}
