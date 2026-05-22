<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type { InternalNaming } from '@brand-constructor/shared/types'
import NewInternalNamingModal from '@/components/constructor/modals/NewInternalNamingModal.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import SimpleModal from '@/components/ui/SimpleModal.vue'

const store = useConstructorStore()

const {
  data: namings,
  loading,
  error,
  fetchData,
} = useApiList<InternalNaming>('/api/namings/internal')

const comment = computed({
  get: () => store.stepData.internalNaming.comment,
  set: (val: string) => store.setInternalNaming({ comment: val }),
})

const selectedId = computed(() => store.stepData.internalNaming.selectedId)
const isCreatingNew = computed(() => store.stepData.internalNaming.newNamingFeedback !== null)

const showNewModal = ref(false)
const showBriefActions = ref(false)
const showDeleteConfirm = ref(false)

function selectNaming(id: string) {
  if (isCreatingNew.value) return
  store.selectInternalNaming(id)
}

function handleCreateNew() {
  if (isCreatingNew.value) {
    showBriefActions.value = !showBriefActions.value
  } else {
    showNewModal.value = true
  }
}

function handleViewBrief() {
  showBriefActions.value = false
  store.openBriefPreview('internalNaming')
}

function handleEditBrief() {
  showBriefActions.value = false
  showNewModal.value = true
}

function handleDeleteBrief() {
  showBriefActions.value = false
  showDeleteConfirm.value = true
}

function confirmDeleteBrief() {
  store.setInternalNamingFeedback(null)
  showDeleteConfirm.value = false
}

function handleFeedbackSave(feedback: string) {
  store.setInternalNamingFeedback(feedback)
  store.setInternalNaming({ selectedId: null })
  showNewModal.value = false
}

function closeBriefActions(e: MouseEvent) {
  if (showBriefActions.value && !(e.target as Element)?.closest('.relative.self-start')) {
    showBriefActions.value = false
  }
}

function loadNamings() {
  const params: Record<string, string> = { per_page: '50', status: 'active' }
  if (store.brandId) {
    params.available_for_brand = store.brandId
  }
  fetchData(params)
}

onMounted(() => {
  loadNamings()
  document.addEventListener('click', closeBriefActions)
})
onUnmounted(() => document.removeEventListener('click', closeBriefActions))
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-16 text-red-500">
      <p>{{ error }}</p>
      <button
        class="mt-4 px-4 py-2 bg-primary text-white rounded-[10px] text-sm"
        @click="loadNamings"
      >
        Спробувати знову
      </button>
    </div>

    <!-- Naming Cards Grid -->
    <template v-else>
      <div v-if="namings.length > 0" class="grid grid-cols-3 gap-2 max-w-[506px]">
        <div
          v-for="naming in namings"
          :key="naming.id"
          class="relative w-full min-h-[128px] rounded-[16px] bg-white flex flex-col items-center justify-center px-6 py-10 transition-all"
          :class="[
            selectedId === naming.id
              ? 'border-2 border-[#030213] cursor-pointer'
              : isCreatingNew
                ? 'border border-black/10 opacity-40 cursor-not-allowed'
                : 'border border-black/10 hover:border-primary/50 cursor-pointer',
          ]"
          @click="selectNaming(naming.id)"
        >
          <p
            class="text-[20px] font-medium leading-6 text-center text-[#1a1a1a] tracking-[-0.15px] break-words w-full"
          >
            {{ naming.name }}
          </p>

          <!-- Checkmark badge (top-left per Figma) -->
          <div
            v-if="selectedId === naming.id"
            class="absolute top-[6px] left-[6px] size-8 rounded-full bg-[#030213] flex items-center justify-center"
          >
            <svg
              class="size-4 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-16 text-muted-foreground">
        <svg
          class="size-16 mx-auto mb-4 opacity-30"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        </svg>
        <p>Внутрішні неймінги не знайдено</p>
      </div>
    </template>

    <!-- Create New Internal Naming button / Brief created state -->
    <div class="relative self-start">
      <button
        v-if="!isCreatingNew"
        type="button"
        class="inline-flex items-center gap-2 h-[40px] px-3 rounded-[8px] transition-colors text-base font-medium tracking-[-0.31px] bg-[#e0e0e4] text-[#030213] hover:bg-[rgba(3,2,19,0.15)]"
        @click="handleCreateNew"
      >
        <svg
          class="size-4"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
        Замовити нову назву
      </button>

      <button
        v-else
        type="button"
        class="inline-flex items-center gap-2 h-[40px] px-3 rounded-[8px] transition-colors text-base font-medium tracking-[-0.31px] bg-[#030213] text-white hover:opacity-90"
        @click="handleCreateNew"
      >
        <svg
          class="size-4"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        Бриф назви створено
        <svg
          class="size-3 ml-1 transition-transform"
          :class="showBriefActions ? 'rotate-180' : ''"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div
        v-if="showBriefActions"
        class="absolute top-full left-0 mt-1 w-56 bg-white rounded-[10px] shadow-[0px_10px_38px_-10px_rgba(22,23,24,0.35),0px_10px_20px_-15px_rgba(22,23,24,0.2)] border border-black/10 py-1 z-50"
      >
        <button
          type="button"
          class="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-[#f3f3f5] transition-colors"
          @click="handleViewBrief"
        >
          Переглянути бриф
        </button>
        <button
          type="button"
          class="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-[#f3f3f5] transition-colors"
          @click="handleEditBrief"
        >
          Редагувати бриф
        </button>
        <button
          type="button"
          class="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          @click="handleDeleteBrief"
        >
          Видалити бриф
        </button>
      </div>
    </div>

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
