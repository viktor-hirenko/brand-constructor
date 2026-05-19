<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConstructorStore, CEO_RESELECT_EXTERNAL_NAMING_LIMIT } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type { ExternalNaming } from '@brand-constructor/shared/types'
import ExternalNamingGrid from '@/components/constructor/ceo-reselect/ExternalNamingGrid.vue'
import PoEditFooter from '@/components/constructor/po-edit/PoEditFooter.vue'
import StepCommentField from '@/components/constructor/StepCommentField.vue'

const store = useConstructorStore()
const route = useRoute()
const router = useRouter()

const brandId = computed(() => route.params.id as string)

/**
 * chained    = coming from concept edit (concept was just changed)
 * standalone = editing external naming directly (concept unchanged)
 * post-apply = PO applied CEO variant, now wants to re-edit
 */
const isChained = computed(() => route.name === 'po-edit-concept-external-naming')
const isPostApply = computed(() => route.query.mode === 'post-apply')

const { data: namings, loading, error, fetchData, perPage } = useApiList<ExternalNaming>('/api/namings/external')

interface ExternalNamingMini { id: string; name: string; domain?: string; price?: number | null }

const poExternalMini = computed<ExternalNamingMini[]>(() =>
  (store.stepData.externalNaming.selectedIds ?? [])
    .map(id => namings.value.find(n => n.id === id))
    .filter((n): n is ExternalNaming => n != null)
    .map(n => ({ id: n.id, name: n.name, domain: n.domain ?? undefined, price: n.price ?? null }))
)

const ceoExternalIds = computed<string[]>(() => {
  const val = store.brandCeoSelections?.externalNaming
  return Array.isArray(val) ? val : typeof val === 'string' && val ? [val] : []
})

/** CEO picks resolved from the same API list — rendered with ExternalNamingGrid (same cards as below). */
const ceoNamings = computed(() =>
  namings.value.filter(n => ceoExternalIds.value.includes(n.id)),
)

const isSaving = computed(() => store.isSaving)
const primaryDisabled = computed(() => store.stepData.externalNaming.selectedIds.length === 0)

const comment = computed({
  get: () => store.stepData.externalNaming.comment ?? '',
  set: (val: string) => store.setExternalNaming({ comment: val }),
})

const conceptIdForNamings = computed(() => store.stepData.concept.selectedId)

/**
 * PO's original picks saved on mount (standalone mode).
 * Used to render "Ваш попередній вибір" block and to exclude those IDs from the bottom grid.
 */
const poOriginalPickIds = ref<string[]>([])

const poOriginalNamings = computed(() =>
  namings.value.filter(n => poOriginalPickIds.value.includes(n.id)),
)

function getPendingConceptKey() {
  return `po_edit_pending_concept_${brandId.value}`
}

function restorePendingConceptFromSession() {
  const pending = sessionStorage.getItem(getPendingConceptKey())
  if (pending) {
    store.setConcept({ selectedId: pending, newConceptBrief: null })
  }
}

/**
 * Exclude from the bottom "Інші назви" grid:
 * - chained: CEO picks (shown in "Вибір CEO" block above)
 * - standalone: PO original picks + CEO picks (both shown in dedicated blocks above)
 */
const excludeFromGrid = computed(() => {
  if (isChained.value) return ceoExternalIds.value
  return [...new Set([...poOriginalPickIds.value, ...ceoExternalIds.value])]
})

async function loadNamings() {
  perPage.value = 100
  const params: Record<string, string> = { status: 'active' }
  if (conceptIdForNamings.value) params.concept_id = conceptIdForNamings.value
  if (store.brandId) params.available_for_brand = store.brandId
  await fetchData(params)
}

onMounted(async () => {
  if (isChained.value) {
    // After F5, router reloads brand from API (old saved concept) — restore in-progress pick.
    restorePendingConceptFromSession()
    // Came from concept edit — start with empty selection
    store.setExternalNaming({ selectedIds: [], newNamingBrief: null })
  } else {
    // standalone + post-apply: save PO's current picks before snapshot so we can show them as reference
    poOriginalPickIds.value = [...(store.stepData.externalNaming.selectedIds ?? [])]
    store.beginEditSection('externalNaming', 8)
  }
  await loadNamings()
})

function handleToggle(id: string) {
  store.toggleExternalNaming(id)
}

