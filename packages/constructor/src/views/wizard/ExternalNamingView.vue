<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type { ExternalNaming, NewNamingBrief } from '@brand-constructor/shared/types'
import NewNamingModal from '@/components/constructor/modals/NewNamingModal.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import SimpleModal from '@/components/ui/SimpleModal.vue'
import ExternalNamingGrid from '@/components/constructor/alternative-selection/ExternalNamingGrid.vue'
import ExternalNamingGridSkeleton from '@/components/constructor/skeletons/ExternalNamingGridSkeleton.vue'
import BriefOrderButton from '@/components/constructor/edit-flow/BriefOrderButton.vue'
import { isExternalNamingCommentRequired, getExternalNamingCommentHint } from '@/utils/externalNamingValidation'

const store = useConstructorStore()
const { data: namings, loading, error, fetchData } = useApiList<ExternalNaming>(
  '/api/namings/external',
)

const comment = computed({
  get: () => store.stepData.externalNaming.comment,
  set: (val: string) => store.setExternalNaming({ comment: val }),
})

const selectedIds = computed(() => store.stepData.externalNaming.selectedIds)
const isCreatingNew = computed(() => store.stepData.externalNaming.newNamingBrief !== null)

const isCommentRequired = computed(() =>
  isExternalNamingCommentRequired(selectedIds.value, namings.value),
)

const commentHint = computed(() =>
  getExternalNamingCommentHint(selectedIds.value, namings.value),
)

const selectedConceptId = computed(() => store.stepData.concept.selectedId)

const showNewModal = ref(false)
const showDeleteConfirm = ref(false)

async function loadNamings() {
  const params: Record<string, string> = { per_page: '50', status: 'active' }
  if (selectedConceptId.value) params.concept_id = selectedConceptId.value
  if (store.brandId) params.available_for_brand = store.brandId
  await fetchData(params)

  const validIds = new Set(namings.value.map(n => n.id))
  const staleIds = selectedIds.value.filter(id => !validIds.has(id))
  if (staleIds.length > 0) {
    store.setExternalNaming({ selectedIds: selectedIds.value.filter(id => validIds.has(id)) })
  }
}

onMounted(loadNamings)

function handleBriefSave(brief: NewNamingBrief) {
  store.setNewNamingBrief(brief)
  store.setExternalNaming({ selectedIds: [] })
  showNewModal.value = false
}

function confirmDeleteBrief() {
  store.setNewNamingBrief(null)
  showDeleteConfirm.value = false
}

/**
 * The read-only brief modal raises a one-shot edit request when the user
 * clicks «Редагувати»; reuse the existing `showNewModal` flow so the same
 * `NewNamingModal` instance handles both view → edit transitions.
 */
watch(
  () => store.briefPreviewEditRequested,
  kind => {
    if (kind !== 'externalNaming') return
    showNewModal.value = true
    store.consumeBriefPreviewEditRequest()
  },
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <ExternalNamingGridSkeleton v-if="loading" />
    <div v-else-if="error" class="text-center py-12">
      <p class="text-red-500 mb-3">{{ error }}</p>
      <button class="text-primary underline text-sm" @click="loadNamings">
        Спробувати знову
      </button>
    </div>
    <ExternalNamingGrid
      v-else
      :namings="namings"
      :selected-ids="selectedIds"
      :disabled="isCreatingNew"
      @toggle="store.toggleExternalNaming"
    />

    <BriefOrderButton
      create-label="Замовити нову назву"
      created-label="Бриф неймінгу створено"
      :is-created="isCreatingNew"
      @create="showNewModal = true"
      @view="store.openBriefPreview('externalNaming')"
      @edit="showNewModal = true"
      @delete="showDeleteConfirm = true"
    />

    <StepCommentField
      v-model="comment"
      :required="isCommentRequired"
      :required-hint="commentHint"
    />

    <NewNamingModal
      v-if="showNewModal"
      :initial-data="store.stepData.externalNaming.newNamingBrief"
      @save="handleBriefSave"
      @cancel="showNewModal = false"
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
