<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList, getAssetUrl, apiGet } from '@/composables/useApi'
import type { Concept } from '@brand-constructor/shared/types'
import type { NewConceptBrief } from '@brand-constructor/shared/types'
import ConceptDetailOverlay from '@/components/constructor/ConceptDetailOverlay.vue'
import NewConceptModal from '@/components/constructor/NewConceptModal.vue'

const store = useConstructorStore()
const { data: concepts, loading, error, fetchData, perPage } = useApiList<Concept>('/api/concepts')

const isCreatingNew = ref(false)
const detailConcept = ref<Concept | null>(null)
const showNewModal = ref(false)
const showBriefActions = ref(false)
const showBriefPreview = ref(false)

const selectedId = computed(() => store.stepData.concept.selectedId)
const hasBrief = computed(() => store.stepData.concept.newConceptBrief !== null)
const comment = computed({
  get: () => store.stepData.concept.comment,
  set: (val: string) => store.setConcept({ comment: val }),
})

const selectedMode = computed(() => store.stepData.mode)

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
  if (selectedId.value === concept.id) {
    store.setConcept({ selectedId: null })
  } else {
    store.setConcept({ selectedId: concept.id, newConceptBrief: null })
  }
}

async function openDetail(concept: Concept, event: Event) {
  event.stopPropagation()
  detailConcept.value = concept
  try {
    const full = await apiGet<Concept & { namings?: unknown[]; assets?: unknown[] }>(
      `/api/concepts/${concept.id}`
    )
    detailConcept.value = full
  } catch {
    /* залишаємо дані зі списку */
  }
}

function closeDetail() {
  detailConcept.value = null
}

function selectFromDetail() {
  if (detailConcept.value) {
    store.setConcept({ selectedId: detailConcept.value.id, newConceptBrief: null })
    isCreatingNew.value = false
  }
  closeDetail()
}

function handleCreateNew() {
  if (isCreatingNew.value) {
    showBriefActions.value = !showBriefActions.value
  } else {
    store.setConcept({ selectedId: null })
    showNewModal.value = true
  }
}

function handleViewBrief() {
  showBriefActions.value = false
  showBriefPreview.value = true
}

function handleEditBrief() {
  showBriefActions.value = false
  showNewModal.value = true
}

function closeBriefPreviewAndEdit() {
  showBriefPreview.value = false
  handleEditBrief()
}

const briefPreviewItems = computed(() => {
  const b = store.stepData.concept.newConceptBrief
  if (!b) return []
  return [
    {
      label: 'Чи це концепт для нового ГЕО?',
      value: b.isNewGeo === null ? '—' : b.isNewGeo ? 'Так' : 'Ні',
    },
    { label: 'Інформація по ГЕО', value: b.geoInfo.trim() || '—' },
    {
      label: 'Потрібен Research GEO?',
      value: b.needsGeoResearch === null ? '—' : b.needsGeoResearch ? 'Так' : 'Ні',
    },
    { label: 'Опис, що не підійшло', value: b.conceptFeedback.trim() || '—' },
    { label: 'Інформація по гравцям від команди Трафіку', value: b.trafficTeamInfo.trim() || '—' },
    { label: 'Ключові конкуренти', value: b.competitors.trim() || '—' },
    {
      label: 'Чи важливо зберегти звʼязок з іншими продуктами?',
      value: b.keepProductConnection === null ? '—' : b.keepProductConnection ? 'Так' : 'Ні',
    },
    { label: 'З якими продуктами', value: b.connectedProducts.trim() || '—' },
    { label: 'Мова створення назви', value: b.namingLanguage || '—' },
    { label: 'Бажані слова / приставки', value: b.desiredWordsInName.trim() || '—' },
    { label: 'Доменні зони', value: b.domainZones.length > 0 ? b.domainZones.join(', ') : '—' },
    { label: 'Бюджет домена', value: b.domainBudget != null ? `$${b.domainBudget}` : '—' },
    { label: 'Дедлайн', value: b.namingDeadline || '—' },
    { label: 'Додаткова інформація по ГЕО', value: b.additionalGeoInfo.trim() || '—' },
  ]
})

