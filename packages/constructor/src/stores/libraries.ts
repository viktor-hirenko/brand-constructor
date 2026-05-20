import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiGet } from '@/composables/useApi'
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
      const qs = `?per_page=100${brandId ? `&available_for_brand=${brandId}` : ''}`
      const [c, e, i, p] = await Promise.all([
        apiGet<Concept[]>(`/api/concepts${qs}`),
        apiGet<ExternalNaming[]>(`/api/namings/external${qs}`),
        apiGet<InternalNaming[]>(`/api/namings/internal${qs}`),
        apiGet<PrPackage[]>(`/api/pr-packages${qs}`),
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
