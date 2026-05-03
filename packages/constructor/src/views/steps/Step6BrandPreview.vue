<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type {
  NewConceptBrief,
  NewNamingBrief,
  Concept,
  ExternalNaming,
  InternalNaming,
} from '@brand-constructor/shared/types'
import StepCommentField from '@/components/constructor/StepCommentField.vue'

type BriefKind = 'concept' | 'external' | 'internal' | null

const router = useRouter()
const store = useConstructorStore()

const {
  data: concepts,
  fetchData: fetchConcepts,
  perPage: cPerPage,
} = useApiList<Concept>('/api/concepts')
const {
  data: externalNamings,
  fetchData: fetchExternalNamings,
  perPage: ePerPage,
} = useApiList<ExternalNaming>('/api/namings/external')
const {
  data: internalNamings,
  fetchData: fetchInternalNamings,
  perPage: iPerPage,
} = useApiList<InternalNaming>('/api/namings/internal')

onMounted(() => {
  cPerPage.value = 100
  ePerPage.value = 100
  iPerPage.value = 100
  fetchConcepts({ status: 'active' })
  fetchExternalNamings({ status: 'active' })
  fetchInternalNamings({ status: 'active' })
})

const selectedConcept = computed(() => {
  const id = store.stepData.concept.selectedId
  return id ? (concepts.value.find(c => c.id === id) ?? null) : null
})

const selectedExternalNamingsList = computed(() => {
  const ids = store.stepData.externalNaming.selectedIds
  return ids
    .map(id => externalNamings.value.find(n => n.id === id))
    .filter((n): n is ExternalNaming => n != null)
})

const selectedInternalNaming = computed(() => {
  const id = store.stepData.internalNaming.selectedId
  return id ? (internalNamings.value.find(n => n.id === id) ?? null) : null
})

const hasLibrarySelections = computed(
  () =>
    selectedConcept.value != null ||
    selectedExternalNamingsList.value.length > 0 ||
    selectedInternalNaming.value != null
)

const previewComment = computed({
  get: () => store.stepData.previewComment,
  set: (val: string) => store.setPreviewComment(val),
})
const activeBrief = ref<BriefKind>(null)

const newConceptBrief = computed<NewConceptBrief | null>(
  () => store.stepData.concept.newConceptBrief
)
const newExternalBrief = computed<NewNamingBrief | null>(
  () => store.stepData.externalNaming.newNamingBrief
)
const newInternalFeedback = computed<string | null>(
  () => store.stepData.internalNaming.newNamingFeedback
)

const conceptBriefItems = computed(() => {
  if (!newConceptBrief.value) return []
  return [
    { label: 'Чи це концепт для нового ГЕО?', value: formatBool(newConceptBrief.value.isNewGeo) },
    { label: 'Інформація по ГЕО', value: fallbackValue(newConceptBrief.value.geoInfo) },
    { label: 'Потрібен Research GEO?', value: formatBool(newConceptBrief.value.needsGeoResearch) },
    { label: 'Опис, що не підійшло', value: fallbackValue(newConceptBrief.value.conceptFeedback) },
    {
      label: 'Інформація по гравцям від команди Трафіку',
      value: fallbackValue(newConceptBrief.value.trafficTeamInfo),
    },
    { label: 'Ключові конкуренти', value: fallbackValue(newConceptBrief.value.competitors) },
    {
      label: 'Чи важливо зберегти звʼязок з іншими продуктами?',
      value: formatBool(newConceptBrief.value.keepProductConnection),
    },
    { label: 'З якими продуктами', value: fallbackValue(newConceptBrief.value.connectedProducts) },
    { label: 'Мова створення назви', value: fallbackValue(newConceptBrief.value.namingLanguage) },
    {
      label: 'Бажані слова / приставки',
      value: fallbackValue(newConceptBrief.value.desiredWordsInName),
    },
    {
      label: 'Доменні зони',
      value:
        newConceptBrief.value.domainZones.length > 0
          ? newConceptBrief.value.domainZones.join(', ')
          : '—',
    },
    { label: 'Бюджет домена', value: formatBudget(newConceptBrief.value.domainBudget) },
    { label: 'Дедлайн', value: formatDate(newConceptBrief.value.namingDeadline) },
    {
      label: 'Додаткова інформація по ГЕО',
      value: fallbackValue(newConceptBrief.value.additionalGeoInfo),
    },
  ]
})

