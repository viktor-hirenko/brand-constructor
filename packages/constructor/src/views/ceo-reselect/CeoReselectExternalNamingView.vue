<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConstructorStore, CEO_RESELECT_EXTERNAL_NAMING_LIMIT } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type { ExternalNaming } from '@brand-constructor/shared/types'
import ExternalNamingGrid from '@/components/constructor/ceo-reselect/ExternalNamingGrid.vue'
import ExternalNamingGridSkeleton from '@/components/constructor/skeletons/ExternalNamingGridSkeleton.vue'
import CustomerNamingsRow from '@/components/constructor/ceo-reselect/CustomerNamingsRow.vue'
import CustomerNamingsRowSkeleton from '@/components/constructor/skeletons/CustomerNamingsRowSkeleton.vue'
import EditFlowFooter from '@/components/constructor/edit-flow/EditFlowFooter.vue'
import EditFlowSectionLabel from '@/components/constructor/edit-flow/EditFlowSectionLabel.vue'
import EditFlowStepShell from '@/components/constructor/edit-flow/EditFlowStepShell.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import {
  getExternalNamingCommentHint,
  isExternalNamingCommentRequired,
  isExternalNamingStepValid,
} from '@/utils/externalNamingValidation'

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

/**
 * In chained mode: all server-filtered namings (already filtered by concept_id via API param).
 * In standalone mode: client-side filter by CEO's conceptId so only related namings are shown
 * in the CEO grid. We still load ALL namings server-side so `poExternalMini` can resolve PO's
 * picks regardless of which concept they belong to.
 */
const gridNamings = computed(() => {
  if (isChainedFromConcept.value) return namings.value
  const cid = store.ceoReselectDraft.conceptId
  if (!cid) return namings.value
  return namings.value.filter(n => n.concept_id === cid)
})

const primaryDisabled = computed(() =>
  !isExternalNamingStepValid(
    stagedExternalIds.value,
    store.brandCeoComments?.externalNaming?.value ?? '',
    false,
    namings.value,
  ),
)

/** Guards against the initial-render flash: useApiList starts with loading=false
 *  but onMounted only fires after the first paint, so the first frame would render
 *  the real grid with empty data before the spinner kicks in. */
const hasFetched = ref(false)

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
  hasFetched.value = true
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
  // Pre-fill comment from PO's comment if CEO hasn't written one yet.
  if (!store.brandCeoComments?.externalNaming) {
    store.setCeoCommentValue('externalNaming', store.stepData.externalNaming.comment ?? '')
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
    // Keep the draft — user is just navigating back to the previous step.
    router.push(`/constructor/brand/${brandId.value}/ceo-reselect/concept`)
    return
  }
  store.resetCeoReselectDraft()
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
    store.resetCeoReselectDraft()
    router.push(`/constructor/brand/${brandId.value}`)
  }
}

const cancelLabel = computed(() => (isChainedFromConcept.value ? 'Назад' : 'Скасувати'))

const externalComment = computed({
  get: () => store.brandCeoComments?.externalNaming?.value ?? '',
  set: (value: string) => store.setCeoCommentValue('externalNaming', value),
})

const isCommentRequired = computed(() =>
  isExternalNamingCommentRequired(stagedExternalIds.value, namings.value),
)

const commentHint = computed(() =>
  getExternalNamingCommentHint(stagedExternalIds.value, namings.value),
)

const subtitleText = `Оберіть до ${CEO_RESELECT_EXTERNAL_NAMING_LIMIT}-х назв, що пройдуть перевірку юристами на можливі ризики.`

const isReady = computed(() => hasFetched.value && !loading.value && !error.value)
const showSkeleton = computed(() => !hasFetched.value || loading.value)
</script>

<template>
  <EditFlowStepShell
    class="ceo-reselect-external-naming-step"
    title="External Naming"
    :subtitle="subtitleText"
  >
    <!-- Skeleton state: pixel-matched tree avoids CLS on data load.
         `showSkeleton` covers both `loading=true` and the initial pre-mount
         frame when `hasFetched=false`. -->
    <template v-if="showSkeleton">
      <CustomerNamingsRowSkeleton v-if="!isChainedFromConcept" />

      <div
        class="h-px w-full max-w-[506px] shrink-0 bg-[rgba(0,0,0,0.1)]"
        aria-hidden="true"
      />

      <div class="flex flex-col gap-3">
        <EditFlowSectionLabel>Варіанти назв для обраного концепту</EditFlowSectionLabel>
        <!-- CEO can select up to CEO_RESELECT_EXTERNAL_NAMING_LIMIT (3) — show 1 row. -->
        <ExternalNamingGridSkeleton :count="3" />
      </div>
    </template>

    <!-- Error state -->
    <div v-else-if="error" class="text-center py-12">
      <p class="text-red-500 mb-3">{{ error }}</p>
      <button class="text-primary underline text-sm" @click="loadNamings">
        Спробувати знову
      </button>
    </div>

    <!-- Ready state -->
    <template v-else-if="isReady">
      <template v-if="!isChainedFromConcept">
        <CustomerNamingsRow :namings="poExternalMini" />
      </template>

      <div
        class="h-px w-full max-w-[506px] shrink-0 bg-[rgba(0,0,0,0.1)]"
        aria-hidden="true"
      />

      <div class="flex flex-col gap-3">
        <EditFlowSectionLabel>Варіанти назв для обраного концепту</EditFlowSectionLabel>
        <ExternalNamingGrid
          :namings="gridNamings"
          :selected-ids="stagedExternalIds"
          :exclude-ids="excludedFromGrid"
          :max-selectable="CEO_RESELECT_EXTERNAL_NAMING_LIMIT"
          @toggle="handleToggle"
        />
      </div>
    </template>

    <!-- Comment field + save error — intentionally OUTSIDE the
         skeleton/ready/error branches above. They don't depend on the
         namings API, so the CEO can start writing a comment immediately
         instead of waiting for the grid to load (progressive enhancement;
         matches the layout used by every other view in this flow). -->
    <StepCommentField
      v-model="externalComment"
      label="Коментар"
      :required="isCommentRequired"
      :required-hint="commentHint"
    />

    <p v-if="store.saveCeoSelectionsError" class="text-sm text-red-600">
      {{ store.saveCeoSelectionsError }}
    </p>

    <template #footer>
      <EditFlowFooter
        :cancel-label="cancelLabel"
        primary-label="Зберегти"
        :primary-disabled="primaryDisabled"
        @cancel="goCancel"
        @primary="goSave"
      />
    </template>
  </EditFlowStepShell>
</template>
