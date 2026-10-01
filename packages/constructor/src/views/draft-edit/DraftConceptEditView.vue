<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { isBriefOrderLocked } from '@/utils/briefOrderLock'
import { useApiList } from '@/composables/useApi'
import type {
  Concept,
  NewConceptBrief,
  BrandConceptData,
} from '@brand-constructor/shared/types'
import ConceptGrid from '@/components/constructor/alternative-selection/ConceptGrid.vue'
import ConceptGridSkeleton from '@/components/constructor/skeletons/ConceptGridSkeleton.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import UiFooter from '@/components/ui/UiFooter.vue'
import BriefOrderButton from '@/components/constructor/edit-flow/BriefOrderButton.vue'
import NewConceptModal from '@/components/constructor/modals/NewConceptModal.vue'
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue'
import EditFlowStepShell from '@/components/constructor/edit-flow/EditFlowStepShell.vue'
import {
  EDIT_FLOW_BODY_OFFSET_CLASS,
  EDIT_FLOW_COMMENT_OFFSET_CLASS,
  EDIT_FLOW_POST_DIVIDER_CONTROL_SECTION_CLASS,
} from '@/constants/editFlowLayout'
import UiAsyncState from '@/components/ui/UiAsyncState.vue'
import { needsExternalNamingReselect } from '@/utils/draftConceptCascade'

/**
 * Draft inline-edit — concept selection screen (Figma "Twil" flow).
 *
 * Opened from the *draft* final review when the Author re-picks a concept.
 * Mirrors the po-edit / ceo-reselect edit-flow pattern (wide layout,
 * UiFooter «Скасувати / Далі») but without the CEO-suggestion blocks.
 *
 * Cascade: when the pick is a library concept other than the one the edit
 * began with, «Далі» clears external and chains to the dedicated
 * external-naming screen (re-selection required). Otherwise «Далі» saves and
 * returns to the review.
 */
const store = useConstructorStore()
const orderLocked = computed(() => isBriefOrderLocked(store.brandStatus))
const route = useRoute()
const router = useRouter()

const brandId = computed(() => route.params.id as string)

const { data: concepts, error, fetchData, perPage } = useApiList<Concept>('/api/concepts')

const selectedId = computed(() => store.stepData.concept.selectedId)
const previewId = computed(() => store.stepData.concept.previewId ?? null)
const hasBrief = computed(() => store.stepData.concept.newConceptBrief !== null)

const comment = computed({
  get: () => store.stepData.concept.comment ?? '',
  set: (val: string) => store.setConcept({ comment: val }),
})

const themeOptions = [
  { value: 'light', label: 'Світла тема' },
  { value: 'dark', label: 'Темна тема' },
] as const

const themeMode = computed({
  get: () => store.stepData.mode ?? 'light',
  set: (value: string) => {
    if (value === 'light' || value === 'dark') store.setMode(value)
  },
})

const selectedMode = computed(() => store.stepData.mode)

const isSaving = ref(false)
const primaryDisabled = computed(() => !selectedId.value && !hasBrief.value)

/**
 * Ordering a new concept, exactly as step 2 offers it — DP-15450, Final review 4
 * («При переході з Final Review у редагування Concept Selection відсутня
 * можливість замовити новий концепт»).
 *
 * The designer drew this screen: `4463:15952`, in her section `4463:14684`
 * («Product view / Edit Concept & External name»), where a red arrow runs from
 * the review's «Редагувати» straight into it. The order button is a 222×40
 * instance under the grid, and there is no CEO pair above — that pair belongs to
 * `4492:27189`, which is the OTHER edit screen (the one entered after the CEO
 * proposed a concept) and stays as it is.
 *
 * The rest of the cascade already handled a brief: `primaryDisabled` counts it
 * and `goDali` skips the external-naming hop when the pick is a brief.
 */