function handleDeleteBrief() {
  showBriefActions.value = false
  if (confirm('Видалити бриф нового концепту? Дані буде втрачено.')) {
    store.setNewConceptBrief(null)
    isCreatingNew.value = false
  }
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
    <p class="text-muted-foreground text-base tracking-[-0.31px]">Виберіть один концепт</p>

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
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div
          v-for="concept in concepts"
          :key="concept.id"
          class="relative group rounded-[14px] overflow-hidden border-2 transition-all"
          :class="[
            selectedId === concept.id
              ? 'border-[#030213] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] cursor-pointer'
              : isCreatingNew
                ? 'border-black/10 opacity-40 cursor-not-allowed'
                : 'border-black/10 hover:border-primary/50 cursor-pointer',
          ]"
          @click="selectConcept(concept)"
        >
          <div class="aspect-square relative bg-muted">
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
              <svg
                class="size-12 opacity-30"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>

            <div
              class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
            />

            <div class="absolute bottom-0 left-0 right-0 p-3">
              <h3 class="text-white font-medium text-xl leading-[30px] tracking-[-0.45px]">
                {{ concept.name }}
              </h3>
            </div>

            <!-- View detail button -->
            <button
              v-if="!isCreatingNew"
              type="button"
              class="group absolute top-0 right-0 p-3 cursor-pointer"
              @click="openDetail(concept, $event)"
            >
              <span
                class="size-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center transition-all duration-200 shadow-[0px_3px_12px_rgba(0,0,0,0.4),0px_1px_4px_rgba(0,0,0,0.3)] group-hover:bg-white group-hover:shadow-[0px_6px_20px_rgba(0,0,0,0.45),0px_2px_8px_rgba(0,0,0,0.35)] group-hover:scale-110 hover:!scale-125"
              >
                <svg
                  class="size-4 text-gray-900"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
                  />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </span>
            </button>

            <!-- Selected checkmark (top-left per Figma) -->
            <div
              v-if="selectedId === concept.id"
              class="absolute top-2 left-2 size-8 rounded-full bg-[#030213] flex items-center justify-center shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)]"
            >
              <svg
                class="size-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Create New Concept button / Brief created state -->
      <div class="relative self-start">
        <button
          v-if="!isCreatingNew"
          type="button"
          class="inline-flex items-center gap-2 h-[40px] px-4 rounded-[10px] transition-colors text-base font-medium tracking-[-0.31px] bg-[rgba(3,2,19,0.1)] text-[#030213] hover:bg-[rgba(3,2,19,0.15)]"
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
          Create New Concept
        </button>

        <button
          v-else
          type="button"
          class="inline-flex items-center gap-2 h-[40px] px-4 rounded-[10px] transition-colors text-base font-medium tracking-[-0.31px] bg-[#030213] text-white hover:opacity-90"
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
          Бриф концепту створено
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

    <!-- Коментар (per Figma: icon + label + textarea) -->
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
        <span class="text-base font-medium text-foreground tracking-[-0.31px]">Коментар</span>
      </div>
      <textarea
        v-model="comment"
        rows="3"
        class="w-full px-4 py-3 bg-[#f3f3f5] border border-transparent rounded-[10px] resize-none text-base tracking-[-0.31px] placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        placeholder="Додайте ваші коментарі або побажання..."
      />
    </div>

    <!-- Detail Overlay -->
    <ConceptDetailOverlay
      v-if="detailConcept"
      :concept="detailConcept"
      @close="closeDetail"
      @select="selectFromDetail"
    />

    <!-- New Concept Modal -->
    <NewConceptModal
      v-if="showNewModal"
      :initial-data="store.stepData.concept.newConceptBrief"
      @save="handleBriefSave"
      @cancel="handleBriefCancel"
    />

    <!-- Brief Preview Modal -->
    <Teleport to="body">
      <div v-if="showBriefPreview" class="fixed inset-0 z-[9999] flex items-center justify-center">
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="showBriefPreview = false"
        />
        <div
          class="relative bg-white rounded-[14px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] w-full max-w-[760px] mx-4 max-h-[85vh] flex flex-col"
        >
          <div class="flex items-center justify-between p-6 border-b border-black/10">
            <h3 class="text-xl font-medium text-foreground">Бриф нового концепту</h3>
            <button
              type="button"
              class="size-8 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
              @click="showBriefPreview = false"
            >
              <svg
                class="size-5 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <div class="p-6 overflow-y-auto flex-1">
            <div v-for="item in briefPreviewItems" :key="item.label" class="mb-4">
              <p class="text-sm text-muted-foreground mb-1">{{ item.label }}</p>
              <p class="text-base text-foreground whitespace-pre-wrap">{{ item.value }}</p>
            </div>
          </div>
          <div class="p-6 border-t border-black/10 flex justify-end gap-3">
            <button
              type="button"
              class="h-10 px-4 rounded-[10px] border border-black/10 text-sm font-medium hover:bg-black/[0.02] transition-all"
              @click="showBriefPreview = false"
            >
              Закрити
            </button>
            <button
              type="button"
              class="h-10 px-4 rounded-[10px] bg-[#030213] text-white text-sm font-medium hover:opacity-90 transition-all"
              @click="closeBriefPreviewAndEdit"
            >
              Редагувати
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
