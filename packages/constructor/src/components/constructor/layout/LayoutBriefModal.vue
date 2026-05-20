<script setup lang="ts">
/**
 * Self-contained modal that shows the "new concept / new external naming /
 * new internal naming" brief data from the constructor store.
 *
 * NOTE: as of F-07 this modal is wired but currently unreachable from any UI
 * trigger in `packages/constructor` — the brief data is still populated via
 * `NewConceptModal.vue`, `NewNamingModal.vue` and `NewInternalNamingModal.vue`,
 * but no preview entry-point calls it. Kept as a ready-to-rewire component;
 * see "Open follow-ups" in docs/audits/enterprise-audit-brand-constructor.md.
 */

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'

export type LayoutBriefKind = 'concept' | 'external' | 'internal'

interface Props {
  kind: LayoutBriefKind | null
  currentStep: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:kind': [value: LayoutBriefKind | null]
}>()

const store = useConstructorStore()
const router = useRouter()

function close() {
  emit('update:kind', null)
}

function formatBool(val: boolean | null | undefined): string {
  return val ? 'Так' : 'Ні'
}

function fallbackValue(val: string | null | undefined): string {
  return val && val.trim() !== '' ? val : '—'
}

function formatBudget(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val)) return '—'
  return `$${val}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  const formatted = new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
  return formatted.replace(/\s*р\.$/, '')
}

const conceptBriefItems = computed(() => {
  const b = store.stepData.concept.newConceptBrief
  if (!b) return []
  return [
    { label: 'Чи це концепт для нового ГЕО?', value: formatBool(b.isNewGeo) },
    { label: 'Інформація по ГЕО', value: fallbackValue(b.geoInfo) },
    { label: 'Потрібен Research GEO?', value: formatBool(b.needsGeoResearch) },
    { label: 'Опис, що не підійшло', value: fallbackValue(b.conceptFeedback) },
    { label: 'Інформація по гравцям від команди Трафіку', value: fallbackValue(b.trafficTeamInfo) },
    { label: 'Ключові конкуренти', value: fallbackValue(b.competitors) },
    {
      label: 'Чи важливо зберегти звʼязок з іншими продуктами?',
      value: formatBool(b.keepProductConnection),
    },
    { label: 'З якими продуктами', value: fallbackValue(b.connectedProducts) },
    { label: 'Мова створення назви', value: fallbackValue(b.namingLanguage) },
    { label: 'Бажані слова / приставки', value: fallbackValue(b.desiredWordsInName) },
    { label: 'Доменні зони', value: b.domainZones?.length > 0 ? b.domainZones.join(', ') : '—' },
    { label: 'Бюджет домена', value: formatBudget(b.domainBudget) },
    { label: 'Дедлайн', value: b.namingDeadline ? formatDate(b.namingDeadline) : '—' },
    { label: 'Додаткова інформація по ГЕО', value: fallbackValue(b.additionalGeoInfo) },
  ]
})

const externalBriefItems = computed(() => {
  const b = store.stepData.externalNaming.newNamingBrief
  if (!b) return []
  return [
    { label: 'Чи це нове ГЕО?', value: formatBool(b.isNewGeo) },
    {
      label: 'Опис, що не підійшло в запропонованих неймінгах',
      value: fallbackValue(b.namingFeedback),
    },
    { label: 'Інформація по гравцям від команди Трафіку', value: fallbackValue(b.trafficTeamInfo) },
    { label: 'Потрібен Brand Research GEO?', value: formatBool(b.needsGeoResearch) },
    { label: 'Мова створення назви', value: fallbackValue(b.namingLanguage) },
    { label: 'Бажані слова / приставки', value: fallbackValue(b.desiredWordsInName) },
    { label: 'Доменні зони', value: b.domainZones?.length > 0 ? b.domainZones.join(', ') : '—' },
    { label: 'Яких слів слід уникати', value: fallbackValue(b.wordsToAvoid) },
    { label: 'Бюджет домена', value: formatBudget(b.domainBudget) },
    { label: 'Дедлайн', value: b.namingDeadline ? formatDate(b.namingDeadline) : '—' },
    { label: 'Додаткова інформація по ГЕО', value: fallbackValue(b.additionalGeoInfo) },
  ]
})

const internalBriefItems = computed(() => {
  const feedback = store.stepData.internalNaming.newNamingFeedback
  if (!feedback) return []
  return [{ label: 'Опис, що не підійшло в запропонованих неймінгах', value: feedback }]
})

const briefTitle = computed(() => {
  if (props.kind === 'concept') return 'Бриф нового концепту'
  if (props.kind === 'external') return 'Бриф нового External Naming'
  if (props.kind === 'internal') return 'Бриф нової Internal Naming'
  return ''
})

const briefItems = computed(() => {
  if (props.kind === 'concept') return conceptBriefItems.value
  if (props.kind === 'external') return externalBriefItems.value
  if (props.kind === 'internal') return internalBriefItems.value
  return []
})

function handleEdit() {
  if (!props.kind) return
  const targetStep = props.kind === 'concept' ? 2 : props.kind === 'external' ? 3 : 4
  store.setReturnToStep(props.currentStep)
  router.push(`/constructor/step/${targetStep}`)
  close()
}
</script>

<template>
  <Teleport to="body">
    <div v-if="kind" class="fixed inset-0 z-[9999] flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="close" />
      <div
        class="relative bg-white rounded-[14px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] w-full max-w-[760px] mx-4 max-h-[85vh] flex flex-col"
      >
        <div class="flex items-center justify-between p-6 border-b border-black/10">
          <h3 class="text-xl font-medium text-foreground">{{ briefTitle }}</h3>
          <button
            type="button"
            class="size-8 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
            @click="close"
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
          <div v-for="item in briefItems" :key="item.label" class="mb-4">
            <p class="text-sm text-muted-foreground mb-1">{{ item.label }}</p>
            <p class="text-base text-foreground whitespace-pre-wrap">{{ item.value }}</p>
          </div>
        </div>
        <div class="p-6 border-t border-black/10 flex justify-end gap-3">
          <button
            type="button"
            class="h-10 px-4 rounded-[10px] border border-black/10 text-sm font-medium hover:bg-black/[0.02] transition-all"
            @click="close"
          >
            Закрити
          </button>
          <button
            type="button"
            class="h-10 px-4 rounded-[10px] bg-[#030213] text-white text-sm font-medium hover:opacity-90 transition-all"
            @click="handleEdit"
          >
            Редагувати
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
