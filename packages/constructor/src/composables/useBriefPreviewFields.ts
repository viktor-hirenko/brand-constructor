import { computed } from 'vue'
import type { NewConceptBrief, NewNamingBrief } from '@brand-constructor/shared/types'
import { useConstructorStore } from '@/stores/constructor'
import type { BriefField } from '@/components/constructor/preview/BriefPreviewPopup.vue'

function formatBool(v: boolean | null): string {
  if (v === null) return '—'
  return v ? 'Так' : 'Ні'
}

function formatBudget(v: number | null): string {
  return v != null ? `$${v}` : '—'
}

function formatDate(value: string): string {
  if (!value) return '—'
  const d = new Date(value + 'T00:00:00')
  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(d)
    .replace(/\s*р\.$/, '')
}

function trimOrDash(v: string): string {
  const t = v.trim()
  return t === '' ? '—' : t
}

export function buildConceptBriefFields(b: NewConceptBrief): BriefField[] {
  return [
    { label: 'Чи це концепт для нового ГЕО?', value: formatBool(b.isNewGeo) },
    { label: 'Інформація по ГЕО', value: trimOrDash(b.geoInfo) },
    { label: 'Потрібен Research GEO?', value: formatBool(b.needsGeoResearch) },
    { label: 'Опис, що не підійшло', value: trimOrDash(b.conceptFeedback) },
    { label: 'Інформація по гравцям від команди Трафіку', value: trimOrDash(b.trafficTeamInfo) },
    { label: 'Ключові конкуренти', value: trimOrDash(b.competitors) },
    {
      label: 'Чи важливо зберегти звʼязок з іншими продуктами?',
      value: formatBool(b.keepProductConnection),
    },
    { label: 'З якими продуктами', value: trimOrDash(b.connectedProducts) },
    { label: 'Мова створення назви', value: b.namingLanguage || '—' },
    { label: 'Бажані слова / приставки', value: trimOrDash(b.desiredWordsInName) },
    { label: 'Доменні зони', value: b.domainZones.length > 0 ? b.domainZones.join(', ') : '—' },
    { label: 'Бюджет домена', value: formatBudget(b.domainBudget) },
    { label: 'Дедлайн', value: formatDate(b.namingDeadline) },
    { label: 'Додаткова інформація по ГЕО', value: trimOrDash(b.additionalGeoInfo) },
  ]
}

export function buildExternalNamingBriefFields(b: NewNamingBrief): BriefField[] {
  return [
    { label: 'Чи це нове ГЕО?', value: formatBool(b.isNewGeo) },
    { label: 'Опис, що не підійшло в неймінгах', value: trimOrDash(b.namingFeedback) },
    { label: 'Інформація по гравцям від команди Трафіку', value: trimOrDash(b.trafficTeamInfo) },
    { label: 'Потрібен Brand Research GEO?', value: formatBool(b.needsGeoResearch) },
    { label: 'Мова створення назви', value: b.namingLanguage || '—' },
    { label: 'Бажані слова / приставки', value: trimOrDash(b.desiredWordsInName) },
    { label: 'Доменні зони', value: b.domainZones.length > 0 ? b.domainZones.join(', ') : '—' },
    { label: 'Слова / знаки уникати', value: trimOrDash(b.wordsToAvoid) },
    { label: 'Бюджет домена', value: formatBudget(b.domainBudget) },
    { label: 'Дедлайн', value: formatDate(b.namingDeadline) },
    { label: 'Додаткова інформація по ГЕО', value: trimOrDash(b.additionalGeoInfo) },
  ]
}

export function buildInternalNamingBriefFields(feedback: string): BriefField[] {
  return [{ label: 'Опис, що не підійшло', value: trimOrDash(feedback) }]
}

export function useBriefPreviewFields() {
  const store = useConstructorStore()

  const conceptFields = computed<BriefField[]>(() => {
    const b = store.stepData.concept.newConceptBrief
    return b ? buildConceptBriefFields(b) : []
  })

  const externalNamingFields = computed<BriefField[]>(() => {
    const b = store.stepData.externalNaming.newNamingBrief
    return b ? buildExternalNamingBriefFields(b) : []
  })

  const internalNamingFields = computed<BriefField[]>(() => {
    const f = store.stepData.internalNaming.newNamingFeedback
    return f ? buildInternalNamingBriefFields(f) : []
  })

  return {
    conceptFields,
    externalNamingFields,
    internalNamingFields,
  }
}
