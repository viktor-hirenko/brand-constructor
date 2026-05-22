<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList, getAssetUrl } from '@/composables/useApi'
import type { Concept } from '@brand-constructor/shared/types'
import type { NewConceptBrief } from '@brand-constructor/shared/types'
import NewConceptModal from '@/components/constructor/modals/NewConceptModal.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import SimpleModal from '@/components/ui/SimpleModal.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import CheckIcon from '@/components/icons/CheckIcon.vue'
import ChevronDownIcon from '@/components/icons/ChevronDownIcon.vue'
import ImagePlaceholderIcon from '@/components/icons/ImagePlaceholderIcon.vue'
import PlusIcon from '@/components/icons/PlusIcon.vue'

const store = useConstructorStore()
const { data: concepts, loading, error, fetchData, perPage } = useApiList<Concept>('/api/concepts')

const isCreatingNew = ref(false)
const showNewModal = ref(false)
const showBriefActions = ref(false)
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
    if (value === 'light' || value === 'dark') {
      store.setMode(value)
    }
  },
})

onMounted(() => {
  perPage.value = 50
  const params: Record<string, string> = { status: 'active' }
  if (selectedMode.value) {
    params.mode = selectedMode.value
  }
  if (store.brandId) {
    params.available_for_brand = store.brandId
  }
  fetchData(params)
})

watch(selectedMode, newMode => {
  const params: Record<string, string> = { status: 'active' }
  if (newMode) {
    params.mode = newMode
  }
  if (store.brandId) {
    params.available_for_brand = store.brandId
  }
  fetchData(params)
})

watch(
  hasBrief,
  val => {
    isCreatingNew.value = val
  },
  { immediate: true }
)

function selectConcept(concept: Concept) {
  if (isCreatingNew.value) return
  store.setConcept({ selectedId: concept.id, previewId: concept.id })
}

function handleCreateNew() {
  if (isCreatingNew.value) {
    showBriefActions.value = !showBriefActions.value
  } else {
    store.setConcept({ selectedId: null, previewId: null })
    showNewModal.value = true
  }
}

function handleViewBrief() {
  showBriefActions.value = false
  store.openBriefPreview('concept')
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
  store.setNewConceptBrief(null)
  isCreatingNew.value = false
  showDeleteConfirm.value = false
}

function handleBriefSave(brief: NewConceptBrief) {
  store.setNewConceptBrief(brief)
  showNewModal.value = false
  isCreatingNew.value = true
}

function handleBriefCancel() {
  showNewModal.value = false
  if (!hasBrief.value) {
    isCreatingNew.value = false
  }
}

function closeBriefActions(e: MouseEvent) {
  if (showBriefActions.value && !(e.target as Element)?.closest('.relative.self-start')) {
    showBriefActions.value = false
  }
}

onMounted(() => document.addEventListener('click', closeBriefActions))
onUnmounted(() => document.removeEventListener('click', closeBriefActions))
</script>

<template>
  <div class="flex flex-col gap-6">
    <SegmentedControl
      v-model="themeMode"
      :options="[...themeOptions]"
      aria-label="Тема інтерфейсу"
    />

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-12">
      <p class="text-red-500 mb-3">{{ error }}</p>
      <button
        class="text-primary underline text-sm"
        @click="fetchData({ status: 'active', ...(selectedMode ? { mode: selectedMode } : {}) })"
      >
        Спробувати знову
      </button>
    </div>

    <template v-else>
      <!-- Concepts grid -->
      <div class="grid grid-cols-3 gap-2 max-w-[506px]">
        <div
          v-for="concept in concepts"
          :key="concept.id"
          class="relative group rounded-[16px] overflow-hidden transition-[border-color,opacity] duration-200 w-full aspect-square border-2"
          :class="[
            isCreatingNew ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
            selectedId === concept.id ? 'border-[#030213]' : 'border-[rgba(3,2,19,0.1)]',
          ]"
          @click="selectConcept(concept)"
        >
          <div class="w-full h-full absolute inset-0 bg-muted overflow-hidden">
            <img
              v-if="concept.visual_url"
              :src="getAssetUrl(concept.visual_url)"
              :alt="concept.name"
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center text-muted-foreground"
            >
              <ImagePlaceholderIcon class="size-12 opacity-30" />
            </div>

            <!-- Default dimming; hidden when selected; hover clears dim on idle cards -->
            <div
              class="absolute inset-0 bg-black/45 transition-opacity z-[1] pointer-events-none"
              :class="
                selectedId === concept.id
                  ? 'opacity-0'
                  : isCreatingNew
                    ? 'opacity-100'
                    : 'opacity-100 group-hover:opacity-0'
              "
            />

            <div
              class="absolute inset-0 bg-gradient-to-t from-black/[0.75] via-transparent to-transparent z-[2] pointer-events-none"
            />

            <div class="absolute bottom-0 left-0 right-0 p-4 z-[3]">
              <h3
                class="text-white font-medium text-[16px] leading-6 tracking-[-0.4492px] truncate"
              >
                {{ concept.name }}
              </h3>
            </div>

            <!-- Final selection badge (white circle, dark check — Figma) -->
            <div
              v-if="selectedId === concept.id"
              class="absolute top-[8px] left-[8px] size-7 rounded-full bg-white border border-black/10 flex items-center justify-center shadow-[0px_8px_10px_0px_rgba(0,0,0,0.2)] z-[4]"
            >
              <CheckIcon class="size-4 text-[#030213]" />
            </div>
          </div>

          <Transition
            enter-active-class="transition-opacity duration-200"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-200"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div
              v-if="selectedId === concept.id"
              class="pointer-events-none absolute inset-0 z-[5] rounded-[14px] border-4 border-white"
              aria-hidden="true"
            />
          </Transition>
        </div>
      </div>

      <!-- Create New Concept button / Brief created state -->
      <div class="relative self-start">
        <button
          v-if="!isCreatingNew"
          type="button"
          class="inline-flex items-center gap-2 h-[40px] px-4 rounded-[8px] transition-colors text-base font-medium leading-6 tracking-[-0.31px] bg-[rgba(3,2,19,0.1)] text-[#030213] hover:bg-[rgba(3,2,19,0.15)]"
          @click="handleCreateNew"
        >
          <PlusIcon class="size-4" />
          Замовити новий концепт
        </button>

        <button
          v-else
          type="button"
          class="inline-flex items-center gap-2 h-[40px] px-4 rounded-[8px] transition-colors text-base font-medium leading-6 tracking-[-0.31px] bg-[#030213] text-white hover:opacity-90"
          @click="handleCreateNew"
        >
          <CheckIcon class="size-4" />
          Бриф концепту створено
          <ChevronDownIcon
            class="size-3 ml-1 transition-transform"
            :class="showBriefActions ? 'rotate-180' : ''"
          />
        </button>

        <!-- Dropdown actions -->
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

      <!-- Empty state -->
      <div v-if="concepts.length === 0 && !loading" class="text-center py-8 text-muted-foreground">
        <p>Концептів поки немає. Створіть новий.</p>
      </div>
    </template>

    <!-- Коментар -->
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
