import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiGetAll } from '@/composables/useApi'
import { logSilent } from '@/utils/log'
import type { Concept, ExternalNaming, InternalNaming, PrPackage } from '@brand-constructor/shared/types'

const CACHE_TTL_MS = 30_000

export const useLibrariesStore = defineStore('libraries', () => {
  const concepts = ref<Concept[]>([])
  const externalNamings = ref<ExternalNaming[]>([])
  const internalNamings = ref<InternalNaming[]>([])
  const prPackages = ref<PrPackage[]>([])
  const isLoading = ref(false)
  const fetchedAt = ref<number | null>(null)
  const fetchedForBrandId = ref<string | null>(null)

  function isFresh(brandId: string | null): boolean {
    if (fetchedAt.value === null) return false
    if (fetchedForBrandId.value !== brandId) return false
    return Date.now() - fetchedAt.value < CACHE_TTL_MS
  }

  async function load(brandId: string | null, force = false): Promise<void> {
    if (!force && isFresh(brandId)) return
    isLoading.value = true
    try {
      // Each library WHOLE (H-59). The review, the CEO's screen and the printed
      // brief find a pick by its id in these lists; read as «the newest hundred»
      // they wrote «Назву не обрано» under the 101st name and every older one.
      const qs = brandId ? `?available_for_brand=${brandId}` : ''
      const [c, e, i, p] = await Promise.all([
        apiGetAll<Concept>(`/api/concepts${qs}`),
        apiGetAll<ExternalNaming>(`/api/namings/external${qs}`),
        apiGetAll<InternalNaming>(`/api/namings/internal${qs}`),
        apiGetAll<PrPackage>(`/api/pr-packages${qs}`),
      ])
      concepts.value = c
      externalNamings.value = e
      internalNamings.value = i
      prPackages.value = p
      fetchedAt.value = Date.now()
      fetchedForBrandId.value = brandId
    } catch (err) {
      logSilent('useLibrariesStore/load', err)
    } finally {
      isLoading.value = false
    }
  }

  function invalidate(): void {
    fetchedAt.value = null
  }

  return { concepts, externalNamings, internalNamings, prPackages, isLoading, load, invalidate }
})
