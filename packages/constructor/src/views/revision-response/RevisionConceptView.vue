<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList, apiGet } from '@/composables/useApi'
import type { Concept, NewConceptBrief } from '@brand-constructor/shared/types'
import ConceptGrid from '@/components/constructor/alternative-selection/ConceptGrid.vue'
import ConceptCard from '@/components/constructor/alternative-selection/ConceptCard.vue'
import ConceptGridSkeleton from '@/components/constructor/skeletons/ConceptGridSkeleton.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import UiFooter from '@/components/ui/UiFooter.vue'
import EditFlowSectionLabel from '@/components/constructor/edit-flow/EditFlowSectionLabel.vue'
import EditFlowStepShell from '@/components/constructor/edit-flow/EditFlowStepShell.vue'
import UiDivider from '@/components/ui/UiDivider.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import BriefOrderButton from '@/components/constructor/edit-flow/BriefOrderButton.vue'
import NewConceptModal from '@/components/constructor/modals/NewConceptModal.vue'
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue'
import {
  EDIT_FLOW_BODY_OFFSET_CLASS,
  EDIT_FLOW_COMMENT_OFFSET_CLASS,
  EDIT_FLOW_CONCEPT_PAIR_GRID_CLASS,
  EDIT_FLOW_DIVIDER_CLASS,
  EDIT_FLOW_POST_DIVIDER_CONTROL_SECTION_CLASS,
  EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS,
} from '@/constants/editFlowLayout'
import UiAsyncState from '@/components/ui/UiAsyncState.vue'

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

const { data: concepts, error, fetchData, perPage } = useApiList<Concept>('/api/concepts')

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

/**
 * Ordering a new concept from the revision (brief-orders plan, phase 4) — the
 * same button and form as the draft edit screen (`DraftConceptEditView`). A
 * concept on order replaces the pick; «Далі» then saves and the review sends
 * the brief to the teams («Відправити в роботу»).
 */
const hasBrief = computed(() => store.stepData.concept.newConceptBrief !== null)
const showNewModal = ref(false)
const showDeleteConfirm = ref(false)
const showSwitchConfirm = ref(false)
const pendingSwitchId = ref<string | null>(null)

const primaryDisabled = computed(() => !selectedId.value && !hasBrief.value)

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
/**
 * First load only — a theme switch keeps the cards it has and swaps them in
 * place, instead of putting six placeholder tiles between the two lists and
 * moving everything under the grid twice. Why, at length:
 * `views/wizard/ConceptSelectionView.vue` (DP-15450, Concept Selection 2).
 */
const showGridSkeleton = computed(
  () =>
    !hasFetchedConcepts.value ||
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

  // A concept already on order: nothing is picked until the order is dropped.
  if (hasBrief.value) selectedId.value = null

  // Seed previewId so the right-panel slider shows immediately on open.
  if (selectedId.value) store.setConcept({ previewId: selectedId.value })

  // Always load PO concept by the baseline (not the possibly mutated store value).
  loadPoConceptById(originalPoConceptId.value)
  // CEO concept fetched independently so theme changes don't make it disappear.
  loadCeoConcept()
  loadConcepts()
})

watch(localMode, loadConcepts)

/**
 * Update the local `selectedId`, persist it as the draft's `pendingConceptId`
 * (so it survives F5 — `useAuthorRevisionDraft` auto-saves the draft to
 * localStorage) and seed the store `previewId` so the right-panel slider
 * reacts immediately.
 *
 * Crucially we do NOT write `selectedId` into `store.stepData.concept` here
 * — `availableConcepts` filters by `poConceptId` (= `stepData.concept.selectedId`),
 * so mutating it on click would yank the just-selected card out of the grid.
 * The store's `stepData.concept.selectedId` is only committed in `goDali()`.
 */
function selectConcept(id: string) {
  // Picking a concept drops the order — after a confirmation, as in the draft.
  if (hasBrief.value) {
    pendingSwitchId.value = id
    showSwitchConfirm.value = true
    return
  }
  applyConceptPick(id)
}

function applyConceptPick(id: string) {
  selectedId.value = id
  store.setAuthorRevisionPendingConcept(id)
  store.setConcept({ previewId: id })
}

function confirmSwitchSelection() {
  const id = pendingSwitchId.value
  if (id == null) return
  store.setNewConceptBrief(null)
  showSwitchConfirm.value = false
  pendingSwitchId.value = null
  applyConceptPick(id)
}

function cancelSwitchSelection() {
  showSwitchConfirm.value = false
  pendingSwitchId.value = null
}

function handleBriefSave(brief: NewConceptBrief) {
  store.setNewConceptBrief(brief)
  selectedId.value = null
  store.setConcept({ previewId: null })
  showNewModal.value = false
}

function confirmDeleteBrief() {
  store.setNewConceptBrief(null)
  showDeleteConfirm.value = false
}

/** «Редагувати» inside the read-only brief preview reopens the form here. */
watch(
  () => store.briefPreviewEditRequested,
  kind => {
    if (kind !== 'concept') return
    showNewModal.value = true
    store.consumeBriefPreviewEditRequest()
  },
)

function goCancel() {
  // Brings the names back only if «Далі» captured them — straight
  // «Редагувати» → «Скасувати» never touched them (`externalIdsOnConceptCancel`).
  store.discardUnfinishedEdit()
  router.push(`/constructor/brand/${brandId.value}`)
}

