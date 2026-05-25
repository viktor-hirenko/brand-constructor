<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList, apiGet } from '@/composables/useApi'
import type { Concept } from '@brand-constructor/shared/types'
import ConceptGrid from '@/components/constructor/alternative-selection/ConceptGrid.vue'
import ConceptCard from '@/components/constructor/alternative-selection/ConceptCard.vue'
import ConceptGridSkeleton from '@/components/constructor/skeletons/ConceptGridSkeleton.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import EditFlowFooter from '@/components/constructor/edit-flow/EditFlowFooter.vue'
import EditFlowSectionLabel from '@/components/constructor/edit-flow/EditFlowSectionLabel.vue'
import EditFlowStepShell from '@/components/constructor/edit-flow/EditFlowStepShell.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import {
  EDIT_FLOW_BODY_OFFSET_CLASS,
  EDIT_FLOW_DIVIDER_CLASS,
  EDIT_FLOW_POST_DIVIDER_SECTION_CLASS,
} from '@/constants/editFlowLayout'

const store = useConstructorStore()
const route = useRoute()
const router = useRouter()

const brandId = computed(() => route.params.id as string)

/**
 * post-apply = PO already applied CEO variant and now wants to re-edit.
 *   Shows single "Обраний концепт" applied card + full alternatives grid.
 * choice (default) = shows "PO previous" + "CEO pick" side-by-side.
 */
const isPostApply = computed(() => route.query.mode === 'post-apply')

const { data: concepts, loading, error, fetchData, perPage } = useApiList<Concept>('/api/concepts')

const localMode = ref<'light' | 'dark'>(store.stepData.mode === 'dark' ? 'dark' : 'light')

const poConceptId = computed(() => store.stepData.concept.selectedId)

/**
 * CEO's concept — fetched independently so it stays visible regardless of
 * which theme filter the grid is currently showing. Looking it up inside
 * `concepts.value` would make the header card disappear whenever the CEO's
 * concept is not in the theme-filtered list.
 */
const ceoConcept = ref<Concept | null>(null)
const hasFetchedCeoConcept = ref(false)

async function loadCeoConcept() {
  const sel = store.brandCeoSelections?.concept
  const ceoId = typeof sel === 'string' ? sel : Array.isArray(sel) ? (sel[0] ?? null) : null
  if (!ceoId) {
    ceoConcept.value = null
    hasFetchedCeoConcept.value = true
    return
  }
  try {
    ceoConcept.value = await apiGet<Concept>(`/api/concepts/${ceoId}`)
  } catch {
    ceoConcept.value = null
  } finally {
    hasFetchedCeoConcept.value = true
  }
}

const poConcept = ref<Concept | null>(null)
async function loadPoConceptById(id: string | null) {
  if (!id) {
    poConcept.value = null
    hasFetchedPoConcept.value = true
    return
  }
  try {
    poConcept.value = await apiGet<Concept>(`/api/concepts/${id}`)
  } catch {
    poConcept.value = null
  } finally {
    hasFetchedPoConcept.value = true
  }
}

/**
 * In post-apply: start from currently applied (= poConceptId = already CEO's concept).
 * In choice: start from CEO pick so it's pre-selected for one-click confirm.
 */
const selectedId = ref<string | null>(
  (() => {
    if (isPostApply.value) {
      return store.stepData.concept.selectedId ?? null
    }
    const sel = store.brandCeoSelections?.concept
    return typeof sel === 'string' ? sel : Array.isArray(sel) ? (sel[0] ?? null) : null
  })()
)

/**
 * The Author's original concept BEFORE the current edit session started.
 * Captured in `useAuthorRevisionDraft` (Pinia) on first mount so «Назад»
 * from external-naming can restore the correct value even after `goDali()`
 * mutated `stepData.concept.selectedId`.
 */
const originalPoConceptId = computed(() => store.authorRevisionDraft.baselineConceptId)

/**
 * choice mode:    exclude PO original (shown in dual header) AND CEO pick (shown in dual header).
 *                 Grid shows only "other" alternatives — neither of the two shown at top.
 * post-apply mode: exclude only the applied concept (= poConceptId, shown as single applied card).
 *                 Grid includes PO's old original as a regular option.
 */
const availableConcepts = computed(() => {
  if (isPostApply.value) {
    // post-apply: only exclude the applied (current) concept
    return concepts.value.filter(c => c.id !== poConceptId.value)
  }
  // choice: exclude both PO original and CEO pick.
  // Use brandCeoSelections directly (sync) instead of ceoConcept.value?.id so the
  // CEO card is excluded from the grid immediately — before the async apiGet resolves —
  // preventing the card from briefly appearing in the grid and then jumping to the header.
  const sel = store.brandCeoSelections?.concept
  const ceoId = typeof sel === 'string' ? sel : Array.isArray(sel) ? (sel[0] ?? null) : null
  return concepts.value.filter(c => c.id !== poConceptId.value && c.id !== ceoId)
})

