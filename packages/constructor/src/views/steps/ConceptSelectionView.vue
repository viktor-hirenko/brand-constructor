<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type { Concept, NewConceptBrief } from '@brand-constructor/shared/types'
import NewConceptModal from '@/components/constructor/modals/NewConceptModal.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import SimpleModal from '@/components/ui/SimpleModal.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import ConceptGrid from '@/components/constructor/ceo-reselect/ConceptGrid.vue'
import BriefOrderButton from '@/components/constructor/edit-flow/BriefOrderButton.vue'
import AsyncStateBoundary from '@/components/ui/AsyncStateBoundary.vue'

const store = useConstructorStore()
const { data: concepts, loading, error, fetchData, perPage } = useApiList<Concept>('/api/concepts')

const isCreatingNew = ref(false)
const showNewModal = ref(false)
const showDeleteConfirm = ref(false)

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

function loadConcepts() {
  const params: Record<string, string> = { status: 'active' }
  if (selectedMode.value) params.mode = selectedMode.value
  if (store.brandId) params.available_for_brand = store.brandId
  fetchData(params)
}

onMounted(() => {
  perPage.value = 50
  loadConcepts()
})

watch(selectedMode, loadConcepts)

watch(hasBrief, val => { isCreatingNew.value = val }, { immediate: true })

function handleSelect(conceptId: string) {
  store.setConcept({ selectedId: conceptId, previewId: conceptId })
}

function handleCreateBrief() {
  store.setConcept({ selectedId: null, previewId: null })
  showNewModal.value = true
}

function handleBriefSave(brief: NewConceptBrief) {
  store.setNewConceptBrief(brief)
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
    <SegmentedControl
      v-model="themeMode"
      :options="[...themeOptions]"
      aria-label="Тема інтерфейсу"
    />

    <AsyncStateBoundary :loading="loading" :error="error" @retry="loadConcepts">
      <ConceptGrid
        v-if="concepts.length > 0"
        :concepts="concepts"
        :selected-id="selectedId"
        :preview-id="previewId"
        :disabled="isCreatingNew"
        :selection-ring="true"
        @select="handleSelect"
      />
      <div v-else class="text-center py-8 text-muted-foreground">
        <p>Концептів поки немає. Створіть новий.</p>
      </div>
    </AsyncStateBoundary>

    <BriefOrderButton
      create-label="Замовити новий концепт"
      created-label="Бриф концепту створено"
      :is-created="isCreatingNew"
      @create="handleCreateBrief"
      @view="store.openBriefPreview('concept')"
      @edit="showNewModal = true"
      @delete="showDeleteConfirm = true"
    />

    <StepCommentField v-model="comment" />

    <NewConceptModal
      v-if="showNewModal"
      :initial-data="store.stepData.concept.newConceptBrief"
      @save="handleBriefSave"
      @cancel="handleBriefCancel"
    />

    <SimpleModal
      v-if="showDeleteConfirm"
      title="Видалити бриф?"
      body="Дані брифу буде втрачено. Цю дію неможливо скасувати."
      cancel-label="Скасувати"
      primary-label="Видалити"
      @cancel="showDeleteConfirm = false"
      @primary="confirmDeleteBrief"
    />
  </div>
</template>
