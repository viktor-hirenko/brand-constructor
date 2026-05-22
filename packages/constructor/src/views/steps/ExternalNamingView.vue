<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type { ExternalNaming, NewNamingBrief } from '@brand-constructor/shared/types'
import NewNamingModal from '@/components/constructor/modals/NewNamingModal.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import SimpleModal from '@/components/ui/SimpleModal.vue'
import ExternalNamingGrid from '@/components/constructor/ceo-reselect/ExternalNamingGrid.vue'
import BriefOrderButton from '@/components/constructor/edit-flow/BriefOrderButton.vue'
import AsyncStateBoundary from '@/components/ui/AsyncStateBoundary.vue'

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
const isCommentRequired = computed(() => selectedIds.value.length > 1)

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
</script>

<template>
  <div class="flex flex-col gap-6">
    <AsyncStateBoundary :loading="loading" :error="error" @retry="loadNamings">
      <ExternalNamingGrid
        :namings="namings"
        :selected-ids="selectedIds"
        :disabled="isCreatingNew"
        @toggle="store.toggleExternalNaming"
      />
    </AsyncStateBoundary>

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
      required-hint="Коментар є обовʼязковим при виборі більше 1 неймінгу"
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