const externalBriefItems = computed(() => {
  if (!newExternalBrief.value) return []
  return [
    { label: 'Чи це нове ГЕО?', value: formatBool(newExternalBrief.value.isNewGeo) },
    {
      label: 'Опис, що не підійшло в запропонованих неймінгах',
      value: fallbackValue(newExternalBrief.value.namingFeedback),
    },
    {
      label: 'Інформація по гравцям від команди Трафіку',
      value: fallbackValue(newExternalBrief.value.trafficTeamInfo),
    },
    {
      label: 'Потрібен Brand Research GEO?',
      value: formatBool(newExternalBrief.value.needsGeoResearch),
    },
    { label: 'Мова створення назви', value: fallbackValue(newExternalBrief.value.namingLanguage) },
    {
      label: 'Бажані слова / приставки',
      value: fallbackValue(newExternalBrief.value.desiredWordsInName),
    },
    {
      label: 'Доменні зони',
      value:
        newExternalBrief.value.domainZones.length > 0
          ? newExternalBrief.value.domainZones.join(', ')
          : '—',
    },
    { label: 'Яких слів слід уникати', value: fallbackValue(newExternalBrief.value.wordsToAvoid) },
    { label: 'Бюджет домена', value: formatBudget(newExternalBrief.value.domainBudget) },
    { label: 'Дедлайн', value: formatDate(newExternalBrief.value.namingDeadline) },
    {
      label: 'Додаткова інформація по ГЕО',
      value: fallbackValue(newExternalBrief.value.additionalGeoInfo),
    },
  ]
})

const internalBriefItems = computed(() => {
  if (!newInternalFeedback.value) return []
  return [
    { label: 'Опис, що не підійшло в запропонованих неймінгах', value: newInternalFeedback.value },
  ]
})

function goToStep(step: number) {
  store.setReturnToStep(5)
  router.push(`/constructor/step/${step}`)
}

function openBrief(kind: Exclude<BriefKind, null>) {
  activeBrief.value = kind
}

function closeBrief() {
  activeBrief.value = null
}

function getBriefTitle(kind: BriefKind): string {
  if (kind === 'concept') return 'Бриф нового концепту'
  if (kind === 'external') return 'Бриф нового External Naming'
  if (kind === 'internal') return 'Бриф нової Internal Naming'
  return ''
}

function fallbackValue(value: string): string {
  return value.trim() === '' ? '—' : value
}

function formatBool(value: boolean | null): string {
  if (value === null) return '—'
  return value ? 'Так' : 'Ні'
}

function formatBudget(value: number | null): string {
  if (value === null) return '—'
  return `$${value}`
}