async function goDali() {
  if (hasBrief.value) {
    await saveConceptOrder()
    return
  }
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
    // Same concept as Author's original → save + return.
    // Mark 'concept' as explicitly resolved so the final review shows
    // «Обраний концепт» even though PO kept their own pick (not CEO's).
    store.markConflictSectionResolved('concept')
    store.setConcept({ selectedId: selectedId.value, newConceptBrief: null })
    isSaving.value = true
    const saved = await store.saveBrand()
    isSaving.value = false
    // H-06: a failed save stays on the screen with the error under the buttons,
    // instead of returning to the review as if it went through.
    if (!saved) return
    store.commitEditSection()
    store.resetAuthorRevisionDraft()
    router.push(`/constructor/brand/${brandId.value}`)
  }
}

/**
 * A new concept on order: the brief keeps the order and no concept. Its names
 * come with the new concept (the wizard skips External Naming for it), so the
 * old concept's names and any name ordered for it go — they belong to a
 * concept the brief no longer has (H-07).
 */
async function saveConceptOrder() {
  // «Скасувати» after a failed save puts the names back (`goCancel`).
  store.captureAuthorRevisionBaselineExternal(store.stepData.externalNaming.selectedIds ?? [])
  store.markConflictSectionResolved('concept')
  store.markConflictSectionResolved('externalNaming')
  store.setConcept({ selectedId: null, previewId: null })
  store.setExternalNaming({ selectedIds: [], newNamingBrief: null })
  isSaving.value = true
  const saved = await store.saveBrand()
  isSaving.value = false
  if (!saved) return
  store.commitEditSection()
  store.resetAuthorRevisionDraft()
  router.push(`/constructor/brand/${brandId.value}`)
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
      <div
        v-if="isPostApply"
        :class="['flex flex-col', EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS]"
        aria-hidden="true"
      >
        <div class="h-6 w-35 rounded bg-muted animate-pulse" />
        <div class="w-62 h-62 rounded-2xl bg-muted animate-pulse" />
      </div>
      <div v-else :class="EDIT_FLOW_CONCEPT_PAIR_GRID_CLASS" aria-hidden="true">
        <div
          v-for="i in 2"
          :key="i"
          :class="['flex flex-col', EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS]"
        >
          <div class="h-6 w-35 rounded bg-muted animate-pulse" />
          <div class="w-full aspect-square rounded-2xl bg-muted animate-pulse" />
        </div>
      </div>
    </template>

    <!-- post-apply: single applied concept card -->
    <div v-else-if="isPostApply" :class="['flex flex-col', EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS]">
      <EditFlowSectionLabel>Обраний концепт</EditFlowSectionLabel>
      <div class="w-62">
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
    <div v-else :class="EDIT_FLOW_CONCEPT_PAIR_GRID_CLASS">
      <!-- PO previous — reference only, not selectable.
           CEO already rejected PO's pick; if PO wants to keep it they use "Скасувати". -->
      <div :class="['flex flex-col', EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS]">
        <EditFlowSectionLabel>Вибір замовника</EditFlowSectionLabel>
        <ConceptCard :concept="poConcept" :show-overlay="true" :clickable="false" />
      </div>

      <!-- CEO pick (pre-selected) -->
      <div :class="['flex flex-col', EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS]">
        <EditFlowSectionLabel>Вибір CEO</EditFlowSectionLabel>
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

    <UiDivider :class="EDIT_FLOW_DIVIDER_CLASS" />

    <!-- Other / available concepts grid -->
    <div :class="EDIT_FLOW_POST_DIVIDER_CONTROL_SECTION_CLASS">
      <div class="flex items-center justify-between">
        <EditFlowSectionLabel>Доступні концепти</EditFlowSectionLabel>
        <SegmentedControl v-model="localMode" :options="themeOptions" />
      </div>

      <ConceptGridSkeleton v-if="showGridSkeleton" />
      <UiAsyncState v-else-if="error" :message="error" @retry="loadConcepts" />
      <ConceptGrid
        v-else
        :concepts="availableConcepts"
        :selected-id="selectedId"
        :preview-id="selectedId"
        :selection-ring="true"
        @select="selectConcept"
      />

      <BriefOrderButton
        create-label="Замовити новий концепт"
        created-label="Бриф концепту створено"
        :is-created="hasBrief"
        @create="showNewModal = true"
        @view="store.openBriefPreview('concept', { allowEdit: true })"
        @edit="showNewModal = true"
        @delete="showDeleteConfirm = true"
      />
    </div>

    <StepCommentField
      v-model="poConceptComment"
      label="Коментар"
      :class="EDIT_FLOW_COMMENT_OFFSET_CLASS"
    />

    </div>

    <template #footer>
      <UiFooter
        cancel-label="Скасувати"
        primary-label="Далі"
        :primary-disabled="primaryDisabled"
        :loading="isSaving"
        @cancel="goCancel"
        @primary="goDali"
      >
        <template #note>
          <p v-if="store.saveError" class="text-sm text-red-600">
            {{ store.saveError }}
          </p>
        </template>
      </UiFooter>
    </template>

    <NewConceptModal
      v-if="showNewModal"
      :initial-data="store.stepData.concept.newConceptBrief"
      @save="handleBriefSave"
      @cancel="showNewModal = false"
    />

    <ConfirmationModal
      v-if="showDeleteConfirm"
      title="Видалити бриф?"
      body="Дані брифу буде втрачено. Цю дію неможливо скасувати."
      cancel-label="Скасувати"
      primary-label="Видалити"
      @cancel="showDeleteConfirm = false"
      @primary="confirmDeleteBrief"
    />

    <ConfirmationModal
      v-if="showSwitchConfirm"
      title="Обрати цей концепт?"
      body="При виборі концепту створений бриф буде видалено. Цю дію неможливо скасувати."
      cancel-label="Скасувати"
      primary-label="Обрати концепт"
      @cancel="cancelSwitchSelection"
      @primary="confirmSwitchSelection"
    />
  </EditFlowStepShell>
</template>