function goCancel() {
  if (isChained.value) {
    // Restore externalNaming from sessionStorage (saved before goDali cleared it).
    const raw = sessionStorage.getItem(`po_edit_original_external_${brandId.value}`)
    if (raw) {
      try {
        const ids: string[] = JSON.parse(raw)
        store.setExternalNaming({ selectedIds: ids, newNamingBrief: null })
      } catch { /* ignore */ }
    }
    // cancelEditSection restores concept.selectedId back to PO's original.
    store.cancelEditSection()
    router.push(`/constructor/brand/${brandId.value}/po-edit/concept`)
  } else {
    store.cancelEditSection()
    router.push(`/constructor/brand/${brandId.value}`)
  }
}

async function goSave() {
  const saved = await store.saveBrand()
  if (saved) {
    store.commitEditSection()
    // Clear the original-concept session key — edit flow is complete.
    sessionStorage.removeItem(`po_edit_original_concept_${brandId.value}`)
    sessionStorage.removeItem(getPendingConceptKey())
    router.push(`/constructor/brand/${brandId.value}`)
  }
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <div class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-6 pr-2 pb-4">
      <div>
        <h1 class="text-2xl font-medium text-[#0a0a0a] tracking-[0.0703px] mb-2 leading-8">
          External Naming
        </h1>
        <p class="text-[16px] leading-6 text-[#717182] tracking-[-0.3125px]">
          Оберіть до {{ CEO_RESELECT_EXTERNAL_NAMING_LIMIT }}-х назв, що пройдуть перевірку юристами на можливі ризики.
        </p>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
      <div v-else-if="error" class="text-center py-8 text-red-500">
        <p class="mb-2">{{ error }}</p>
        <button type="button" class="text-primary underline text-sm" @click="loadNamings">Спробувати знову</button>
      </div>

      <template v-else>
        <!-- post-apply: show applied names as interactive grid (same cards as below) -->
        <div v-if="isPostApply && poOriginalNamings.length > 0" class="flex flex-col gap-3">
          <p class="text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">Обрані назви</p>
          <ExternalNamingGrid
            :namings="poOriginalNamings"
            :selected-ids="store.stepData.externalNaming.selectedIds"
            :max-selectable="CEO_RESELECT_EXTERNAL_NAMING_LIMIT"
            @toggle="handleToggle"
          />
        </div>

        <!-- standalone: PO's previous picks as interactive grid (top, above CEO) -->
        <div v-else-if="!isChained && !isPostApply && poOriginalNamings.length > 0" class="flex flex-col gap-3">
          <p class="text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">Ваш попередній вибір</p>
          <ExternalNamingGrid
            :namings="poOriginalNamings"
            :selected-ids="store.stepData.externalNaming.selectedIds"
            :max-selectable="CEO_RESELECT_EXTERNAL_NAMING_LIMIT"
            @toggle="handleToggle"
          />
        </div>

        <!-- CEO pick -->
        <div v-if="!isPostApply && ceoNamings.length > 0" class="flex flex-col gap-3">
          <p class="text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">Вибір CEO</p>
          <ExternalNamingGrid
            :namings="ceoNamings"
            :selected-ids="store.stepData.externalNaming.selectedIds"
            :max-selectable="CEO_RESELECT_EXTERNAL_NAMING_LIMIT"
            @toggle="handleToggle"
          />
        </div>

        <hr class="border-t border-black/10 max-w-[506px]" />

        <!-- Other namings for chosen concept (excluding PO original + CEO) -->
        <div class="flex flex-col gap-3">
          <p class="text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">
            Інші назви для обраного концепту
          </p>
          <ExternalNamingGrid
            :namings="namings"
            :selected-ids="store.stepData.externalNaming.selectedIds"
            :exclude-ids="excludeFromGrid"
            :max-selectable="CEO_RESELECT_EXTERNAL_NAMING_LIMIT"
            @toggle="handleToggle"
          />
        </div>
      </template>

      <StepCommentField v-model="comment" label="Коментар замовника" />
    </div>

    <PoEditFooter
      :cancel-label="isChained ? 'Назад' : 'Скасувати'"
      primary-label="Зберегти"
      :primary-disabled="primaryDisabled"
      :loading="isSaving"
      @cancel="goCancel"
      @primary="goSave"
    />
  </div>
</template>