function formatDate(value: string): string {
  if (!value) return '—'
  return value
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center gap-3">
      <svg
        class="size-6 text-primary"
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
      <p class="text-muted-foreground text-base tracking-[-0.31px]">
        Огляд вашого майбутнього бренду
      </p>
    </div>

    <!-- Library selections -->
    <template v-if="hasLibrarySelections">
      <div
        v-if="selectedConcept"
        class="rounded-[14px] border border-black/10 bg-white p-4 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
      >
        <div class="min-w-0">
          <p class="text-xs text-muted-foreground mb-0.5">Концепт з бібліотеки</p>
          <p class="text-base font-medium text-foreground truncate">{{ selectedConcept.name }}</p>
          <p
            v-if="selectedConcept.description"
            class="text-sm text-muted-foreground line-clamp-2 mt-1"
          >
            {{ selectedConcept.description }}
          </p>
        </div>
        <div class="mt-3">
          <button
            type="button"
            class="h-9 px-3 rounded-[10px] border border-black/10 text-sm font-medium hover:bg-black/[0.02] transition-all"
            @click="goToStep(2)"
          >
            Редагувати
          </button>
        </div>
      </div>

      <div
        v-if="selectedExternalNamingsList.length > 0"
        class="rounded-[14px] border border-black/10 bg-white p-4 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
      >
        <p class="text-xs text-muted-foreground mb-1">Зовнішні назви з бібліотеки</p>
        <div class="space-y-2">
          <div
            v-for="naming in selectedExternalNamingsList"
            :key="naming.id"
            class="flex items-center gap-2"
          >
            <span class="text-base font-medium text-foreground">{{ naming.name }}</span>
            <span v-if="naming.domain" class="text-xs text-muted-foreground"
              >({{ naming.domain }})</span
            >
          </div>
        </div>
        <div class="mt-3">
          <button
            type="button"
            class="h-9 px-3 rounded-[10px] border border-black/10 text-sm font-medium hover:bg-black/[0.02] transition-all"
            @click="goToStep(3)"
          >
            Редагувати
          </button>
        </div>
      </div>

      <div
        v-if="selectedInternalNaming"
        class="rounded-[14px] border border-black/10 bg-white p-4 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
      >
        <p class="text-xs text-muted-foreground mb-0.5">Внутрішня назва з бібліотеки</p>
        <p class="text-base font-medium text-foreground">{{ selectedInternalNaming.name }}</p>
        <div class="mt-3">
          <button
            type="button"
            class="h-9 px-3 rounded-[10px] border border-black/10 text-sm font-medium hover:bg-black/[0.02] transition-all"
            @click="goToStep(4)"
          >
            Редагувати
          </button>
        </div>
      </div>
    </template>

    <!-- Briefs for new items -->
    <div
      v-if="newConceptBrief"
      class="rounded-[14px] border border-black/10 bg-white p-4 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
    >
      <p class="text-base font-medium text-foreground mb-3">Бриф нового концепту</p>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="h-9 px-3 rounded-[10px] border border-black/10 text-sm font-medium hover:bg-black/[0.02] transition-all"
          @click="openBrief('concept')"
        >
          Переглянути бриф
        </button>
        <button
          type="button"
          class="h-9 px-3 rounded-[10px] border border-black/10 text-sm font-medium hover:bg-black/[0.02] transition-all"
          @click="goToStep(2)"
        >
          Редагувати
        </button>
      </div>
    </div>

    <div
      v-if="newExternalBrief"
      class="rounded-[14px] border border-black/10 bg-white p-4 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
    >
      <p class="text-base font-medium text-foreground mb-3">Бриф нового External Naming</p>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="h-9 px-3 rounded-[10px] border border-black/10 text-sm font-medium hover:bg-black/[0.02] transition-all"
          @click="openBrief('external')"
        >
          Переглянути бриф
        </button>
        <button
          type="button"
          class="h-9 px-3 rounded-[10px] border border-black/10 text-sm font-medium hover:bg-black/[0.02] transition-all"
          @click="goToStep(3)"
        >
          Редагувати
        </button>
      </div>
    </div>

    <div
      v-if="newInternalFeedback"
      class="rounded-[14px] border border-black/10 bg-white p-4 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
    >
      <p class="text-base font-medium text-foreground mb-3">Бриф нової Internal Naming</p>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="h-9 px-3 rounded-[10px] border border-black/10 text-sm font-medium hover:bg-black/[0.02] transition-all"
          @click="openBrief('internal')"
        >
          Переглянути бриф
        </button>
        <button
          type="button"
          class="h-9 px-3 rounded-[10px] border border-black/10 text-sm font-medium hover:bg-black/[0.02] transition-all"
          @click="goToStep(4)"
        >
          Редагувати
        </button>
      </div>
    </div>

    <StepCommentField v-model="previewComment" />

    <Teleport to="body">
      <div v-if="activeBrief" class="fixed inset-0 z-[9999] flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeBrief" />
        <div
          class="relative bg-white rounded-[14px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] w-full max-w-[760px] mx-4 max-h-[85vh] flex flex-col"
        >
          <div class="flex items-center justify-between p-6 border-b border-black/10">
            <h3 class="text-xl font-medium text-foreground">{{ getBriefTitle(activeBrief) }}</h3>
            <button
              type="button"
              class="size-8 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
              @click="closeBrief"
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
            <div
              v-for="item in activeBrief === 'concept'
                ? conceptBriefItems
                : activeBrief === 'external'
                  ? externalBriefItems
                  : internalBriefItems"
              :key="item.label"
              class="mb-4"
            >
              <p class="text-sm text-muted-foreground mb-1">{{ item.label }}</p>
              <p class="text-base text-foreground whitespace-pre-wrap">{{ item.value }}</p>
            </div>
          </div>

          <div class="p-6 border-t border-black/10 flex justify-end gap-3">
            <button
              type="button"
              class="h-10 px-4 rounded-[10px] border border-black/10 text-sm font-medium hover:bg-black/[0.02] transition-all"
              @click="closeBrief"
            >
              Закрити
            </button>
            <button
              type="button"
              class="h-10 px-4 rounded-[10px] bg-[#030213] text-white text-sm font-medium hover:opacity-90 transition-all"
              @click="goToStep(activeBrief === 'concept' ? 2 : activeBrief === 'external' ? 3 : 4)"
            >
              Редагувати
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
