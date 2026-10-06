import { ref, computed, onMounted } from 'vue'
import type { BrandListItem } from '@brand-constructor/shared/types'
import { apiGetList } from '@/composables/useApi'

/**
 * Drafts asked for per request. «Список чернеток» lists ALL of the author's
 * drafts: it used to ask for one page of 20, and the older ones could not be
 * opened from the wizard at all (H-36, run 02.10: T-012 — 111 drafts on the
 * stand). `GET /api/brands` sets no ceiling on `per_page`, but the loop below
 * stops on the server's `total`, not on this number, so a ceiling added later
 * costs extra requests rather than lost drafts.
 */
export const LANDING_DRAFTS_PAGE_SIZE = 100

async function fetchAllDrafts(): Promise<BrandListItem[]> {
  const all: BrandListItem[] = []
  for (let page = 1; ; page++) {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(LANDING_DRAFTS_PAGE_SIZE),
      status: 'draft',
    })
    const result = await apiGetList<BrandListItem>(`/api/brands?${params.toString()}`)
    all.push(...result.data)
    // An empty page ends it too — a `total` that moved under us must not loop forever.
    if (result.data.length === 0 || all.length >= result.total) return all
  }
}

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
      drafts.value = await fetchAllDrafts()
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
