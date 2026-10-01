<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { isBriefOrderLocked } from '@/utils/briefOrderLock'
import { useApiList } from '@/composables/useApi'
import type { InternalNaming } from '@brand-constructor/shared/types'
import NewInternalNamingModal from '@/components/constructor/modals/NewInternalNamingModal.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue'
import InternalNamingGrid from '@/components/constructor/alternative-selection/InternalNamingGrid.vue'
import InternalNamingGridSkeleton from '@/components/constructor/skeletons/InternalNamingGridSkeleton.vue'
import BriefOrderButton from '@/components/constructor/edit-flow/BriefOrderButton.vue'
import UiAsyncState from '@/components/ui/UiAsyncState.vue'

const store = useConstructorStore()
const orderLocked = computed(() => isBriefOrderLocked(store.brandStatus))
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
const showSwitchConfirm = ref(false)
const pendingNamingId = ref<string | null>(null)

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

function handleSelect(namingId: string) {
  if (isCreatingNew.value) {
    pendingNamingId.value = namingId
    showSwitchConfirm.value = true
    return
  }
  store.selectInternalNaming(namingId)
}

function confirmSwitchSelection() {
  const namingId = pendingNamingId.value
  if (namingId == null) return
  store.setInternalNamingFeedback(null)
  showSwitchConfirm.value = false
  pendingNamingId.value = null
  store.selectInternalNaming(namingId)
}

function cancelSwitchSelection() {
  showSwitchConfirm.value = false
  pendingNamingId.value = null
}

/**
 * The read-only brief modal raises a one-shot edit request when the user
 * clicks «Редагувати»; reuse the existing `showNewModal` flow so the same
 * `NewInternalNamingModal` instance handles both view → edit transitions.
 */
watch(
  () => store.briefPreviewEditRequested,
  kind => {
    if (kind !== 'internalNaming') return
    showNewModal.value = true
    store.consumeBriefPreviewEditRequest()
  },
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <InternalNamingGridSkeleton v-if="loading" />
    <UiAsyncState v-else-if="error" :message="error" @retry="loadNamings" />
    <InternalNamingGrid
      v-else
      :namings="namings"
      :selected-id="selectedId"
      @select="handleSelect"
    />

    <BriefOrderButton
      create-label="Замовити нову назву"
      created-label="Бриф назви створено"
      :is-created="isCreatingNew"
      :locked="orderLocked"
      @create="showNewModal = true"
      @view="store.openBriefPreview('internalNaming', { allowEdit: !orderLocked })"
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
      title="Обрати цю назву?"
      body="При виборі назви створений бриф буде видалено. Цю дію неможливо скасувати."
      cancel-label="Скасувати"
      primary-label="Обрати назву"
      @cancel="cancelSwitchSelection"
      @primary="confirmSwitchSelection"
    />
  </div>
</template>