const isCreatingNew = ref(false)
const showNewModal = ref(false)
const showDeleteConfirm = ref(false)
const showSwitchConfirm = ref(false)
const pendingConceptId = ref<string | null>(null)

const hasFetched = ref(false)
/**
 * Skeleton on the FIRST load only — a theme switch keeps the cards it has and
 * swaps them in place. Why, at length: `views/wizard/ConceptSelectionView.vue`
 * (DP-15450, Concept Selection 2). This screen carries the same theme segment.
 */
const showSkeleton = computed(() => !hasFetched.value)

/**
 * The concept the brief had BEFORE this edit session started. Read from the
 * inline-edit snapshot (captured by `beginEditSection`), which survives the
 * concept ↔ external hop because we never re-begin the session while it is
 * already active.
 */
const baselineConceptId = computed(() => {
  const snap = store.editingSectionSnapshot as BrandConceptData | null
  return snap?.selectedId ?? null
})

async function loadConcepts() {
  perPage.value = 50
  const params: Record<string, string> = { status: 'active' }
  if (selectedMode.value) params.mode = selectedMode.value
  if (store.brandId) params.available_for_brand = store.brandId
  await fetchData(params)
  hasFetched.value = true
}

onMounted(() => {
  // Begin a fresh edit session only when one is not already active. On the
  // first entry from the review this snapshots the original concept; when the
  // user returns via «Назад» from the external screen the session is still
  // open, so we keep the original snapshot (and cascade snapshot) intact.
  if (store.editingSection !== 'concept') {
    store.beginEditSection('concept', 8)
  }
  if (store.stepData.mode == null) store.setMode('light')
  loadConcepts()
})

watch(selectedMode, loadConcepts)

watch(hasBrief, val => { isCreatingNew.value = val }, { immediate: true })

/**
 * The read-only brief modal raises a one-shot edit request when «Редагувати» is
 * pressed inside it; reuse the same `showNewModal` flow, as step 2 does.
 */
watch(
  () => store.briefPreviewEditRequested,
  kind => {
    if (kind !== 'concept') return
    showNewModal.value = true
    store.consumeBriefPreviewEditRequest()
  },
)

function applyConceptSelection(conceptId: string) {
  if (conceptId === selectedId.value) {
    store.setConcept({ selectedId: null, previewId: null })
  } else {
    store.setConcept({ selectedId: conceptId, previewId: conceptId })
  }
}

function handleSelect(conceptId: string) {
  if (hasBrief.value) {
    pendingConceptId.value = conceptId
    showSwitchConfirm.value = true
    return
  }
  applyConceptSelection(conceptId)
}

function confirmSwitchSelection() {
  const conceptId = pendingConceptId.value
  if (conceptId == null) return
  store.setNewConceptBrief(null)
  isCreatingNew.value = false
  showSwitchConfirm.value = false
  pendingConceptId.value = null
  applyConceptSelection(conceptId)
}

function cancelSwitchSelection() {
  showSwitchConfirm.value = false
  pendingConceptId.value = null
}

function handleCreateBrief() {
  showNewModal.value = true
}

function handleBriefSave(brief: NewConceptBrief) {
  store.setNewConceptBrief(brief)
  store.setConcept({ selectedId: null, previewId: null })
  showNewModal.value = false
  isCreatingNew.value = true
}

function handleBriefCancel() {
  showNewModal.value = false
  if (!hasBrief.value) isCreatingNew.value = false
}

function confirmDeleteBrief() {
  store.setNewConceptBrief(null)
  isCreatingNew.value = false
  showDeleteConfirm.value = false
}

function goCancel() {
  // Restores concept (primary snapshot) AND external (cascade snapshot, if a
  // cascade was triggered earlier this session) atomically.
  store.cancelEditSection()
  router.push(`/constructor/brand/${brandId.value}`)
}

