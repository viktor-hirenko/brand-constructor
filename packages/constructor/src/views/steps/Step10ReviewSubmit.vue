<script setup lang="ts">
import { computed, onMounted, ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useAuthStore } from '@/stores/auth'
import { useApiList, apiPatch } from '@/composables/useApi'
import type {
  Concept,
  ExternalNaming,
  InternalNaming,
  PrPackage,
  Brand,
} from '@brand-constructor/shared/types'
import {
  usePrintBrand,
  type PrintBrandData,
  type ComponentTypeInfo,
} from '@/composables/usePrintBrand'
import { getAuthHeader } from '@/composables/useApi'
import Step10ReviewScrollLayout from '@/components/constructor/Step10ReviewScrollLayout.vue'

const router = useRouter()
const { downloadPdf } = usePrintBrand()
const store = useConstructorStore()
const authStore = useAuthStore()

const isCeoView = computed(() => authStore.isCeoOrAdmin)

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
const {
  data: prPackages,
  fetchData: fetchPrPackages,
  perPage: pPerPage,
} = useApiList<PrPackage>('/api/pr-packages')

onMounted(() => {
  cPerPage.value = 100
  ePerPage.value = 100
  iPerPage.value = 100
  pPerPage.value = 100
  const brandFilter: Record<string, string> = store.brandId
    ? { available_for_brand: store.brandId }
    : {}
  fetchConcepts(brandFilter)
  fetchExternalNamings(brandFilter)
  fetchInternalNamings(brandFilter)
  fetchPrPackages(brandFilter)
  loadComponentSelectionDetails()
})

const basics = computed(() => store.stepData.brandBasics)
const mode = computed(() => store.stepData.mode)

const selectedConcept = computed(() => {
  const id = store.stepData.concept.selectedId
  return id ? (concepts.value.find(c => c.id === id) ?? null) : null
})

const isNewConcept = computed(() => store.stepData.concept.newConceptBrief !== null)

const selectedExternalNamings = computed(() => {
  const ids = store.stepData.externalNaming.selectedIds
  return ids
    .map(id => externalNamings.value.find(n => n.id === id))
    .filter((n): n is ExternalNaming => n != null)
})

const isNewNaming = computed(() => store.stepData.externalNaming.newNamingBrief !== null)

const selectedInternalNaming = computed(() => {
  const id = store.stepData.internalNaming.selectedId
  return id ? (internalNamings.value.find(n => n.id === id) ?? null) : null
})

const internalFeedback = computed(() => store.stepData.internalNaming.newNamingFeedback)

const selectedPackage = computed(() => {
  const id = store.stepData.marketingPackage.selectedId
  return id ? (prPackages.value.find(p => p.id === id) ?? null) : null
})

const deliverables = computed(() => store.stepData.deliverables)
const visualComponents = computed(() => store.stepData.visualComponents)
const componentSelectionCount = computed(
  () => Object.keys(visualComponents.value.selections).length
)

const componentSelectionDetails = ref<Record<string, { typeName: string; variantName: string }>>({})

