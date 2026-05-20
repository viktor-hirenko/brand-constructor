<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConstructorStore, CEO_RESELECT_EXTERNAL_NAMING_LIMIT } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type { ExternalNaming } from '@brand-constructor/shared/types'
import ExternalNamingGrid from '@/components/constructor/ceo-reselect/ExternalNamingGrid.vue'
import CustomerNamingsRow from '@/components/constructor/ceo-reselect/CustomerNamingsRow.vue'
import CeoReselectFooter from '@/components/constructor/ceo-reselect/CeoReselectFooter.vue'
import StepCommentField from '@/components/constructor/StepCommentField.vue'

const store = useConstructorStore()
const route = useRoute()
const router = useRouter()

const brandId = computed(() => route.params.id as string)

const isChainedFromConcept = computed(
  () => route.name === 'ceo-reselect-concept-external-naming'
)

const {
  data: namings,
  loading,
  error,
  fetchData,
  perPage,
} = useApiList<ExternalNaming>('/api/namings/external')

/**
 * In chained mode CEO just picked a concept — filter namings by that concept.
 * In standalone mode we load ALL active namings (no concept filter) so that:
 *   – PO's picks (from their concept) are found in the list → poExternalMini populates,
 *   – CEO's previously saved picks (possibly from a different concept) are also found → checkmarks render.
 */
const conceptIdForNamings = computed(() =>
  isChainedFromConcept.value
    ? (store.ceoReselectDraft.conceptId ?? null)
    : null,
)

interface ExternalNamingMini {
  id: string
  name: string
  domain?: string
  price?: number | null
}

const poExternalMini = computed<ExternalNamingMini[]>(() =>
  (store.stepData.externalNaming.selectedIds ?? [])
    .map(id => namings.value.find(n => n.id === id))
    .filter((n): n is ExternalNaming => n != null)
    .map(n => ({
      id: n.id,
      name: n.name,
      domain: (n as ExternalNaming & { domain?: string }).domain,
      price: n.price ?? null,
    }))
)

const stagedExternalIds = computed(() => store.ceoReselectDraft.externalNamingIds)

/** PO's selected IDs — excluded from the available grid in standalone mode. */
const poSelectedIds = computed(() => store.stepData.externalNaming.selectedIds ?? [])

/** Hide PO's picks from the CEO grid (they are shown in the "Вибір замовника" section above). */
const excludedFromGrid = computed(() =>
  isChainedFromConcept.value ? [] : poSelectedIds.value,
)

const primaryDisabled = computed(() => stagedExternalIds.value.length === 0)

async function loadNamings() {
  perPage.value = 100
  const params: Record<string, string> = { status: 'active' }
  const cid = conceptIdForNamings.value
  if (cid) {
    params.concept_id = cid
  }
  if (store.brandId) {
    params.available_for_brand = store.brandId
  }
  await fetchData(params)
}

onMounted(async () => {
  if (isChainedFromConcept.value) {
    store.seedCeoReselectExternalNamingChained()
  } else {
    store.seedCeoReselectFromBrand('externalNaming')
    // Strip any PO-picks from the CEO draft — they are shown above and must not occupy CEO slots.
    const poIdSet = new Set(store.stepData.externalNaming.selectedIds ?? [])
    const filteredIds = store.ceoReselectDraft.externalNamingIds.filter(id => !poIdSet.has(id))
    store.setCeoReselectExternalNamingIds(filteredIds)
  }
  await loadNamings()
})

watch(conceptIdForNamings, () => {
  loadNamings()
})

function handleToggle(id: string) {
  store.toggleCeoReselectExternalNaming(id)
}

function goCancel() {
  if (isChainedFromConcept.value) {
    router.push(`/constructor/brand/${brandId.value}/ceo-reselect/concept`)
    return
  }
  router.push(`/constructor/brand/${brandId.value}`)
}

async function goSave() {
  const ext = stagedExternalIds.value
  if (ext.length === 0) return

  const payload: Record<string, string | string[]> = {}
  if (isChainedFromConcept.value) {
    const c = store.ceoReselectDraft.conceptId
    if (c) payload.concept = c
  }
  payload.externalNaming = [...ext]

  const ok = await store.saveCeoSelections(payload)
  if (ok) {
    router.push(`/constructor/brand/${brandId.value}`)
  }
}

const cancelLabel = computed(() => (isChainedFromConcept.value ? 'Назад' : 'Скасувати'))

const externalComment = computed({
  get: () => store.brandCeoComments?.externalNaming?.value ?? '',
  set: (value: string) => store.setCeoCommentValue('externalNaming', value),
})
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <div class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-6 pr-2 pb-4">
      <div>
        <h1 class="text-2xl font-medium text-[#0a0a0a] tracking-[0.0703px] mb-2 leading-8">
          External Naming
        </h1>
        <p class="text-[16px] leading-6 text-[#717182] tracking-[-0.3125px]">
          Оберіть до {{ CEO_RESELECT_EXTERNAL_NAMING_LIMIT }}-х назв, що пройдуть перевірку
          юристами на можливі ризики.
        </p>
      </div>

      <!-- Loader covers the whole body (customer row + grid) while API is in-flight -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>

      <div v-else-if="error" class="text-center py-12 text-red-500">
        <p class="mb-3">{{ error }}</p>
        <button type="button" class="text-primary underline text-sm" @click="loadNamings">
          Спробувати знову
        </button>
      </div>

      <template v-else>
        <template v-if="!isChainedFromConcept">
          <CustomerNamingsRow :namings="poExternalMini" />
        </template>

        <div
          class="h-px w-full max-w-[506px] shrink-0 bg-[rgba(0,0,0,0.1)]"
          aria-hidden="true"
        />

        <div class="flex flex-col gap-3">
          <p class="text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">
            Варіанти назв для обраного концепту
          </p>
          <ExternalNamingGrid
            :namings="namings"
            :selected-ids="stagedExternalIds"
            :exclude-ids="excludedFromGrid"
            :max-selectable="CEO_RESELECT_EXTERNAL_NAMING_LIMIT"
            @toggle="handleToggle"
          />
        </div>
      </template>

      <StepCommentField
        v-model="externalComment"
        label="Коментар СЕО"
        placeholder="Додайте коментар СЕО..."
      />

      <p v-if="store.saveCeoSelectionsError" class="text-sm text-red-600">
        {{ store.saveCeoSelectionsError }}
      </p>
    </div>

    <CeoReselectFooter
      :cancel-label="cancelLabel"
      primary-label="Зберегти"
      :primary-disabled="primaryDisabled"
      @cancel="goCancel"
      @primary="goSave"
    />
  </div>
</template>
