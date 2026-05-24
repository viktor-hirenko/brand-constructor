<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConstructorStore, CEO_RESELECT_EXTERNAL_NAMING_LIMIT } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import { usePoEditSnapshot } from '@/composables/usePoEditSnapshot'
import type { ExternalNaming } from '@brand-constructor/shared/types'
import ExternalNamingGrid from '@/components/constructor/ceo-reselect/ExternalNamingGrid.vue'
import ExternalNamingGridSkeleton from '@/components/constructor/skeletons/ExternalNamingGridSkeleton.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import EditFlowFooter from '@/components/constructor/edit-flow/EditFlowFooter.vue'
import EditFlowSectionLabel from '@/components/constructor/edit-flow/EditFlowSectionLabel.vue'
import EditFlowStepShell from '@/components/constructor/edit-flow/EditFlowStepShell.vue'

const store = useConstructorStore()
const route = useRoute()
const router = useRouter()

const brandId = computed(() => route.params.id as string)

const snapshot = usePoEditSnapshot(brandId)

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

const poExternalComment = computed({
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

function restorePendingConceptFromSession() {
  const pending = snapshot.loadPendingConcept()
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

/** Guards against initial-render flash (see CeoReselectExternalNamingView). */
const hasFetched = ref(false)

async function loadNamings() {
  perPage.value = 100
  const params: Record<string, string> = { status: 'active' }
  if (conceptIdForNamings.value) params.concept_id = conceptIdForNamings.value
  if (store.brandId) params.available_for_brand = store.brandId
  await fetchData(params)
  hasFetched.value = true
}

onMounted(async () => {
  if (isChained.value) {
    // After F5, router reloads brand from API (old saved concept) — restore in-progress pick.
    restorePendingConceptFromSession()
    // Restore in-progress selections if user went Back from here and returned again.
    // If there are none (first visit), start with empty selection.
    const pendingExternal = snapshot.loadPendingExternal()
    if (pendingExternal && pendingExternal.length > 0) {
      store.setExternalNaming({ selectedIds: pendingExternal, newNamingBrief: null })
    } else {
      store.setExternalNaming({ selectedIds: [], newNamingBrief: null })
    }
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
    // Save current in-progress selections so that if user returns (Назад → Далі again),
    // they see their external naming choices intact.
    snapshot.savePendingExternal(store.stepData.externalNaming.selectedIds ?? [])
    // Restore externalNaming from sessionStorage (saved before goDali cleared it).
    // NB: snapshot keys are NOT cleared here — PoEditConceptView re-reads
    // `originalConcept` on mount to keep «Назад» idempotent across hops.
    snapshot.restoreOriginalExternal(ids => {
      store.setExternalNaming({ selectedIds: ids, newNamingBrief: null })
    })
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
    // Edit flow is complete — drop every PO-edit snapshot key for this brand.
    snapshot.clearAll()
    router.push(`/constructor/brand/${brandId.value}`)
  }
}

const subtitleText = `Оберіть до ${CEO_RESELECT_EXTERNAL_NAMING_LIMIT}-х назв, що пройдуть перевірку юристами на можливі ризики.`

const isReady = computed(() => hasFetched.value && !loading.value && !error.value)
const showSkeleton = computed(() => !hasFetched.value || loading.value)
</script>

<template>
  <EditFlowStepShell
    class="po-edit-external-naming-view"
    title="External Naming"
    :subtitle="subtitleText"
  >
    <!-- Skeleton state: pixel-matched tree avoids CLS on data load.
         Skeleton sections key off raw *Ids (not *Namings), because the
         resolved namings only populate after the API call. -->
    <template v-if="showSkeleton">
      <!-- post-apply: applied names skeleton -->
      <div v-if="isPostApply && poOriginalPickIds.length > 0" class="flex flex-col gap-3">
        <EditFlowSectionLabel>Обрані назви</EditFlowSectionLabel>
        <ExternalNamingGridSkeleton :count="Math.min(poOriginalPickIds.length, 3)" />
      </div>

      <!-- standalone: PO previous picks skeleton -->
      <div
        v-else-if="!isChained && !isPostApply && poOriginalPickIds.length > 0"
        class="flex flex-col gap-3"
      >
        <EditFlowSectionLabel>Ваш попередній вибір</EditFlowSectionLabel>
        <ExternalNamingGridSkeleton :count="Math.min(poOriginalPickIds.length, 3)" />
      </div>

      <!-- CEO pick skeleton -->
      <div v-if="!isPostApply && ceoExternalIds.length > 0" class="flex flex-col gap-3">
        <EditFlowSectionLabel>Вибір CEO</EditFlowSectionLabel>
        <ExternalNamingGridSkeleton :count="Math.min(ceoExternalIds.length, 3)" />
      </div>

      <hr class="border-t border-black/10 max-w-[506px]" />

      <div class="flex flex-col gap-3">
        <EditFlowSectionLabel>Інші назви для обраного концепту</EditFlowSectionLabel>
        <ExternalNamingGridSkeleton :count="6" />
      </div>
    </template>

    <!-- Error state -->
    <div v-else-if="error" class="text-center py-12">
      <p class="text-red-500 mb-3">{{ error }}</p>
      <button type="button" class="text-primary underline text-sm" @click="loadNamings">
        Спробувати знову
      </button>
    </div>

    <!-- Ready state -->
    <template v-else-if="isReady">
      <!-- post-apply: show applied names as interactive grid (same cards as below) -->
      <div v-if="isPostApply && poOriginalNamings.length > 0" class="flex flex-col gap-3">
        <EditFlowSectionLabel>Обрані назви</EditFlowSectionLabel>
        <ExternalNamingGrid
          :namings="poOriginalNamings"
          :selected-ids="store.stepData.externalNaming.selectedIds"
          :max-selectable="CEO_RESELECT_EXTERNAL_NAMING_LIMIT"
          @toggle="handleToggle"
        />
      </div>

      <!-- standalone: PO's previous picks as interactive grid (top, above CEO) -->
      <div
        v-else-if="!isChained && !isPostApply && poOriginalNamings.length > 0"
        class="flex flex-col gap-3"
      >
        <EditFlowSectionLabel>Ваш попередній вибір</EditFlowSectionLabel>
        <ExternalNamingGrid
          :namings="poOriginalNamings"
          :selected-ids="store.stepData.externalNaming.selectedIds"
          :max-selectable="CEO_RESELECT_EXTERNAL_NAMING_LIMIT"
          @toggle="handleToggle"
        />
      </div>

      <!-- CEO pick -->
      <div v-if="!isPostApply && ceoNamings.length > 0" class="flex flex-col gap-3">
        <EditFlowSectionLabel>Вибір CEO</EditFlowSectionLabel>
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
        <EditFlowSectionLabel>Інші назви для обраного концепту</EditFlowSectionLabel>
        <ExternalNamingGrid
          :namings="namings"
          :selected-ids="store.stepData.externalNaming.selectedIds"
          :exclude-ids="excludeFromGrid"
          :max-selectable="CEO_RESELECT_EXTERNAL_NAMING_LIMIT"
          @toggle="handleToggle"
        />
      </div>

      <StepCommentField v-model="poExternalComment" label="Коментар" />
    </template>

    <template #footer>
      <EditFlowFooter
        :cancel-label="isChained ? 'Назад' : 'Скасувати'"
        primary-label="Зберегти"
        :primary-disabled="primaryDisabled"
        :loading="isSaving"
        @cancel="goCancel"
        @primary="goSave"
      />
    </template>
  </EditFlowStepShell>
</template>