async function goDali() {
  if (primaryDisabled.value) return

  // Cascade: a library concept other than the one this edit began with →
  // clear external and require re-selection on the next step. That includes
  // the brief whose naming step was skipped because a concept was ordered —
  // DP-15450, Final review 5; the rule and her text live in
  // `utils/draftConceptCascade.ts`.
  const chainToExternal = needsExternalNamingReselect({
    nextConceptId: store.stepData.concept.selectedId,
    baselineConceptId: baselineConceptId.value,
    isBriefConcept: store.stepData.concept.newConceptBrief !== null,
  })
  if (chainToExternal) {
    if (!Object.prototype.hasOwnProperty.call(store.cascadeSnapshots, 'externalNaming')) {
      store.captureCascadeSnapshot('externalNaming')
    }
    store.setExternalNaming({ selectedIds: [], newNamingBrief: null })
    router.push(`/constructor/brand/${brandId.value}/draft-edit/concept/external-naming`)
    return
  }

  // No cascade needed → persist and return to the review.
  isSaving.value = true
  const saved = await store.saveBrand()
  isSaving.value = false
  if (!saved) return
  store.commitEditSection()
  router.push(`/constructor/brand/${brandId.value}`)
}
</script>

<template>
  <EditFlowStepShell
    class="draft-edit-concept-view"
    title="Concept Selection"
    subtitle="Оберіть концепт та перегляньте прев'ю праворуч."
  >
    <div :class="EDIT_FLOW_BODY_OFFSET_CLASS">
      <!--
        Same block, in the same order, as `views/wizard/ConceptSelectionView.vue`
        — DP-15450, Final review 3 («Незалежно від точки входу сторінка
        редагування має мати той самий лейаут і пропорції колонок, що й при
        звичайному переході на цей крок»), and her drawing `4463:15952` shows
        exactly that: the theme switch on its own row, the grid, the order
        button, the comment.

        What was here instead: a «Концепти» label sharing the row with the
        switch, and that row held to a fixed 506 by a max-width utility while
        the grid below took the whole column — so the switch never reached the
        grid's right edge, and the further the window grew the wider the step
        became (content is 527 at 1440 and 815 at 1920). Neither the label nor
        that cap is on her drawing or on step 2. The utility's name is spelled
        out in `tests/unit/components/draftConceptEditScreen.test.ts` and
        nowhere in `src`: Tailwind v4 reads comments and prints live rules from
        anything that looks like a class.

        Column widths and card size needed no change at all: both screens size
        the panes through `useWizardPaneMetrics` (blind to `layoutMode`) and
        draw the cards with the same `ConceptGrid`.
      -->
      <div :class="EDIT_FLOW_POST_DIVIDER_CONTROL_SECTION_CLASS">
        <SegmentedControl
          v-model="themeMode"
          :options="[...themeOptions]"
          aria-label="Тема інтерфейсу"
        />

        <ConceptGridSkeleton v-if="showSkeleton" />
        <UiAsyncState v-else-if="error" :message="error" @retry="loadConcepts" />
        <ConceptGrid
          v-else-if="concepts.length > 0"
          :concepts="concepts"
          :selected-id="selectedId"
          :preview-id="previewId"
          :selection-ring="true"
          @select="handleSelect"
        />
        <div v-else class="text-center py-8 text-muted-foreground">
          <p>Концептів поки немає. Створіть новий.</p>
        </div>

        <BriefOrderButton
          create-label="Замовити новий концепт"
          created-label="Бриф концепту створено"
          :is-created="isCreatingNew"
          :locked="orderLocked"
          @create="handleCreateBrief"
          @view="store.openBriefPreview('concept', { allowEdit: !orderLocked })"
          @edit="showNewModal = true"
          @delete="showDeleteConfirm = true"
        />
      </div>

      <StepCommentField
        v-model="comment"
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
      />
    </template>

    <NewConceptModal
      v-if="showNewModal"
      :initial-data="store.stepData.concept.newConceptBrief"
      @save="handleBriefSave"
      @cancel="handleBriefCancel"
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
