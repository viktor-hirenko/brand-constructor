<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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

function selectNaming(id: string) {
  if (isCreatingNew.value) return
  store.selectInternalNaming(id)
}

function handleCreateNew() {
  if (isCreatingNew.value) {
    store.setInternalNamingFeedback(null)
  } else {
    showNewModal.value = true
  }
}

function handleFeedbackSave(feedback: string) {
  store.setInternalNamingFeedback(feedback)
  store.setInternalNaming({ selectedId: null })
  showNewModal.value = false
}

function loadNamings() {
  const params: Record<string, string> = { per_page: '50', status: 'active' }
  if (store.brandId) {
    params.available_for_brand = store.brandId
  }
  fetchData(params)
}

onMounted(loadNamings)
</script>

<template>
  <div class="flex flex-col gap-6">
    <p class="text-muted-foreground text-base tracking-[-0.31px]">
      Оберіть назву для внутрішньої комунікації команди
    </p>

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
      <div v-if="namings.length > 0" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div
          v-for="naming in namings"
          :key="naming.id"
          class="relative rounded-[14px] overflow-hidden border-2 transition-all cursor-pointer bg-white"
          :class="[
            selectedId === naming.id
              ? 'border-[#030213] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]'
              : isCreatingNew
                ? 'border-black/10 opacity-40 cursor-not-allowed'
                : 'border-black/10 hover:border-primary/50',
          ]"
          @click="selectNaming(naming.id)"
        >
          <div class="aspect-[2/1] relative flex flex-col items-center justify-center p-3">
            <h2 class="text-center text-4xl font-medium tracking-[0.37px] text-[#0a0a0a] mb-2">
              {{ naming.name }}
            </h2>
            <p class="text-sm text-muted-foreground text-center tracking-[-0.15px]">
              {{ naming.tagline || '\u00A0' }}
            </p>
          </div>

          <!-- Checkmark badge -->
          <div
            v-if="selectedId === naming.id"
            class="absolute top-4 right-4 size-8 rounded-full bg-[#030213] flex items-center justify-center shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)]"
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

    <!-- Create New Internal Naming button -->
    <button
      type="button"
      class="inline-flex items-center gap-2 h-[40px] px-4 rounded-[10px] transition-colors text-base font-medium tracking-[-0.31px] self-start"
      :class="
        isCreatingNew
          ? 'bg-[#030213] text-white hover:opacity-90'
          : 'bg-[rgba(3,2,19,0.1)] text-[#030213] hover:bg-[rgba(3,2,19,0.15)]'
      "
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
      {{ isCreatingNew ? 'Скасувати замовлення' : 'Create New Internal Name' }}
    </button>

    <!-- Коментар -->
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <svg
          class="size-4 text-foreground"
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
          <path d="M10 9H8" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
        </svg>
        <span class="text-base font-medium text-foreground tracking-[-0.31px]"> Коментар </span>
      </div>
      <textarea
        v-model="comment"
        rows="3"
        class="w-full px-4 py-3 bg-[#f3f3f5] border border-transparent rounded-[10px] resize-none text-base tracking-[-0.31px] placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        placeholder="Додайте ваші коментарі або побажання..."
      />
    </div>

    <!-- New Internal Naming Modal -->
    <NewInternalNamingModal
      v-if="showNewModal"
      @save="handleFeedbackSave"
      @cancel="showNewModal = false"
    />
  </div>
</template>