async function loadComponentSelectionDetails() {
  const selections = store.stepData?.visualComponents?.selections ?? {}
  if (Object.keys(selections).length === 0) return

  const result: Record<string, { typeName: string; variantName: string }> = {}
  const promises = Object.entries(selections).map(async ([typeId, variantId]) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/components/types/${typeId}/variants?status=all`,
        { headers: getAuthHeader() }
      )
      if (res.ok) {
        const json = await res.json()
        const typeName = json.data?.type?.name ?? typeId
        const variants = json.data?.variants || []
        const variant = variants.find((v: { id: string; name: string }) => v.id === variantId)
        result[typeId] = { typeName, variantName: variant?.name ?? variantId }
      } else {
        result[typeId] = { typeName: typeId, variantName: variantId }
      }
    } catch {
      result[typeId] = { typeName: typeId, variantName: variantId }
    }
  })
  await Promise.all(promises)
  componentSelectionDetails.value = result
}

interface SummaryItem {
  label: string
  value: string
  sectionKey: string
  icon:
    | 'globe'
    | 'calendar'
    | 'file-text'
    | 'message'
    | 'sun'
    | 'moon'
    | 'palette'
    | 'tag'
    | 'briefcase'
    | 'package'
    | 'scale'
    | 'handshake'
    | 'layers'
    | 'sparkles'
  step: number
  comment?: string
}

const summaryItems = computed<SummaryItem[]>(() => {
  const items: SummaryItem[] = []

  const basicsComment = basics.value.comment?.trim() || ''

  if (basics.value.geo.length > 0) {
    items.push({
      label: 'GEO',
      value: basics.value.geo.join(', '),
      sectionKey: 'basics',
      icon: 'globe',
      step: 1,
    })
  }
  if (basics.value.launchDate) {
    items.push({
      label: 'Плануєма дата запуску',
      value: formatDate(basics.value.launchDate),
      sectionKey: 'basics',
      icon: 'calendar',
      step: 1,
    })
  }
  if (basics.value.linkedProduct) {
    items.push({
      label: 'Звʼязок з іншим продуктом',
      value: basics.value.linkedProduct,
      sectionKey: 'basics',
      icon: 'file-text',
      step: 1,
      comment: basicsComment,
    })
  }
  if (mode.value) {
    items.push({
      label: 'Mode',
      value: mode.value === 'dark' ? 'Dark Mode' : 'Light Mode',
      sectionKey: 'mode',
      icon: mode.value === 'dark' ? 'moon' : 'sun',
      step: 2,
    })
  }
  if (selectedConcept.value) {
    items.push({
      label: 'Concept',
      value: selectedConcept.value.name,
      sectionKey: 'concept',
      icon: 'palette',
      step: 3,
      comment: store.stepData.concept.comment?.trim() || '',
    })
  } else if (isNewConcept.value) {
    items.push({
      label: 'Concept',
      value: 'Новий концепт (бриф)',
      sectionKey: 'concept',
      icon: 'palette',
      step: 3,
      comment: store.stepData.concept.comment?.trim() || '',
    })
  }
  if (selectedExternalNamings.value.length > 0) {
    items.push({
      label: 'External Naming',
      value: selectedExternalNamings.value.map(n => n.name).join(', '),
      sectionKey: 'externalNaming',
      icon: 'tag',
      step: 4,
      comment: store.stepData.externalNaming.comment?.trim() || '',
    })
  } else if (isNewNaming.value) {
    items.push({
      label: 'External Naming',
      value: 'Новий неймінг (бриф)',
      sectionKey: 'externalNaming',
      icon: 'tag',
      step: 4,
      comment: store.stepData.externalNaming.comment?.trim() || '',
    })
  }
  if (selectedInternalNaming.value) {
    items.push({
      label: 'Internal Naming',
      value: selectedInternalNaming.value.name,
      sectionKey: 'internalNaming',
      icon: 'briefcase',
      step: 5,
      comment: store.stepData.internalNaming.comment?.trim() || '',
    })
  } else if (internalFeedback.value) {
    items.push({
      label: 'Internal Naming',
      value: internalFeedback.value,
      sectionKey: 'internalNaming',
      icon: 'briefcase',
      step: 5,
      comment: store.stepData.internalNaming.comment?.trim() || '',
    })
  }
  if (selectedPackage.value) {
    items.push({
      label: 'Marketing Package',
      value: selectedPackage.value.name,
      sectionKey: 'marketingPackage',
      icon: 'package',
      step: 7,
      comment: store.stepData.marketingPackage.comment?.trim() || '',
    })
  }

  const deliverablesComment = deliverables.value.comment?.trim() || ''

  if (deliverables.value.legalLanding) {
    items.push({
      label: 'Legal Landing',
      value: 'Так',
      sectionKey: 'deliverables',
      icon: 'scale',
      step: 8,
      comment: deliverablesComment,
    })
  }
  if (deliverables.value.partnerLanding) {
    items.push({
      label: 'Partner Landing',
      value: 'Так',
      sectionKey: 'deliverables',
      icon: 'handshake',
      step: 8,
    })
  }
  const devDeadline = deliverables.value.developmentDeadline?.trim() ?? ''
  if (devDeadline) {
    items.push({
      label: 'Дедлайн розробки',
      value: formatDate(devDeadline),
      sectionKey: 'deliverables',
      icon: 'calendar',
      step: 8,
    })
  }
  if (visualComponents.value.delegateToDesigners) {
    items.push({
      label: 'Visual Components',
      value: 'Делеговано дизайнерам',
      sectionKey: 'visualComponents',
      icon: 'sparkles',
      step: 9,
      comment: visualComponents.value.comment?.trim() || '',
    })
  } else if (componentSelectionCount.value > 0) {
    const lines = Object.keys(visualComponents.value.selections).map(typeId => {
      const info = componentSelectionDetails.value[typeId]
      return info ? `${info.typeName}: ${info.variantName}` : typeId
    })
    items.push({
      label: 'Visual Components',
      value: lines.join('\n') || `${componentSelectionCount.value} обрано`,
      sectionKey: 'visualComponents',
      icon: 'layers',
      step: 9,
      comment: visualComponents.value.comment?.trim() || '',
    })
  }

  return items
})

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(date)
    .replace(/\s*р\.$/, '')
}

const shareSuccess = ref(false)
const isSaving = computed(() => store.isSaving)
const saveError = computed(() => store.saveError)
const statusActionLoading = ref(false)
const statusActionError = ref<string | null>(null)

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Чернетка', color: 'bg-gray-100 text-gray-700' },
  submitted: { label: 'На розгляді', color: 'bg-blue-100 text-blue-700' },
  needs_revision: { label: 'Потребує доопрацювання', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Затверджено', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Відхилено', color: 'bg-red-100 text-red-700' },
}

const brandStatus = computed(() => store.brandStatus ?? 'draft')
const statusInfo = computed(() => STATUS_LABELS[brandStatus.value] ?? STATUS_LABELS.draft)

const hasNewBrief = computed(() => {
  return (
    store.stepData?.concept?.newConceptBrief != null ||
    store.stepData?.externalNaming?.newNamingBrief != null ||
    store.stepData?.internalNaming?.newNamingFeedback != null
  )
})

const showCeoReview = computed(
  () => isCeoView.value && !hasNewBrief.value && brandStatus.value === 'submitted'
)

const showPoSubmitButton = computed(
  () =>
    !isCeoView.value && (brandStatus.value === 'draft' || brandStatus.value === 'needs_revision')
)

const showShareButton = computed(
  () =>
    !isCeoView.value && (brandStatus.value === 'needs_revision' || brandStatus.value === 'approved')
)

const showPdfButton = computed(
  () =>
    brandStatus.value === 'submitted' ||
    brandStatus.value === 'needs_revision' ||
    brandStatus.value === 'approved' ||
    brandStatus.value === 'rejected'
)

const CEO_COMMENT_SECTION_LABELS: Record<string, string> = {
  concept: 'Concept',
  externalNaming: 'External Naming',
  internalNaming: 'Internal Naming',
  marketingPackage: 'PR пакет',
  deliverables: 'Deliverables',
  visualComponents: 'Visual Components',
  general: 'Загальний коментар',
}

const hasCeoComments = computed(() => {
  const comments = store.brandCeoComments
  if (!comments) return false
  return Object.values(comments).some(v => v.trim().length > 0)
})

const hasCeoSelections = computed(() => {
  const selections = store.brandCeoSelections
  if (!selections) return false
  return Object.values(selections).some(v => v && v.trim().length > 0)
})

function hasCeoCommentForSection(item: SummaryItem): boolean {
  if (brandStatus.value !== 'needs_revision') return false
  const comments = store.brandCeoComments
  if (!comments) return false
  const comment = comments[item.sectionKey]
  return !!comment && comment.trim().length > 0
}

const showCeoLibraryModal = ref(false)
const ceoLibraryType = ref<'concept' | 'externalNaming' | 'internalNaming'>('concept')
const ceoSelections = reactive<Record<string, string>>({})

function openCeoLibrary(type: 'concept' | 'externalNaming' | 'internalNaming') {
  ceoLibraryType.value = type
  showCeoLibraryModal.value = true
}

function selectCeoAlternative(type: string, id: string) {
  ceoSelections[type] = id
}

const ceoLibraryItems = computed(() => {
  if (ceoLibraryType.value === 'concept') {
    return concepts.value.map(c => ({ id: c.id, name: c.name }))
  }
  if (ceoLibraryType.value === 'externalNaming') {
    return externalNamings.value.map(n => ({ id: n.id, name: n.name }))
  }
  return internalNamings.value.map(n => ({ id: n.id, name: n.name }))
})

const ceoLibraryTitle = computed(() => {
  const titles: Record<string, string> = {
    concept: 'Оберіть концепт',
    externalNaming: 'Оберіть зовнішню назву',
    internalNaming: 'Оберіть внутрішню назву',
  }
  return titles[ceoLibraryType.value] ?? ''
})

const ceoComments = reactive<Record<string, string>>({
  concept: '',
  externalNaming: '',
  internalNaming: '',
  marketingPackage: '',
  deliverables: '',
  visualComponents: '',
  general: '',
})

watch(
  () => store.brandCeoComments,
  comments => {
    if (comments) {
      for (const [key, value] of Object.entries(comments)) {
        if (key in ceoComments) {
          ceoComments[key] = value
        }
      }
    }
  },
  { immediate: true }
)

watch(
  () => store.brandCeoSelections,
  selections => {
    if (selections) {
      for (const [key, value] of Object.entries(selections)) {
        ceoSelections[key] = value
      }
    }
  },
  { immediate: true }
)

const CEO_COMMENT_SECTIONS = [
  { key: 'concept', label: 'Concept' },
  { key: 'externalNaming', label: 'External Naming' },
  { key: 'internalNaming', label: 'Internal Naming' },
  { key: 'marketingPackage', label: 'PR пакет' },
  { key: 'deliverables', label: 'Deliverables' },
  { key: 'visualComponents', label: 'Visual Components' },
  { key: 'general', label: 'Загальний коментар' },
]

const nonEmptyCeoComments = computed(() => {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(ceoComments)) {
    if (value.trim()) result[key] = value.trim()
  }
  return result
})

function goToStep(step: number) {
  store.setReturnToStep(10)
  router.push(`/constructor/step/${step}`)
}

async function handleShare() {
  if (!store.brandId) {
    const saved = await store.saveBrand()
    if (!saved) return
  }

  const shareUrl = `${window.location.origin}/constructor/brand/${store.brandId}`

  try {
    await navigator.clipboard.writeText(shareUrl)
    shareSuccess.value = true
    setTimeout(() => {
      shareSuccess.value = false
    }, 2000)
  } catch {
    const textArea = document.createElement('textarea')
    textArea.value = shareUrl
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    shareSuccess.value = true
    setTimeout(() => {
      shareSuccess.value = false
    }, 2000)
  }
}

const draftSaved = ref(false)

async function handleSaveDraft() {
  const success = await store.saveBrand()
  if (success) {
    draftSaved.value = true
    setTimeout(() => {
      draftSaved.value = false
    }, 3000)
  }
}

async function handleStatusChange(newStatus: 'submitted' | 'approved' | 'needs_revision') {
  if (newStatus === 'submitted') {
    const saved = await store.saveBrand()
    if (!saved) return
  }

  statusActionLoading.value = true
  statusActionError.value = null

  try {
    const payload: Record<string, unknown> = { status: newStatus }
    if (isCeoView.value && Object.keys(nonEmptyCeoComments.value).length > 0) {
      payload.ceoComments = nonEmptyCeoComments.value
    }
    if (isCeoView.value && Object.keys(ceoSelections).length > 0) {
      payload.ceoSelections = { ...ceoSelections }
    }
    await apiPatch<Brand>(`/api/brands/${store.brandId}/status`, payload)
    store.setBrandStatus(newStatus)

    if (newStatus === 'needs_revision') {
      store.setSuccessType('needs_revision')
      router.push('/constructor/success')
      return
    }

    if (newStatus === 'approved') {
      store.setSuccessType('approved')
      router.push('/constructor/success')
      return
    }

    if (newStatus === 'submitted') {
      store.setSuccessType('submitted')
      router.push('/constructor/success')
      return
    }
  } catch (err) {
    statusActionError.value = err instanceof Error ? err.message : 'Помилка зміни статусу'
  } finally {
    statusActionLoading.value = false
  }
}

const isPdfLoading = ref(false)

async function handlePrintBrand() {
  isPdfLoading.value = true
  try {
    const selections = store.stepData?.visualComponents?.selections ?? {}
    const componentTypes: Record<string, ComponentTypeInfo> = {}

    const fetchPromises = Object.entries(selections).map(async ([typeId, variantId]) => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || ''}/api/components/types/${typeId}/variants?status=all`,
          { headers: getAuthHeader() }
        )
        if (res.ok) {
          const json = await res.json()
          const typeName = json.data?.type?.name ?? 'Невідомий тип'
          const variants = json.data?.variants || []
          const variant = variants.find((v: { id: string; name: string }) => v.id === variantId)
          componentTypes[typeId] = { typeName, variantName: variant?.name ?? 'Невідомий варіант' }
        } else {
          componentTypes[typeId] = { typeName: 'Невідомий тип', variantName: 'Невідомий варіант' }
        }
      } catch {
        componentTypes[typeId] = { typeName: 'Невідомий тип', variantName: 'Невідомий варіант' }
      }
    })
    await Promise.all(fetchPromises)

    const ceoSelectionsResolved: Record<string, string> = {}
    if (store.brandCeoSelections) {
      for (const [key, id] of Object.entries(store.brandCeoSelections)) {
        if (!id?.trim()) continue
        if (key === 'concept') {
          ceoSelectionsResolved[key] = concepts.value.find(c => c.id === id)?.name ?? id
        } else if (key === 'externalNaming') {
          ceoSelectionsResolved[key] = externalNamings.value.find(n => n.id === id)?.name ?? id
        } else if (key === 'internalNaming') {
          ceoSelectionsResolved[key] = internalNamings.value.find(n => n.id === id)?.name ?? id
        }
      }
    }

    const brandName =
      store.brandInternalName ||
      selectedExternalNamings.value[0]?.name ||
      selectedConcept.value?.name ||
      'Brand Brief'

    const data: PrintBrandData = {
      brandName,
      conceptName: selectedConcept.value?.name ?? null,
      externalNamingNames: selectedExternalNamings.value.map(n => n.name),
      internalNamingName: selectedInternalNaming.value?.name ?? null,
      prPackageName: selectedPackage.value?.name ?? null,
      componentTypes,
      ceoComments: store.brandCeoComments,
      ceoSelections: Object.keys(ceoSelectionsResolved).length > 0 ? ceoSelectionsResolved : null,
      previewComment: store.stepData.previewComment || undefined,
    }

    await downloadPdf(data)
  } finally {
    isPdfLoading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0 gap-6 h-full">
    <div class="shrink-0 space-y-6">
      <!-- Status badge -->
      <div v-if="store.brandId" class="flex items-center gap-2">
      <span
        class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
        :class="statusInfo.color"
      >
        {{ statusInfo.label }}
      </span>
    </div>

    <!-- Banner -->
    <div class="bg-primary/5 rounded-xl p-6">
      <div class="flex items-center gap-3 text-primary mb-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-6"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <h3 class="text-base font-medium">
          {{ showCeoReview ? 'Бриф на розгляд' : 'Бриф готовий!' }}
        </h3>
      </div>
      <p class="text-sm text-muted-foreground">
        {{
          showCeoReview
            ? 'Перегляньте бриф та залиште коментарі. Затвердіть або поверніть на доопрацювання.'
            : 'Перегляньте всю інформацію справа. Ви можете поділитися брифом або зберегти його для подальшої роботи.'
        }}
      </p>
    </div>
    </div>

    <Step10ReviewScrollLayout :ceo-unified-scroll="showCeoReview">
      <template #summary>
      <!-- CEO Comments Display (when brand returned for revision) -->
      <div
        v-if="!showCeoReview && brandStatus === 'needs_revision' && hasCeoComments"
        class="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2"
      >
        <div class="flex items-center gap-2 mb-1">
          <svg
            class="size-5 text-amber-600 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          <h4 class="text-sm font-semibold text-amber-800">Коментарі CEO</h4>
        </div>
        <div
          v-for="(comment, key) in store.brandCeoComments"
          :key="key"
          class="text-sm text-amber-900"
        >
          <template v-if="comment && comment.trim()">
            <span class="font-medium">{{ CEO_COMMENT_SECTION_LABELS[key] ?? key }}:</span>
            {{ comment }}
          </template>
        </div>
      </div>

      <!-- CEO Selections Display for PO (when brand returned for revision) -->
      <div
        v-if="!showCeoReview && brandStatus === 'needs_revision' && hasCeoSelections"
        class="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2"
      >
        <div class="flex items-center gap-2 mb-1">
          <svg
            class="size-5 text-blue-600 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"
            />
          </svg>
          <h4 class="text-sm font-semibold text-blue-800">Альтернативи CEO</h4>
        </div>
        <ul class="list-disc list-inside space-y-0.5 text-sm text-blue-900">
          <li v-if="store.brandCeoSelections?.concept">
            Концепт:
            {{
              concepts.find(c => c.id === store.brandCeoSelections!.concept)?.name ??
              store.brandCeoSelections!.concept
            }}
          </li>
          <li v-if="store.brandCeoSelections?.externalNaming">
            Зовн. назва:
            {{
              externalNamings.find(n => n.id === store.brandCeoSelections!.externalNaming)?.name ??
              store.brandCeoSelections!.externalNaming
            }}
          </li>
          <li v-if="store.brandCeoSelections?.internalNaming">
            Внутр. назва:
            {{
              internalNamings.find(n => n.id === store.brandCeoSelections!.internalNaming)?.name ??
              store.brandCeoSelections!.internalNaming
            }}
          </li>
        </ul>
      </div>

      <div
        v-for="(item, idx) in summaryItems"
        :key="`${item.label}-${item.step}-${idx}`"
        class="w-full p-4 rounded-lg border"
        :class="
          hasCeoCommentForSection(item)
            ? 'bg-amber-50 border-amber-200'
            : 'bg-[#f3f3f5] border-black/10'
        "
      >
        <div class="flex items-start gap-3">
          <!-- Globe -->
          <svg
            v-if="item.icon === 'globe'"
            class="size-5 text-primary flex-shrink-0 mt-0.5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
          </svg>
          <!-- Calendar -->
          <svg
            v-else-if="item.icon === 'calendar'"
            class="size-5 text-primary flex-shrink-0 mt-0.5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <path d="M3 10h18" />
          </svg>
          <!-- File-text -->
          <svg
            v-else-if="item.icon === 'file-text'"
            class="size-5 text-primary flex-shrink-0 mt-0.5"
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
          <!-- Message (comment) -->
          <svg
            v-else-if="item.icon === 'message'"
            class="size-5 text-primary flex-shrink-0 mt-0.5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          </svg>
          <!-- Sun -->
          <svg
            v-else-if="item.icon === 'sun'"
            class="size-5 text-primary flex-shrink-0 mt-0.5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
          <!-- Moon -->
          <svg
            v-else-if="item.icon === 'moon'"
            class="size-5 text-primary flex-shrink-0 mt-0.5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
          <!-- Palette -->
          <svg
            v-else-if="item.icon === 'palette'"
            class="size-5 text-primary flex-shrink-0 mt-0.5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
            <path
              d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"
            />
          </svg>
          <!-- Tag -->
          <svg
            v-else-if="item.icon === 'tag'"
            class="size-5 text-primary flex-shrink-0 mt-0.5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"
            />
            <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
          </svg>
          <!-- Briefcase -->
          <svg
            v-else-if="item.icon === 'briefcase'"
            class="size-5 text-primary flex-shrink-0 mt-0.5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            <rect width="20" height="14" x="2" y="6" rx="2" />
          </svg>
          <!-- Package -->
          <svg
            v-else-if="item.icon === 'package'"
            class="size-5 text-primary flex-shrink-0 mt-0.5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"
            />
            <path d="M12 22V12" />
            <polyline points="3.29 7 12 12 20.71 7" />
            <path d="m7.5 4.27 9 5.15" />
          </svg>
          <!-- Scale -->
          <svg
            v-else-if="item.icon === 'scale'"
            class="size-5 text-primary flex-shrink-0 mt-0.5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
            <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
            <path d="M7 21h10" />
            <path d="M12 3v18" />
            <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
          </svg>
          <!-- Handshake -->
          <svg
            v-else-if="item.icon === 'handshake'"
            class="size-5 text-primary flex-shrink-0 mt-0.5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m11 17 2 2a1 1 0 1 0 3-3" />
            <path
              d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"
            />
            <path d="m21 3 1 11h-2" />
            <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
            <path d="M3 4h8" />
          </svg>
          <!-- Layers -->
          <svg
            v-else-if="item.icon === 'layers'"
            class="size-5 text-primary flex-shrink-0 mt-0.5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"
            />
            <path
              d="m6.08 9.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59"
            />
            <path
              d="m6.08 14.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59"
            />
          </svg>
          <!-- Sparkles -->
          <svg
            v-else-if="item.icon === 'sparkles'"
            class="size-5 text-primary flex-shrink-0 mt-0.5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
            />
            <path d="M20 3v4" />
            <path d="M22 5h-4" />
            <path d="M4 17v2" />
            <path d="M5 18H3" />
          </svg>

          <div class="flex-1 min-w-0">
            <p class="text-sm text-muted-foreground mb-1">{{ item.label }}</p>
            <p class="text-sm whitespace-pre-line">{{ item.value }}</p>
            <p v-if="item.comment" class="text-xs text-muted-foreground mt-1.5 italic">
              Коментар: {{ item.comment }}
            </p>
          </div>
        </div>

        <button
          v-if="!isCeoView"
          type="button"
          class="mt-3 h-9 px-3 rounded-[10px] border border-black/10 text-sm font-medium hover:bg-black/[0.02] transition-all"
          @click="goToStep(item.step)"
        >
          Редагувати
        </button>
      </div>
      </template>
      <template #footer>
    <!-- CEO Comments Section -->
    <div
      v-if="showCeoReview && (brandStatus === 'submitted' || brandStatus === 'needs_revision')"
      class="space-y-4 pt-4 border-t border-black/10"
    >
      <h4 class="text-sm font-medium text-foreground">Коментарі CEO</h4>
      <div v-for="section in CEO_COMMENT_SECTIONS" :key="section.key" class="space-y-1">
        <label class="text-xs text-muted-foreground">{{ section.label }}</label>
        <textarea
          v-model="ceoComments[section.key]"
          rows="2"
          class="w-full min-h-[4.5rem] resize-y px-3 py-2 bg-[#f3f3f5] border border-transparent rounded-lg text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20 transition-all"
          :placeholder="`Коментар до секції «${section.label}»...`"
        />
      </div>
    </div>

    <!-- Error messages -->
    <div
      v-if="saveError || statusActionError"
      class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm"
    >
      {{ statusActionError || saveError }}
    </div>

    <!-- CEO Selections indicator -->
    <div
      v-if="showCeoReview && Object.keys(ceoSelections).length > 0"
      class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700 text-sm"
    >
      <p class="font-medium mb-1">Обрані альтернативи CEO:</p>
      <ul class="list-disc list-inside space-y-0.5">
        <li v-if="ceoSelections.concept">
          Концепт:
          {{ concepts.find(c => c.id === ceoSelections.concept)?.name ?? ceoSelections.concept }}
        </li>
        <li v-if="ceoSelections.externalNaming">
          Зовн. назва:
          {{
            externalNamings.find(n => n.id === ceoSelections.externalNaming)?.name ??
            ceoSelections.externalNaming
          }}
        </li>
        <li v-if="ceoSelections.internalNaming">
          Внутр. назва:
          {{
            internalNamings.find(n => n.id === ceoSelections.internalNaming)?.name ??
            ceoSelections.internalNaming
          }}
        </li>
      </ul>
    </div>

    <!-- CEO Action Buttons -->
    <div
      v-if="showCeoReview && (brandStatus === 'submitted' || brandStatus === 'needs_revision')"
      class="grid grid-cols-1 gap-3 pt-4 border-t border-black/10"
    >
      <button
        class="flex items-center justify-center gap-2 px-6 py-3.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
        :disabled="statusActionLoading"
        @click="handleStatusChange('approved')"
      >
        <svg
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        {{ statusActionLoading ? 'Зачекайте...' : 'Затвердити' }}
      </button>
      <button
        class="flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors text-sm font-medium disabled:opacity-50"
        :disabled="statusActionLoading"
        @click="handleStatusChange('needs_revision')"
      >
        <svg
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </svg>
        Повернути на доопрацювання
      </button>
      <button
        class="flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium"
        @click="openCeoLibrary('concept')"
      >
        <svg
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"
          />
        </svg>
        Переглянути бібліотеку
      </button>
    </div>

    <!-- CEO Library Modal -->
    <Teleport to="body">
      <div
        v-if="showCeoLibraryModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      >
        <div
          class="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 h-[520px] max-h-[80vh] flex flex-col overflow-hidden"
        >
          <!-- Header: per NewConceptModal/NewNamingModal -->
          <div
            class="flex items-center justify-between h-[73px] px-6 border-b border-black/10 shrink-0"
          >
            <h3 class="text-xl font-semibold leading-[28px] tracking-[-0.45px] text-[#0a0a0a]">
              {{ ceoLibraryTitle }}
            </h3>
            <button
              type="button"
              class="size-10 rounded-full bg-[#ececf0] flex items-center justify-center hover:bg-[#dddde2] transition-colors"
              @click="showCeoLibraryModal = false"
            >
              <svg
                class="size-5"
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

          <!-- Scroll container: таби sticky всередині, щоб при скролі залишались поверх -->
          <div class="flex-1 min-h-0 overflow-y-auto">
            <div class="sticky top-0 z-10 flex gap-2 px-6 py-3 bg-white border-b border-black/10">
              <button
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                :class="
                  ceoLibraryType === 'concept'
                    ? 'bg-[#030213] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                "
                @click="ceoLibraryType = 'concept'"
              >
                Концепти
              </button>
              <button
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                :class="
                  ceoLibraryType === 'externalNaming'
                    ? 'bg-[#030213] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                "
                @click="ceoLibraryType = 'externalNaming'"
              >
                Зовнішні назви
              </button>
              <button
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                :class="
                  ceoLibraryType === 'internalNaming'
                    ? 'bg-[#030213] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                "
                @click="ceoLibraryType = 'internalNaming'"
              >
                Внутрішні назви
              </button>
            </div>
            <div class="px-6 py-4 space-y-2">
              <button
                v-for="item in ceoLibraryItems"
                :key="item.id"
                class="w-full text-left px-4 py-3 rounded-lg border transition-colors"
                :class="
                  ceoSelections[ceoLibraryType] === item.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-black/10 hover:bg-gray-50'
                "
                @click="selectCeoAlternative(ceoLibraryType, item.id)"
              >
                <span class="text-sm font-medium">{{ item.name }}</span>
                <span
                  v-if="ceoSelections[ceoLibraryType] === item.id"
                  class="ml-2 text-xs text-primary"
                  >Обрано</span
                >
              </button>
              <p
                v-if="ceoLibraryItems.length === 0"
                class="text-center text-sm text-muted-foreground py-8"
              >
                Немає доступних елементів
              </p>
            </div>
          </div>

          <!-- Footer: per NewConceptModal/NewNamingModal -->
          <div
            class="flex items-center justify-end px-6 pt-[17px] pb-4 border-t border-black/10 shrink-0"
          >
            <button
              type="button"
              class="h-[46px] px-6 bg-[#030213] text-white rounded-[10px] text-base font-medium leading-6 tracking-[-0.31px] hover:opacity-90 transition-all"
              @click="showCeoLibraryModal = false"
            >
              Закрити
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Action Buttons -->
    <div
      v-if="showPoSubmitButton || showShareButton || showPdfButton"
      class="space-y-3 pt-4 border-t border-black/10"
    >
      <button
        v-if="showPoSubmitButton"
        class="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
        :disabled="statusActionLoading || isSaving"
        @click="handleStatusChange('submitted')"
      >
        <svg
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
        {{
          statusActionLoading
            ? 'Відправляємо...'
            : hasNewBrief
              ? 'Відправити в роботу'
              : 'Відправити на розгляд'
        }}
      </button>

      <button
        v-if="showShareButton"
        class="flex items-center justify-center gap-2 px-6 py-4 bg-[#f3f3f5] text-foreground rounded-xl hover:bg-[#ececf0] transition-colors text-base font-medium disabled:opacity-50 w-full"
        :disabled="isSaving"
        @click="handleShare"
      >
        <svg
          v-if="shareSuccess"
          class="size-5 text-green-600"
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
        <svg
          v-else
          class="size-5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
          <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
        </svg>
        {{ shareSuccess ? 'Скопійовано!' : 'Share' }}
      </button>

      <button
        v-if="showPdfButton"
        class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white border border-black/10 text-foreground rounded-xl hover:bg-black/[0.02] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isPdfLoading"
        @click="handlePrintBrand"
      >
        <svg
          v-if="!isPdfLoading"
          class="size-4"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
        <svg
          v-else
          class="size-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        {{ isPdfLoading ? 'Генерація PDF...' : 'Завантажити PDF' }}
      </button>
    </div>
      </template>
    </Step10ReviewScrollLayout>
  </div>
</template>