const primaryDisabled = computed(() => !selectedId.value)

const isSaving = ref(false)

const poConceptComment = computed({
  get: () => store.stepData.concept.comment ?? '',
  set: (val: string) => store.setConcept({ comment: val }),
})

const themeOptions = [
  { value: 'light', label: 'Світла тема' },
  { value: 'dark', label: 'Темна тема' },
]

const subtitleText = computed(() =>
  isPostApply.value
    ? "Оберіть концепт та перегляньте прев'ю праворуч."
    : 'Ви можете залишити варіант CEO або обрати інший.'
)

/** Guards against initial-render flash (see CeoReselectExternalNamingView). */
const hasFetchedConcepts = ref(false)
const hasFetchedPoConcept = ref(false)

const showHeaderSkeleton = computed(
  () => !hasFetchedPoConcept.value || (!isPostApply.value && !hasFetchedCeoConcept.value)
)
const showGridSkeleton = computed(
  () =>
    !hasFetchedConcepts.value ||
    loading.value ||
    (!isPostApply.value && !hasFetchedCeoConcept.value)
)

async function loadConcepts() {
  perPage.value = 100
  const params: Record<string, string> = { status: 'active', mode: localMode.value }
  if (store.brandId) params.available_for_brand = store.brandId
  await fetchData(params)
  hasFetchedConcepts.value = true
}

onMounted(() => {
  // Capture the PO concept BEFORE this edit session may have mutated it.
  // No-op if a baseline was already captured on a previous mount this session
  // (e.g. user is returning from external-naming via «Назад»).
  store.captureAuthorRevisionBaselineConcept(store.stepData.concept.selectedId ?? null)

  // Begin (or re-begin) the edit section. cancelEditSection in the chained
  // external-naming view restored store.stepData.concept on «Назад», so we
  // re-open the section here to keep Скасувати working from this screen too.
  store.beginEditSection('concept', 8)

  // Pre-select CEO pick (choice mode) — always show CEO as highlighted.
  if (!isPostApply.value) {
    const sel = store.brandCeoSelections?.concept
    const ceoId = typeof sel === 'string' ? sel : Array.isArray(sel) ? (sel[0] ?? null) : null
    if (ceoId) selectedId.value = ceoId
  }

  // When returning from external-naming («Назад»), restore the concept the
  // Author had picked so the checkmark stays on their selection, not on the
  // CEO pick.
  if (store.authorRevisionDraft.pendingConceptId) {
    selectedId.value = store.authorRevisionDraft.pendingConceptId
  }

  // Seed previewId so the right-panel slider shows immediately on open.
  if (selectedId.value) store.setConcept({ previewId: selectedId.value })

  // Always load PO concept by the baseline (not the possibly mutated store value).
  loadPoConceptById(originalPoConceptId.value)
  // CEO concept fetched independently so theme changes don't make it disappear.
  loadCeoConcept()
  loadConcepts()
})

watch(localMode, loadConcepts)

/** Update both the local selectedId and the store previewId so the right-panel slider reacts. */
function selectConcept(id: string) {
  selectedId.value = id
  store.setConcept({ previewId: id })
}

function goCancel() {
  // Restore externalNaming to the baseline (what it was before the edit session).
  store.setExternalNaming({
    selectedIds: [...store.authorRevisionDraft.baselineExternalIds],
    newNamingBrief: null,
  })
  store.resetAuthorRevisionDraft()
  store.cancelEditSection()
  router.push(`/constructor/brand/${brandId.value}`)
}

async function goDali() {
  if (!selectedId.value) return
  const conceptChanged = selectedId.value !== originalPoConceptId.value

  if (conceptChanged) {
    // Hide the grid immediately so that mutating `poConceptId` below doesn't cause
    // availableConcepts to briefly include the old PO concept before navigation completes.
    hasFetchedConcepts.value = false
    // Capture baseline external BEFORE clearing it, so «Скасувати» can restore it.
    store.captureAuthorRevisionBaselineExternal(
      store.stepData.externalNaming.selectedIds ?? []
    )
    // If user switched to a DIFFERENT concept than the one they previously navigated forward with,
    // drop the in-progress external selections — they belong to the old concept.
    const previouslyPending = store.authorRevisionDraft.pendingConceptId
    if (previouslyPending && previouslyPending !== selectedId.value) {
      store.clearAuthorRevisionPendingExternal()
    }
    store.setAuthorRevisionPendingConcept(selectedId.value)
    store.setConcept({ selectedId: selectedId.value, newConceptBrief: null })
    router.push(`/constructor/brand/${brandId.value}/po-edit/concept/external-naming`)
  } else {
    // Same concept as Author's original → save + return
    store.setConcept({ selectedId: selectedId.value, newConceptBrief: null })
    isSaving.value = true
    await store.saveBrand()
    isSaving.value = false
    store.commitEditSection()
    store.resetAuthorRevisionDraft()
    router.push(`/constructor/brand/${brandId.value}`)
  }
}
</script>

