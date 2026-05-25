<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList, apiGet } from '@/composables/useApi'
import type { Concept } from '@brand-constructor/shared/types'
import ConceptGrid from '@/components/constructor/ceo-reselect/ConceptGrid.vue'
import ConceptGridSkeleton from '@/components/constructor/skeletons/ConceptGridSkeleton.vue'
import CustomerPickPreview from '@/components/constructor/ceo-reselect/CustomerPickPreview.vue'
import CustomerPickPreviewSkeleton from '@/components/constructor/skeletons/CustomerPickPreviewSkeleton.vue'
import EditFlowFooter from '@/components/constructor/edit-flow/EditFlowFooter.vue'
import EditFlowSectionLabel from '@/components/constructor/edit-flow/EditFlowSectionLabel.vue'
import EditFlowStepShell from '@/components/constructor/edit-flow/EditFlowStepShell.vue'
import {
  EDIT_FLOW_DIVIDER_CLASS,
  EDIT_FLOW_POST_DIVIDER_SECTION_CLASS,
} from '@/constants/editFlowLayout'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'

const store = useConstructorStore()
const route = useRoute()
const router = useRouter()

const brandId = computed(() => route.params.id as string)

const {
  data: concepts,
  loading,
  error,
  fetchData,
  perPage,
} = useApiList<Concept>('/api/concepts')

/** Local mode toggle for CEO re-select; does not mutate PO `stepData.mode`. */
const localMode = ref<'light' | 'dark'>(store.stepData.mode === 'dark' ? 'dark' : 'light')

const themeOptions = [
  { value: 'light', label: 'Світла тема' },
  { value: 'dark', label: 'Темна тема' },
]

const poConceptId = computed(() => store.stepData.concept.selectedId)

/**
 * PO-pick is fetched independently of the theme filter so it stays visible
 * regardless of which theme the CEO is currently browsing.
 */
const poConcept = ref<Concept | null>(null)
const poConceptLoading = ref(false)
/** Guards against the initial-render flash: useApiList starts with loading=false
 *  but onMounted only fires after the first paint. Until both fetches have at
 *  least started+resolved once, we keep the skeleton on. */
const hasFetchedConcepts = ref(false)
const hasFetchedPoConcept = ref(false)

async function loadPoConcept() {
  const id = poConceptId.value
  if (!id) {
    poConcept.value = null
    poConceptLoading.value = false
    hasFetchedPoConcept.value = true
    return
  }
  poConceptLoading.value = true
  try {
    poConcept.value = await apiGet<Concept>(`/api/concepts/${id}`)
  } catch {
    poConcept.value = null
  } finally {
    poConceptLoading.value = false
    hasFetchedPoConcept.value = true
  }
}

/**
 * Single readiness flag for the whole page — avoids per-section flashes of
 * empty/"not selected" states while either the PO pick or the available
 * concepts list is still loading. Both fetches are kicked off in `onMounted`
 * in parallel, and the skeleton tree is rendered until they both resolve.
 */
const isReady = computed(
  () =>
    hasFetchedConcepts.value &&
    hasFetchedPoConcept.value &&
    !poConceptLoading.value &&
    !loading.value
)

const stagedConfirmedId = computed(() => store.ceoReselectDraft.conceptId)
const stagedPreviewId = computed(() => store.ceoReselectDraft.conceptPreviewId)

/** Available concepts (excludes the customer's pick). */
const availableConcepts = computed(() =>
  concepts.value.filter(c => c.id !== poConceptId.value)
)

const primaryDisabled = computed(
  () => !stagedConfirmedId.value || stagedConfirmedId.value === poConceptId.value
)

async function loadConcepts() {
  perPage.value = 100
  const params: Record<string, string> = { status: 'active', mode: localMode.value }
  if (store.brandId) {
    params.available_for_brand = store.brandId
  }
  await fetchData(params)
  hasFetchedConcepts.value = true
}

onMounted(() => {
  store.seedCeoReselectFromBrand('concept')
  // Do NOT pre-fill previewId with PO's concept — right panel starts empty
  // until CEO clicks a card.
  // Pre-fill comment from PO's comment if CEO hasn't written one yet.
  if (!store.brandCeoComments?.concept) {
    store.setCeoCommentValue('concept', store.stepData.concept.comment ?? '')
  }
  loadPoConcept()
  loadConcepts()
})

watch(localMode, loadConcepts)
watch(poConceptId, loadPoConcept)

function handleSelectConcept(conceptId: string) {
  if (stagedConfirmedId.value === conceptId) {
    // Toggle off — clear both ids; right panel returns to empty state.
    store.selectCeoReselectConcept(null, null)
  } else {
    store.selectCeoReselectConcept(conceptId, conceptId)
  }
}

const conceptComment = computed({
  get: () => store.brandCeoComments?.concept?.value ?? '',
  set: (value: string) => store.setCeoCommentValue('concept', value),
})

function goBack() {
  store.resetCeoReselectDraft()
  router.push(`/constructor/brand/${brandId.value}`)
}

function goNext() {
  const id = stagedConfirmedId.value
  const po = poConceptId.value
  if (!id || !po) return
  if (id === po) return
  router.push(`/constructor/brand/${brandId.value}/ceo-reselect/concept/external-naming`)
}
</script>

<template>
  <EditFlowStepShell
    class="ceo-reselect-concept-step"
    title="Concept Selection"
    subtitle="Оберіть концепт та перегляньте прев’ю праворуч."
  >
    <!-- Customer's pick (independent of theme filter) -->
    <CustomerPickPreviewSkeleton v-if="!isReady" />
    <CustomerPickPreview v-else :concept="poConcept" />

    <div :class="EDIT_FLOW_DIVIDER_CLASS" role="separator" aria-hidden="true" />

    <!-- Theme toggle (light / dark) — filters available concepts -->
    <SegmentedControl v-model="localMode" :options="themeOptions" />

    <!-- Available concepts -->
    <div :class="EDIT_FLOW_POST_DIVIDER_SECTION_CLASS">
      <EditFlowSectionLabel>Доступні концепти</EditFlowSectionLabel>

      <ConceptGridSkeleton v-if="!isReady" />
      <div v-else-if="error" class="text-center py-12 text-red-500">
        <p class="mb-3">{{ error }}</p>
        <button type="button" class="text-primary underline text-sm" @click="loadConcepts">
          Спробувати знову
        </button>
      </div>
      <ConceptGrid
        v-else
        :concepts="availableConcepts"
        :preview-id="stagedPreviewId"
        :selected-id="stagedConfirmedId"
        :selection-ring="true"
        @select="handleSelectConcept"
      />
    </div>

    <StepCommentField v-model="conceptComment" label="Коментар" />

    <p v-if="store.saveCeoSelectionsError" class="text-sm text-red-600">
      {{ store.saveCeoSelectionsError }}
    </p>

    <template #footer>
      <EditFlowFooter
        cancel-label="Скасувати"
        primary-label="Далі"
        :primary-disabled="primaryDisabled"
        @cancel="goBack"
        @primary="goNext"
      />
    </template>
  </EditFlowStepShell>
</template>
