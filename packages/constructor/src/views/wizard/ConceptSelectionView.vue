<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type { Concept, NewConceptBrief } from '@brand-constructor/shared/types'
import NewConceptModal from '@/components/constructor/modals/NewConceptModal.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import ConceptGrid from '@/components/constructor/alternative-selection/ConceptGrid.vue'
import ConceptGridSkeleton from '@/components/constructor/skeletons/ConceptGridSkeleton.vue'
import BriefOrderButton from '@/components/constructor/edit-flow/BriefOrderButton.vue'
import UiAsyncState from '@/components/ui/UiAsyncState.vue'

const store = useConstructorStore()
const { data: concepts, error, fetchData, perPage } = useApiList<Concept>('/api/concepts')

const isCreatingNew = ref(false)
const showNewModal = ref(false)
const showDeleteConfirm = ref(false)
const showSwitchConfirm = ref(false)
const pendingConceptId = ref<string | null>(null)

const selectedId = computed(() => store.stepData.concept.selectedId)
const previewId = computed(() => store.stepData.concept.previewId ?? null)
const hasBrief = computed(() => store.stepData.concept.newConceptBrief !== null)
const comment = computed({
  get: () => store.stepData.concept.comment,
  set: (val: string) => store.setConcept({ comment: val }),
})

const selectedMode = computed(() => store.stepData.mode)

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

const hasFetched = ref(false)

/**
 * DP-15450, Concept Selection 2 — «При перемиканні світлої/темної теми
 * змінюється позиція progress bar і розмір карток концептів. → При перемиканні
 * теми layout не має стрибати.»
 *
 * The theme segment refetches the list (`watch(selectedMode, loadConcepts)`),
 * and while that was in flight the grid was replaced by a SIX-tile skeleton
 * regardless of how many concepts either theme actually has. The block
 * therefore changed height twice on every switch — N cards → 6 tiles → M cards
 * — and everything under it (the order button, the comment field) moved with
 * it. `useApi` keeps `data` until the new result lands, so the cure is simply
 * to stop asking for the skeleton once a list has been shown: the cards on
 * screen stay put and swap in place.
 *
 * The progress bar half of her замечання is already gone by construction: the
 * rule now lives in `UiWizardHeader` above both columns, not inside the
 * scrolling left pane it used to sit in. Card SIZE is likewise stable — the
 * grid is `auto-fill` over `--wizard-concept-card-min`, so it follows the
 * column width, and the column reserves its scrollbar gutter (`wizard-scrollbar`,
 * `scrollbar-gutter: stable`) whether or not the content overflows.
 */
const showSkeleton = computed(() => !hasFetched.value)

async function loadConcepts() {
  const params: Record<string, string> = { status: 'active' }
  if (selectedMode.value) params.mode = selectedMode.value
  if (store.brandId) params.available_for_brand = store.brandId
  await fetchData(params)
  hasFetched.value = true
}

onMounted(() => {
  perPage.value = 50
  // Server drafts may have mode null; UI shows light via ?? but API/validation need a real value.
  if (store.stepData.mode == null) {
    store.setMode('light')
  }
  loadConcepts()
})

watch(selectedMode, loadConcepts)

watch(hasBrief, val => { isCreatingNew.value = val }, { immediate: true })

/**
 * The read-only brief modal raises a one-shot edit request when the user
 * clicks «Редагувати»; reuse the existing `showNewModal` flow so the same
 * `NewConceptModal` instance handles both view → edit transitions.
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
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Kit `5382:44776`: inside the selection block the gap is `spacing/16`
         — segmented control → grid → order button. The 24 stays only between
         that block and the comment field, which is where the kit's own
         Container ends (`5382:44774`: inner container 371.5 tall at y 88, the
         Input at y 483.5). -->
    <div class="flex flex-col gap-4">
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
        @create="handleCreateBrief"
        @view="store.openBriefPreview('concept')"
        @edit="showNewModal = true"
        @delete="showDeleteConfirm = true"
      />
    </div>

    <StepCommentField v-model="comment" />

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
  </div>
</template>