<template>
  <EditFlowStepShell
    class="po-edit-concept-view"
    title="Concept Selection"
    :subtitle="subtitleText"
  >
    <div :class="EDIT_FLOW_BODY_OFFSET_CLASS">
    <!-- Header skeleton: kept in sync with the real layout below (single
         248×248 card in post-apply, 2 cards side-by-side in choice mode). -->
    <template v-if="showHeaderSkeleton">
      <div v-if="isPostApply" class="flex flex-col gap-3" aria-hidden="true">
        <div class="h-6 w-[140px] rounded bg-muted animate-pulse" />
        <div class="w-[248px] h-[248px] rounded-2xl bg-muted animate-pulse" />
      </div>
      <div v-else class="grid grid-cols-2 gap-4 max-w-[506px]" aria-hidden="true">
        <div v-for="i in 2" :key="i" class="flex flex-col gap-2">
          <div class="h-4 w-[140px] rounded bg-muted animate-pulse" />
          <div class="w-full aspect-square rounded-2xl bg-muted animate-pulse" />
        </div>
      </div>
    </template>

    <!-- post-apply: single applied concept card -->
    <div v-else-if="isPostApply" class="flex flex-col gap-3">
      <p class="text-[16px] font-medium leading-6 text-[#414141] tracking-[-0.3125px]">
        Обраний концепт
      </p>
      <div class="w-[248px]">
        <ConceptCard
          :concept="poConcept"
          :is-selected="true"
          :show-checkmark="true"
          :show-selection-ring="true"
          :clickable="false"
        />
      </div>
    </div>

    <!-- choice: PO previous + CEO pick side by side, same size -->
    <div v-else class="grid grid-cols-2 gap-4 max-w-[506px]">
      <!-- PO previous — reference only, not selectable.
           CEO already rejected PO's pick; if PO wants to keep it they use "Скасувати". -->
      <div class="flex flex-col gap-2">
        <p class="text-[14px] font-medium leading-4 text-[#717182]">Ваш попередній вибір</p>
        <ConceptCard :concept="poConcept" :show-overlay="true" :clickable="false" />
      </div>

      <!-- CEO pick (pre-selected) -->
      <div class="flex flex-col gap-2">
        <p class="text-[14px] font-medium leading-4 text-[#717182]">Вибір CEO</p>
        <ConceptCard
          :concept="ceoConcept"
          :is-selected="ceoConcept ? selectedId === ceoConcept.id : false"
          :is-active="ceoConcept ? selectedId === ceoConcept.id : false"
          :show-overlay="true"
          :show-selection-ring="ceoConcept ? selectedId === ceoConcept.id : false"
          :show-checkmark="ceoConcept ? selectedId === ceoConcept.id : false"
          @click="ceoConcept && selectConcept(ceoConcept.id)"
        />
      </div>
    </div>

    <hr :class="EDIT_FLOW_DIVIDER_CLASS" />

    <!-- Other / available concepts grid -->
    <div :class="EDIT_FLOW_POST_DIVIDER_SECTION_CLASS">
      <div class="flex items-center justify-between max-w-[506px]">
        <EditFlowSectionLabel>
          {{ isPostApply ? 'Доступні концепти' : 'Інші концепти' }}
        </EditFlowSectionLabel>
        <SegmentedControl v-model="localMode" :options="themeOptions" />
      </div>

      <ConceptGridSkeleton v-if="showGridSkeleton" />
      <div v-else-if="error" class="text-center py-8 text-red-500">
        <p class="mb-2">{{ error }}</p>
        <button type="button" class="text-primary underline text-sm" @click="loadConcepts">
          Спробувати знову
        </button>
      </div>
      <ConceptGrid
        v-else
        :concepts="availableConcepts"
        :selected-id="selectedId"
        :preview-id="selectedId"
        :selection-ring="true"
        @select="selectConcept"
      />
    </div>

    <StepCommentField v-model="poConceptComment" label="Коментар" class="mt-6" />

    </div>

    <template #footer>
      <EditFlowFooter
        cancel-label="Скасувати"
        primary-label="Далі"
        :primary-disabled="primaryDisabled"
        :loading="isSaving"
        @cancel="goCancel"
        @primary="goDali"
      />
    </template>
  </EditFlowStepShell>
</template>
