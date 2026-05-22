<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type { ExternalNaming } from '@brand-constructor/shared/types'
import type { NewNamingBrief } from '@brand-constructor/shared/types'
import NewNamingModal from '@/components/constructor/modals/NewNamingModal.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import SimpleModal from '@/components/ui/SimpleModal.vue'

const store = useConstructorStore()

const {
  data: namings,
  loading,
  error,
  fetchData,
} = useApiList<ExternalNaming>('/api/namings/external')

const comment = computed({
  get: () => store.stepData.externalNaming.comment,
  set: (val: string) => store.setExternalNaming({ comment: val }),
})

const selectedIds = computed(() => store.stepData.externalNaming.selectedIds)
const selectedCount = computed(() => selectedIds.value.length)

const sortedNamings = computed(() => {
  return [...(namings.value ?? [])].sort((a, b) => {
    const rank = (n: ExternalNaming) => (n.availability_status === 'available' ? 0 : 1)
    return rank(a) - rank(b)
  })
})
const isCreatingNew = computed(() => store.stepData.externalNaming.newNamingBrief !== null)
const isCommentRequired = computed(() => selectedCount.value > 1)

const showNewModal = ref(false)
const showBriefActions = ref(false)
const showDeleteConfirm = ref(false)

const selectedConceptId = computed(() => store.stepData.concept.selectedId)

function isSold(naming: ExternalNaming): boolean {
  return naming.availability_status === 'sold'
}

function toggleNaming(naming: ExternalNaming) {
  if (isCreatingNew.value || isSold(naming)) return
  store.toggleExternalNaming(naming.id)
}

function isSelected(id: string): boolean {
  return selectedIds.value.includes(id)
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
  store.openBriefPreview('externalNaming')
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
  store.setNewNamingBrief(null)
  showDeleteConfirm.value = false
}

function handleBriefSave(brief: NewNamingBrief) {
  store.setNewNamingBrief(brief)
  store.setExternalNaming({ selectedIds: [] })
  showNewModal.value = false
}

function closeBriefActions(e: MouseEvent) {
  if (showBriefActions.value && !(e.target as Element)?.closest('.relative.self-start')) {
    showBriefActions.value = false
  }
}

async function loadNamings() {
  const params: Record<string, string> = { per_page: '50', status: 'active' }
  if (selectedConceptId.value) {
    params.concept_id = selectedConceptId.value
  }
  if (store.brandId) {
    params.available_for_brand = store.brandId
  }
  await fetchData(params)

  const validIds = new Set(namings.value.map(n => n.id))
  const staleIds = selectedIds.value.filter(id => !validIds.has(id))
  if (staleIds.length > 0) {
    store.setExternalNaming({
      selectedIds: selectedIds.value.filter(id => validIds.has(id)),
    })
  }
}

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return ''
  return `$${price.toLocaleString('uk-UA').replace(/,/g, ' ')}`
}

function getStatusLabel(status: string | null): string {
  switch (status) {
    case 'available':
      return 'Available'
    case 'sold':
      return 'Sold'
    default:
      return ''
  }
}

function getStatusBadgeClass(status: string | null): string {
  switch (status) {
    case 'available':
      return 'bg-[#d4fde5] text-[#006929]'
    case 'sold':
      return 'bg-[#fdd4d4] text-[#9e0101]'
    default:
      return 'bg-gray-100 text-gray-600'
  }
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
          v-for="naming in sortedNamings"
          :key="naming.id"
          class="relative w-full rounded-[16px] bg-white flex flex-col items-center gap-2 px-6 py-10 transition-all"
          :class="[
            isSold(naming)
              ? 'border border-black/10 cursor-not-allowed'
              : isSelected(naming.id)
                ? 'border-2 border-[#030213] cursor-pointer'
                : isCreatingNew
                  ? 'border border-black/10 opacity-40 cursor-not-allowed'
                  : 'border border-black/10 hover:border-primary/50 cursor-pointer',
          ]"
          @click="toggleNaming(naming)"
        >
          <div
            class="flex flex-col items-center gap-2 w-full text-center tracking-[-0.15px]"
            :class="isSold(naming) ? 'opacity-50' : ''"
          >
            <div class="flex flex-col gap-1 w-full">
              <p class="text-[20px] font-medium leading-6 text-[#1a1a1a] w-full break-words">
                {{ naming.name }}
              </p>
              <p
                v-if="naming.domain"
                class="text-[12px] font-normal leading-4 text-[#4b4b58] w-full truncate"
              >
                ({{ naming.domain }})
              </p>
            </div>
            <p
              v-if="naming.price !== null"
              class="text-[16px] font-medium leading-6 text-[#1a1a1a] w-full"
            >
              {{ formatPrice(naming.price) }}
            </p>
          </div>

          <!-- Status badge -->
          <div
            v-if="naming.availability_status"
            class="backdrop-blur-[5px] flex items-center justify-center px-2 py-1 rounded-[8px]"
            :class="[getStatusBadgeClass(naming.availability_status), isSold(naming) ? 'opacity-50' : '']"
          >
            <span class="text-[12px] font-medium leading-4 tracking-[-0.31px]">
              {{ getStatusLabel(naming.availability_status) }}
            </span>
          </div>

          <!-- Checkmark badge (top-left per Figma) -->
          <div
            v-if="isSelected(naming.id)"
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
        <p>Неймінги не знайдено</p>
      </div>
    </template>

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
        class="inline-flex items-center gap-2 h-[40px] px-4 rounded-[8px] transition-colors text-base font-medium leading-6 tracking-[-0.31px] bg-[#030213] text-white hover:opacity-90"
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
        Бриф неймінгу створено
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

    <!-- Коментар -->
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
