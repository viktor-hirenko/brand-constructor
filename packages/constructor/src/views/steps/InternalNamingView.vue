<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type { InternalNaming } from '@brand-constructor/shared/types'
import NewInternalNamingModal from '@/components/constructor/modals/NewInternalNamingModal.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import SimpleModal from '@/components/ui/SimpleModal.vue'
import InternalNamingGrid from '@/components/constructor/ceo-reselect/InternalNamingGrid.vue'
import BriefOrderButton from '@/components/constructor/edit-flow/BriefOrderButton.vue'
import AsyncStateBoundary from '@/components/ui/AsyncStateBoundary.vue'

const store = useConstructorStore()
const { data: namings, loading, error, fetchData } = useApiList<InternalNaming>(
  '/api/namings/internal',
)

const comment = computed({
  get: () => store.stepData.internalNaming.comment,
  set: (val: string) => store.setInternalNaming({ comment: val }),
})

const selectedId = computed(() => store.stepData.internalNaming.selectedId)
const isCreatingNew = computed(() => store.stepData.internalNaming.newNamingFeedback !== null)

const showNewModal = ref(false)
const showDeleteConfirm = ref(false)

function loadNamings() {
  const params: Record<string, string> = { per_page: '50', status: 'active' }
  if (store.brandId) params.available_for_brand = store.brandId
  fetchData(params)
}

onMounted(loadNamings)

function handleFeedbackSave(feedback: string) {
  store.setInternalNamingFeedback(feedback)
  store.setInternalNaming({ selectedId: null })
  showNewModal.value = false
}

function confirmDeleteBrief() {
  store.setInternalNamingFeedback(null)
  showDeleteConfirm.value = false
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AsyncStateBoundary :loading="loading" :error="error" @retry="loadNamings">
      <InternalNamingGrid
        :namings="namings"
        :selected-id="selectedId"
        :disabled="isCreatingNew"
        @select="store.selectInternalNaming"
      />
    </AsyncStateBoundary>

    <BriefOrderButton
      create-label="Замовити нову назву"
      created-label="Бриф назви створено"
      :is-created="isCreatingNew"
      @create="showNewModal = true"
      @view="store.openBriefPreview('internalNaming')"
      @edit="showNewModal = true"
      @delete="showDeleteConfirm = true"
    />

    <StepCommentField v-model="comment" />

    <NewInternalNamingModal
      v-if="showNewModal"
      :initial-feedback="store.stepData.internalNaming.newNamingFeedback"
      @save="handleFeedbackSave"
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
