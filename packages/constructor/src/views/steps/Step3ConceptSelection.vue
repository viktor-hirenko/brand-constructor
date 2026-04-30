<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList, getAssetUrl } from '@/composables/useApi'
import type { Concept } from '@brand-constructor/shared/types'
import type { NewConceptBrief } from '@brand-constructor/shared/types'
import NewConceptModal from '@/components/constructor/NewConceptModal.vue'

const store = useConstructorStore()
const { data: concepts, loading, error, fetchData, perPage } = useApiList<Concept>('/api/concepts')

const isCreatingNew = ref(false)
const showNewModal = ref(false)
const showBriefActions = ref(false)
const showBriefPreview = ref(false)

const selectedId = computed(() => store.stepData.concept.selectedId)
const previewId = computed(() => store.stepData.concept.previewId ?? null)
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
  store.setConcept({ previewId: concept.id })
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
    <!-- Light / Dark theme -->
    <div
      class="inline-flex self-start rounded-full bg-[#ececf0] p-1 gap-1 border border-black/5"
      role="group"
      aria-label="Тема інтерфейсу"
    >
      <button
        type="button"
        class="h-10 px-4 rounded-full text-base font-medium tracking-[-0.31px] transition-all"
        :class="
          store.stepData.mode === 'light'
            ? 'bg-white text-foreground shadow-[0px_8px_10px_0px_rgba(0,0,0,0.1)]'
            : 'text-[#6e6e6e] hover:text-foreground'
        "
        @click="store.setMode('light')"
      >
        Світла тема
      </button>
      <button
        type="button"
        class="h-10 px-4 rounded-full text-base font-medium tracking-[-0.31px] transition-all"
        :class="
          store.stepData.mode === 'dark'
            ? 'bg-white text-foreground shadow-[0px_8px_10px_0px_rgba(0,0,0,0.1)]'
            : 'text-[#6e6e6e] hover:text-foreground'
        "
        @click="store.setMode('dark')"
      >
        Темна тема
      </button>
    </div>

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
          class="relative group rounded-[16px] overflow-hidden transition-all w-full aspect-square"
          :class="[
            isCreatingNew ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
            selectedId === concept.id || previewId === concept.id
              ? 'border-2 border-[#030213] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]'
              : 'border border-[rgba(3,2,19,0.1)]',
          ]"
          @click="selectConcept(concept)"
        >
          <div class="w-full h-full absolute inset-0 bg-muted">
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

            <!-- Default dimming; hidden when preview/selected; hover clears dim on idle cards -->
            <div
              class="absolute inset-0 bg-black/45 transition-opacity z-[1] pointer-events-none"
              :class="
                selectedId === concept.id || previewId === concept.id
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
                class="text-white font-medium text-[18px] leading-6 tracking-[-0.4492px] line-clamp-2"
              >
                {{ concept.name }}
              </h3>
            </div>

            <!-- Final selection badge (white circle, dark check — Figma) -->
            <div
              v-if="selectedId === concept.id"
              class="absolute top-[6px] left-[6px] size-8 rounded-full bg-white border border-black/10 flex items-center justify-center shadow-[0px_8px_10px_0px_rgba(0,0,0,0.2)] z-[4]"
            >
              <svg
                class="size-4 text-[#030213]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
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
          class="inline-flex items-center gap-2 h-[40px] px-4 rounded-[8px] transition-colors text-base font-medium leading-6 tracking-[-0.31px] bg-[rgba(3,2,19,0.1)] text-[#030213] hover:bg-[rgba(3,2,19,0.15)]"
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
          Замовити новий концепт
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
          class="size-4 text-foreground shrink-0"
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
        <span class="text-base font-medium text-foreground tracking-[-0.31px]">Коментар</span>
      </div>
      <textarea
        v-model="comment"
        rows="3"
        class="w-full px-4 py-3 bg-[#f3f3f5] border border-transparent rounded-[10px] resize-none text-base tracking-[-0.31px] placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        placeholder="Додайте ваші коментарі або побажання..."
      />
    </div>

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
