<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type { InternalNaming } from '@brand-constructor/shared/types'
import NewInternalNamingModal from '@/components/constructor/NewInternalNamingModal.vue'

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

function handleEditBrief() {
  showBriefActions.value = false
  showNewModal.value = true
}

function handleDeleteBrief() {
  showBriefActions.value = false
  if (confirm('Видалити бриф нової внутрішньої назви? Дані буде втрачено.')) {
    store.setInternalNamingFeedback(null)
  }
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

      <!-- Dropdown actions -->
      <div
        v-if="showBriefActions"
        class="absolute top-full left-0 mt-1 w-56 bg-white rounded-[10px] shadow-[0px_10px_38px_-10px_rgba(22,23,24,0.35),0px_10px_20px_-15px_rgba(22,23,24,0.2)] border border-black/10 py-1 z-50"
      >
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

    <!-- Коментар -->
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-2 h-6">
        <svg
          class="size-5 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M17.5 10.6323V5.61768C17.5 4.57011 16.7694 3.69157 15.778 3.54574V3.54492C13.8649 3.26416 11.9336 3.12439 10 3.125C8.03728 3.125 6.10774 3.26851 4.22201 3.54574C3.23072 3.69155 2.5 4.57082 2.5 5.61768V10.6331C2.5 11.679 3.23061 12.5584 4.22201 12.7043C5.14811 12.8404 6.08397 12.9446 7.02962 13.0151C7.44987 13.0464 7.84078 13.2438 8.11361 13.5636L8.22347 13.7077L8.22428 13.7093L10 16.3729L11.7773 13.7069C11.9109 13.5084 12.0879 13.3425 12.2949 13.2227C12.5014 13.1031 12.7324 13.0324 12.9704 13.0151L13.6743 12.9565C14.3776 12.8914 15.0791 12.807 15.778 12.7043C16.7694 12.5584 17.5 11.6799 17.5 10.6323ZM10 8.75C10.3452 8.75 10.625 9.02982 10.625 9.375C10.625 9.72018 10.3452 10 10 10H6.25C5.90482 10 5.625 9.72018 5.625 9.375C5.625 9.02982 5.90482 8.75 6.25 8.75H10ZM13.75 6.25C14.0952 6.25 14.375 6.52982 14.375 6.875C14.375 7.22018 14.0952 7.5 13.75 7.5H6.25C5.90482 7.5 5.625 7.22018 5.625 6.875C5.625 6.52982 5.90482 6.25 6.25 6.25H13.75ZM18.75 10.6323C18.75 12.2547 17.6088 13.6987 15.9603 13.9412C14.9988 14.0827 14.0323 14.1895 13.0632 14.2619H13.0607C13.0116 14.2654 12.9642 14.2803 12.9215 14.305C12.8795 14.3293 12.8423 14.3618 12.8149 14.4019L12.8158 14.4027L10.52 17.8467C10.4041 18.0206 10.209 18.125 10 18.125C9.79103 18.125 9.59589 18.0206 9.47998 17.8467L7.18424 14.4027V14.4019C7.1438 14.3423 7.08262 14.2977 7.01172 14.2757L6.93685 14.2619C5.96099 14.1891 4.99513 14.0817 4.03971 13.9412C2.39117 13.6987 1.25 12.2539 1.25 10.6331V5.61768C1.25 3.99623 2.39105 2.55132 4.03971 2.30876C5.98556 2.02268 7.97615 1.875 10 1.875L10.7479 1.88151C12.243 1.90836 13.7356 2.01693 15.2189 2.20703L15.9603 2.30876L16.1133 2.33561C17.679 2.64234 18.75 4.046 18.75 5.61768V10.6323Z"
            fill="#5B5B62"
          />
        </svg>
        <span class="text-sm font-medium text-[#5b5b62] tracking-[-0.15px]">Коментар</span>
      </div>
      <textarea
        v-model="comment"
        rows="3"
        class="w-full px-4 py-4 bg-[rgba(197,197,200,0.2)] border border-transparent rounded-[8px] resize-none text-base leading-6 tracking-[-0.15px] placeholder:text-[rgba(61,61,61,0.5)] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        placeholder="Додайте ваші коментарі або побажання..."
      />
    </div>

    <!-- New Internal Naming Modal -->
    <NewInternalNamingModal
      v-if="showNewModal"
      :initial-feedback="store.stepData.internalNaming.newNamingFeedback"
      @save="handleFeedbackSave"
      @cancel="showNewModal = false"
    />
  </div>
</template>
