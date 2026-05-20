<script setup lang="ts">
import { computed, onMounted, ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useAuthStore } from '@/stores/auth'
import { apiPatch, apiGet } from '@/composables/useApi'
import { useLibrariesStore } from '@/stores/libraries'
import { useReviewComponentSelections } from '@/composables/useReviewComponentSelections'
import { logSilent } from '@/utils/log'
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
import SectionCommentBlock from '@/components/constructor/SectionCommentBlock.vue'
import ReviewHeader from '@/components/constructor/review/ReviewHeader.vue'
import ReviewSection from '@/components/constructor/review/ReviewSection.vue'
import ReviewSectionRow from '@/components/constructor/review/ReviewSectionRow.vue'
import ReviewConceptBlock from '@/components/constructor/review/ReviewConceptBlock.vue'
import ReviewExternalNamingsList from '@/components/constructor/review/ReviewExternalNamingsList.vue'
import ReviewInternalNamingBlock from '@/components/constructor/review/ReviewInternalNamingBlock.vue'
import ReviewPrPackageBlock from '@/components/constructor/review/ReviewPrPackageBlock.vue'
import ReviewDeliverablesBlock from '@/components/constructor/review/ReviewDeliverablesBlock.vue'
import ReviewVisualComponentsBlock from '@/components/constructor/review/ReviewVisualComponentsBlock.vue'
import CeoActionsFooter from '@/components/constructor/review/CeoActionsFooter.vue'
import PoActionsFooter from '@/components/constructor/review/PoActionsFooter.vue'
import SimpleModal from '@/components/ui/SimpleModal.vue'

const router = useRouter()
const { downloadPdf } = usePrintBrand()
const store = useConstructorStore()
const authStore = useAuthStore()
const librariesStore = useLibrariesStore()

const concepts = computed(() => librariesStore.concepts)
const externalNamings = computed(() => librariesStore.externalNamings)
const internalNamings = computed(() => librariesStore.internalNamings)
const prPackages = computed(() => librariesStore.prPackages)

const isCeoView = computed(() => authStore.isCeoOrAdmin)

/** True when PO is viewing a brief that was returned from CEO (needs_revision). */
const isPoReturnedView = computed(
  () => !isCeoView.value && brandStatus.value === 'needs_revision'
)

/** True if the current user is the brand owner (can resolve CEO comments). */
const isPoOwner = computed(
  () => !isCeoView.value && !!store.brandId
)

/**
 * Returns true when `sectionKey` has a CEO comment that PO hasn't resolved yet.
 * Only meaningful in the returned-from-CEO view.
 */
function hasSectionUnresolvedComment(sectionKey: string): boolean {
  if (!isPoReturnedView.value) return false
  const meta = store.brandCeoComments?.[sectionKey]
  return !!meta && meta.value.trim().length > 0 && !meta.resolved
}

function isSectionCeoCommentResolved(sectionKey: string): boolean {
  return store.brandCeoComments?.[sectionKey]?.resolved ?? false
}

function getSectionCeoCommentValue(sectionKey: string): string {
  return store.brandCeoComments?.[sectionKey]?.value ?? ''
}

async function handleCeoCommentResolve(sectionKey: string) {
  await store.setCeoCommentResolved(sectionKey, true)
}

async function handleCeoCommentUnresolve(sectionKey: string) {
  await store.setCeoCommentResolved(sectionKey, false)
}

/**
 * Section keys tracked for the attention counter.
 * `general` is excluded per spec — it has no resolved state and doesn't block submit.
 */
const ATTENTION_SECTION_KEYS = [
  'basics',
  'concept',
  'externalNaming',
  'internalNaming',
  'marketingPackage',
  'deliverables',
  'visualComponents',
] as const

/**
 * Number of sections that require PO attention:
 * - has an unresolved CEO comment, OR
 * - CEO proposed an alternative that PO hasn't applied/overridden yet.
 * `general` comment is excluded (per spec).
 */
const attentionCounter = computed(() => {
  if (!isPoReturnedView.value) return 0
  let count = 0
  for (const key of ATTENTION_SECTION_KEYS) {
    const meta = store.brandCeoComments?.[key]
    const hasUnresolvedComment = meta && meta.value.trim().length > 0 && !meta.resolved
    const isLibraryKey = (k: string): k is CeoLibraryTab =>
      CEO_LIBRARY_KEYS.includes(k as CeoLibraryTab)
    const selectionValue = store.brandCeoSelections?.[key]
    const hasUndecidedAlternative =
      isLibraryKey(key) &&
      selectionValue != null &&
      isCeoChoiceAnAlternative(key, selectionValue)
    if (hasUnresolvedComment || hasUndecidedAlternative) count++
  }
  return count
})

/** Blocks the "На погодження CEO" submit button when any section still needs attention. */
const submitBlocked = computed(() => isPoReturnedView.value && attentionCounter.value > 0)

// ─── Applied-state helpers (PO returned view) ───────────────────────────────

/**
 * True when PO already applied the CEO concept (stepData.concept.selectedId
 * now matches ceoSelections.concept). We don't store a separate flag; derive
 * from the current state.
 */
const isCeoConceptApplied = computed(() => {
  if (!isPoReturnedView.value) return false
  const ceoConcept = ceoSelectionAsString(store.brandCeoSelections?.concept)
  if (!ceoConcept) return false
  return store.stepData.concept.selectedId === ceoConcept
})

const isCeoExternalApplied = computed(() => {
  if (!isPoReturnedView.value) return false
  const ceoExt = ceoSelectionAsArray(store.brandCeoSelections?.externalNaming)
  if (ceoExt.length === 0) return false
  const poExt = store.stepData.externalNaming.selectedIds
  if (poExt.length !== ceoExt.length) return false
  return ceoExt.every(id => poExt.includes(id))
})

const isCeoInternalApplied = computed(() => {
  if (!isPoReturnedView.value) return false
  const ceoInt = ceoSelectionAsString(store.brandCeoSelections?.internalNaming)
  if (!ceoInt) return false
  return store.stepData.internalNaming.selectedId === ceoInt
})

/**
 * CEO proposed a different concept AND it hasn't been applied yet.
 * Blocks editing External Naming until concept is resolved.
 */
const hasConceptMismatch = computed(() => {
  if (!isPoReturnedView.value) return false
  return isCeoChoiceAnAlternative('concept', store.brandCeoSelections?.concept ?? '') &&
    !isCeoConceptApplied.value
})

// ─── Dependency-guard modals (Figma 1985:4362, 1985:4657) ───────────────────

/** Modal 1: PO tries to apply CEO external naming while CEO concept is still pending. */
const showApplyExternalBeforeConceptModal = ref(false)
/** Modal 2: PO tries to edit external naming while concept mismatch exists. */
const showEditExternalBeforeConceptModal = ref(false)

async function handleApplyCeoVariant(section: 'concept' | 'externalNaming' | 'internalNaming') {
  if (section === 'externalNaming' && hasConceptMismatch.value) {
    showApplyExternalBeforeConceptModal.value = true
    return
  }
  await store.applyCeoVariant(section)
}

async function handleApplyAll() {
  showApplyExternalBeforeConceptModal.value = false
  await store.applyCeoConceptAndExternal()
}

function handleGoToEditConcept() {
  showEditExternalBeforeConceptModal.value = false
  const bid = store.brandId
  if (bid) router.push(`/constructor/brand/${bid}/po-edit/concept`)
}

onMounted(() => {
  librariesStore.load(store.brandId)
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

const { componentSelectionDetails, loadComponentSelectionDetails } =
  useReviewComponentSelections()

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

const brandStatus = computed(() => store.brandStatus ?? 'draft')

const hasNewBrief = computed(() => {
  return (
    store.stepData?.concept?.newConceptBrief != null ||
    store.stepData?.externalNaming?.newNamingBrief != null ||
    store.stepData?.internalNaming?.newNamingFeedback != null
  )
})

const showPoSubmitButton = computed(
  () =>
    !isCeoView.value && (brandStatus.value === 'draft' || brandStatus.value === 'needs_revision')
)

// Share hidden — not in v2 PRD; teams get brief via Slack/constructor link.
const showShareButton = computed(() => false)

const showPdfButton = computed(() => {
  // No PDF button in returned-from-CEO view.
  if (isPoReturnedView.value) return false
  return (
    brandStatus.value === 'submitted' ||
    brandStatus.value === 'needs_revision' ||
    brandStatus.value === 'approved'
  )
})

function ceoSelectionAsString(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') return value || null
  if (Array.isArray(value)) return value[0] ?? null
  return null
}
function ceoSelectionAsArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value) return [value]
  return []
}

/**
 * PDF generator (`usePrintBrand`) expects `Record<string, string>` —
 * flatten the CEO comment meta map before passing it in.
 */
function flattenCeoCommentsForPdf(
  comments: Record<string, { value: string }> | null
): Record<string, string> | null {
  if (!comments) return null
  const out: Record<string, string> = {}
  for (const [k, meta] of Object.entries(comments)) {
    if (meta.value.trim()) out[k] = meta.value
  }
  return Object.keys(out).length > 0 ? out : null
}

type CeoLibraryTab = 'concept' | 'externalNaming' | 'internalNaming'

const CEO_LIBRARY_KEYS: CeoLibraryTab[] = ['concept', 'externalNaming', 'internalNaming']

function isCeoChoiceAnAlternative(key: CeoLibraryTab, ceoValue: string | string[]): boolean {
  if (key === 'concept') {
    const ceoId = typeof ceoValue === 'string' ? ceoValue : ceoValue[0]
    if (!ceoId?.trim()) return false
    const poId = store.stepData.concept.selectedId
    return !poId || ceoId !== poId
  }
  if (key === 'externalNaming') {
    const ceoIds = ceoSelectionAsArray(ceoValue)
    if (ceoIds.length === 0) return false
    const poIds = store.stepData.externalNaming.selectedIds ?? []
    if (poIds.length !== ceoIds.length) return true
    return ceoIds.some(id => !poIds.includes(id))
  }
  const ceoId = typeof ceoValue === 'string' ? ceoValue : ceoValue[0]
  if (!ceoId?.trim()) return false
  const poId = store.stepData.internalNaming.selectedId
  return !poId || ceoId !== poId
}

/** CEO pick shown next to PO when it differs from PO (brand brief review). */
const reviewCeoConceptForBlock = computed(() => {
  const id = ceoSelectionAsString(store.brandCeoSelections?.concept)
  if (!id) return null
  if (!isCeoChoiceAnAlternative('concept', id)) return null
  return concepts.value.find(c => c.id === id) ?? null
})

const ceoExternalItemsForReview = computed(() => {
  const ids = ceoSelectionAsArray(store.brandCeoSelections?.externalNaming)
  if (ids.length === 0 || !isCeoChoiceAnAlternative('externalNaming', ids)) return []
  const poIdSet = new Set(store.stepData.externalNaming.selectedIds ?? [])
  // Показуємо в колонці CEO лише те, чого немає у виборі замовника (без дублювання TestEcho тощо).
  let displayIds = ids.filter(id => !poIdSet.has(id))
  if (displayIds.length === 0) displayIds = ids
  return displayIds
    .map(id => externalNamings.value.find(x => x.id === id))
    .filter((n): n is ExternalNaming => n != null)
    .map(n => ({
      id: n.id,
      name: n.name,
      domain: (n as ExternalNaming & { domain?: string }).domain,
    }))
})

const ceoInternalNameForReview = computed(() => {
  const id = ceoSelectionAsString(store.brandCeoSelections?.internalNaming)
  if (!id || !isCeoChoiceAnAlternative('internalNaming', id)) return null
  return internalNamings.value.find(n => n.id === id)?.name ?? null
})

const ceoComments = reactive<Record<string, string>>({
  basics: '',
  concept: '',
  externalNaming: '',
  internalNaming: '',
  marketingPackage: '',
  deliverables: '',
  visualComponents: '',
  general: '',
})

/** True when CEO/admin is reviewing a brand they need to act on (submitted or already returned). */
const ceoFinalizeView = computed(
  () =>
    isCeoView.value && (brandStatus.value === 'submitted' || brandStatus.value === 'needs_revision')
)

/**
 * CEO viewing a brand that was already sent back to PO for revision.
 * Read-only frozen view — CEO already did their work, waits for PO to resubmit.
 * No editable comments, no footer actions.
 */
const ceoFrozenView = computed(
  () => isCeoView.value && brandStatus.value === 'needs_revision'
)

/** PO final step in draft — Figma Product view (1566:27958). Same shell for CEO viewing a draft. */
const poDraftView = computed(() => brandStatus.value === 'draft')

/** PO viewing their submitted brand (awaiting CEO review) — read-only unified layout. */
const poSubmittedView = computed(
  () => !isCeoView.value && brandStatus.value === 'submitted'
)

/**
 * Approved brief — read-only terminal view shown to ANY role (PO, CEO/admin,
 * external teams). Same Figma "Product view" shell as PO draft. No edit, no
 * submit, no CEO actions. Footer keeps only Download PDF.
 *
 * NOTE: `rejected` is not handled here on purpose — there is no UI path that
 * sets `rejected` in the current product (CEO can only approve or send for
 * revision). The leftover `rejected` enum value lives only in the worker
 * `STATUS_TRANSITIONS` table and the admin filter tab; cleaning that up is
 * tracked as a separate finding.
 */
const approvedReadOnlyView = computed(() => brandStatus.value === 'approved')

const reviewMode = computed<
  'ceo' | 'po-draft' | 'po-returned' | 'po-submitted' | 'approved'
>(() => {
  if (ceoFinalizeView.value) return 'ceo'
  if (isPoReturnedView.value) return 'po-returned'
  if (poSubmittedView.value) return 'po-submitted'
  if (approvedReadOnlyView.value) return 'approved'
  return 'po-draft'
})

const poDraftInfoOverride = {
  title: 'Бриф готовий!',
  description:
    'Перегляньте всю інформацію справа. Ви можете поділитися брифом або зберегти його для подальшої роботи.',
  iconVariant: 'check' as const,
} as const

/**
 * Pluralised section noun for the PO returned-from-CEO attention banner
 * ("4 секції потребують уваги" / "1 секція" / "5 секцій").
 */
function sectionWord(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'секція'
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'секції'
  return 'секцій'
}

/**
 * ReviewHeader info-block override — varies by reviewMode:
 *  - po-draft     → "Бриф готовий!" (check icon)
 *  - po-returned  → "N секцій потребують уваги" (warning icon) — Figma 1973:7893
 *  - ceo          → no override (status-driven default "Бриф на розгляді")
 */
const reviewHeaderInfoOverride = computed(() => {
  if (reviewMode.value === 'po-draft') return poDraftInfoOverride
  if (reviewMode.value === 'po-submitted') {
    return {
      title: 'Бриф на розгляді',
      description: 'Бриф відправлено CEO на погодження. Очікуйте на відповідь.',
      iconVariant: 'check' as const,
    }
  }
  if (reviewMode.value === 'approved') {
    return {
      title: 'Бриф затверджено',
      description: 'Це фінальна версія брифу, погоджена СЕО.',
      iconVariant: 'check' as const,
    }
  }
  if (reviewMode.value === 'po-returned') {
    if (attentionCounter.value > 0) {
      return {
        title: `${attentionCounter.value} ${sectionWord(attentionCounter.value)} потребують уваги`,
        description:
          'Перегляньте коментарі та зміни від СЕО і оновіть бриф перед повторним відправленням.',
        iconVariant: 'warning' as const,
      }
    }
    // Counter reached 0 — explicitly hide the info block (null = no block)
    return null
  }
  if (ceoFrozenView.value) {
    return {
      title: 'Бриф направлено на доопрацювання PO',
      description: 'Очікуємо на повторне погодження. Поточні дані можуть оновлюватись.',
      iconVariant: 'warning' as const,
    }
  }
  return undefined
})

const brandHeaderTitle = computed(
  () =>
    store.brandInternalName ||
    selectedExternalNamings.value[0]?.name ||
    selectedConcept.value?.name ||
    'Новий бренд'
)

const unifiedReviewTitle = computed(() => {
  if (reviewMode.value === 'po-draft') return 'Final review'
  // po-returned + ceo both show brand name as header
  return brandHeaderTitle.value
})

const unifiedReviewSubtitle = computed(() =>
  reviewMode.value === 'po-draft' ? 'Перевірте всі дані перед відправкою' : undefined
)

/**
 * `Редагувати` button is available in PO draft AND PO returned-from-CEO views,
 * but NOT in CEO finalize, PO submitted or approved read-only view.
 */
const isPoEditable = computed(
  () =>
    reviewMode.value !== 'ceo' &&
    reviewMode.value !== 'po-submitted' &&
    reviewMode.value !== 'approved'
)

const externalNamingItems = computed(() =>
  selectedExternalNamings.value.map(n => ({
    id: n.id,
    name: n.name,
    domain: (n as ExternalNaming & { domain?: string }).domain,
  }))
)

const deliverablesScopeText = computed(() => {
  const items: string[] = []
  if (deliverables.value.legalLanding) items.push('Legal Landing')
  if (deliverables.value.partnerLanding) items.push('Partner Landing')
  return items.length > 0 ? items.join(', ') : 'Не вибрано'
})

const deliverablesTimingText = computed(() => {
  const dl = deliverables.value.developmentDeadline?.trim() ?? ''
  return dl ? formatDate(dl) : 'Не визначено'
})

const visualComponentsSummary = computed(() => {
  if (visualComponents.value.delegateToDesigners) return 'Делеговано дизайнерам'
  if (componentSelectionCount.value === 0) return 'Не вибрано'
  return Object.keys(visualComponents.value.selections)
    .map(typeId => componentSelectionDetails.value[typeId]?.typeName ?? typeId)
    .join(', ')
})

function getPoCommentForSection(key: string): string {
  switch (key) {
    case 'basics':
      return basics.value.comment?.trim() || ''
    case 'concept':
      return store.stepData.concept.comment?.trim() || ''
    case 'externalNaming':
      return store.stepData.externalNaming.comment?.trim() || ''
    case 'internalNaming':
      return store.stepData.internalNaming.comment?.trim() || ''
    case 'marketingPackage':
      return store.stepData.marketingPackage.comment?.trim() || ''
    case 'deliverables':
      return deliverables.value.comment?.trim() || ''
    case 'visualComponents':
      return visualComponents.value.comment?.trim() || ''
    default:
      return ''
  }
}

function handleCeoCommentBySection(key: string, value: string) {
  ceoComments[key] = value
  store.setCeoCommentValue(key, value)
  if (value.trim()) {
    revisionMissingSections.value.delete(key)
    if (revisionMissingSections.value.size === 0) {
      revisionRequiresAnyComment.value = false
    }
  }
}

function startCeoReselectBySection(key: string) {
  const bid = store.brandId
  if (!bid) return
  if (key === 'concept') {
    store.seedCeoReselectFromBrand('concept')
    router.push(`/constructor/brand/${bid}/ceo-reselect/concept`)
  } else if (key === 'externalNaming') {
    store.seedCeoReselectFromBrand('externalNaming')
    router.push(`/constructor/brand/${bid}/ceo-reselect/external-naming`)
  } else if (key === 'internalNaming') {
    store.seedCeoReselectFromBrand('internalNaming')
    router.push(`/constructor/brand/${bid}/ceo-reselect/internal-naming`)
  }
}

watch(
  () => store.brandCeoComments,
  comments => {
    if (comments) {
      for (const [key, meta] of Object.entries(comments)) {
        if (key in ceoComments) {
          ceoComments[key] = meta.value
        }
      }
    }
  },
  { immediate: true }
)

const nonEmptyCeoComments = computed(() => {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(ceoComments)) {
    if (value.trim()) result[key] = value.trim()
  }
  return result
})

const SECTION_TO_COMMENT_KEY: Record<string, string> = {
  basics: 'basics',
  mode: 'concept',
  concept: 'concept',
  externalNaming: 'externalNaming',
  internalNaming: 'internalNaming',
  marketingPackage: 'marketingPackage',
  deliverables: 'deliverables',
  visualComponents: 'visualComponents',
}

function handleGeneralCeoCommentUpdate(value: string) {
  ceoComments.general = value
  store.setCeoCommentValue('general', value)
  if (value.trim()) {
    revisionRequiresAnyComment.value = false
  }
}

function openConceptPreview(concept?: Concept | null) {
  const c = concept ?? selectedConcept.value
  if (!c) return
  store.openConceptPreview(c.id)
}

/** Sections that must have a CEO comment because CEO chose an alternative there. */
const SELECTION_REQUIRING_COMMENT: CeoLibraryTab[] = ['concept', 'externalNaming', 'internalNaming']

/** Sections currently flagged as "comment required" after a failed needs_revision attempt. */
const revisionMissingSections = ref<Set<string>>(new Set())
/** True when no CEO comment exists at all and CEO clicked needs_revision. */
const revisionRequiresAnyComment = ref(false)

function isSectionHighlighted(sectionKey: string): boolean {
  const key = SECTION_TO_COMMENT_KEY[sectionKey] ?? sectionKey
  return revisionMissingSections.value.has(key)
}

function validateNeedsRevision():
  | { ok: true }
  | { ok: false; reason: 'no-comment' | 'missing-section' } {
  const missing = new Set<string>()
  const sel = store.brandCeoSelections
  for (const key of SELECTION_REQUIRING_COMMENT) {
    const v = sel?.[key]
    if (
      v != null &&
      isCeoChoiceAnAlternative(key, v) &&
      !(ceoComments[key] ?? '').trim()
    ) {
      missing.add(key)
    }
  }
  if (missing.size > 0) {
    revisionMissingSections.value = missing
    revisionRequiresAnyComment.value = false
    return { ok: false, reason: 'missing-section' }
  }
  if (Object.keys(nonEmptyCeoComments.value).length === 0) {
    revisionRequiresAnyComment.value = true
    return { ok: false, reason: 'no-comment' }
  }
  revisionRequiresAnyComment.value = false
  revisionMissingSections.value = new Set()
  return { ok: true }
}

const revisionWarning = computed<string | null>(() => {
  if (revisionRequiresAnyComment.value || revisionMissingSections.value.size > 0) {
    return 'Додайте хоча б один коментар перед поверненням.'
  }
  return null
})

/**
 * PO “Редагувати” from a review section — captures a snapshot so the user can
 * cancel changes and come back to the Final review with Скасувати / Зберегти.
 * Uses the section key (same as SectionCommentBlock) to locate the slice.
 */
function editSection(step: number, sectionKey: string) {
  const bid = store.brandId
  // In returned-from-CEO view, concept/external/internal use dedicated po-edit routes.
  if (isPoReturnedView.value && bid) {
    if (sectionKey === 'externalNaming') {
      if (hasConceptMismatch.value) {
        showEditExternalBeforeConceptModal.value = true
        return
      }
      const query = isCeoExternalApplied.value ? { mode: 'post-apply' } : {}
      router.push({ path: `/constructor/brand/${bid}/po-edit/external-naming`, query })
      return
    }
    if (sectionKey === 'concept') {
      const query = isCeoConceptApplied.value ? { mode: 'post-apply' } : {}
      router.push({ path: `/constructor/brand/${bid}/po-edit/concept`, query })
      return
    }
    if (sectionKey === 'internalNaming') {
      const query = isCeoInternalApplied.value ? { mode: 'post-apply' } : {}
      router.push({ path: `/constructor/brand/${bid}/po-edit/internal-naming`, query })
      return
    }
  }
  store.beginEditSection(sectionKey, 8)
  router.push(`/constructor/step/${step}`)
}

/** CEO flow only — keeps the legacy “Повернутись” behaviour. */
function goToStep(step: number) {
  store.setReturnToStep(8)
  router.push(`/constructor/step/${step}`)
}

/** PO footer “Назад” — plain step navigation, no edit-mode marker. */
function backToStep(step: number) {
  store.setReturnToStep(null)
  router.push(`/constructor/step/${step}`)
}

function handlePrPackagePreview() {
  if (selectedPackage.value) {
    store.openPrPackagePreview(selectedPackage.value)
  }
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
  } catch (err) {
    logSilent('Step10/copyShareUrl', err)
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
  if (newStatus === 'needs_revision') {
    const validation = validateNeedsRevision()
    if (!validation.ok) {
      // Scroll only when CEO must add a comment in a specific section; for the
      // generic "no comments at all" case keep the viewport in place so the
      // warning under the button stays visible.
      if (validation.reason === 'missing-section') {
        const targetSection = revisionMissingSections.value.values().next().value ?? null
        if (targetSection) {
          const sectionEl = document.querySelector<HTMLElement>(
            `[data-section="${targetSection}"]`
          )
          sectionEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
      return
    }
  } else {
    revisionRequiresAnyComment.value = false
    revisionMissingSections.value = new Set()
  }

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
    if (isCeoView.value) {
      const persisted = store.brandCeoSelections
      if (persisted && Object.keys(persisted).length > 0) {
        payload.ceoSelections = { ...persisted }
      }
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
    if (brandStatus.value === 'needs_revision' && store.brandId) {
      await store.saveBrand()
    }
    const selections = store.stepData?.visualComponents?.selections ?? {}
    const componentTypes: Record<string, ComponentTypeInfo> = {}

    const fetchPromises = Object.entries(selections).map(async ([typeId, variantId]) => {
      try {
        const data = await apiGet<{ type: { name: string }; variants: Array<{ id: string; name: string }> }>(
          `/api/components/types/${typeId}/variants?status=all`
        )
        const typeName = data.type?.name ?? 'Невідомий тип'
        const variants = data.variants || []
        const variant = variants.find(v => v.id === variantId)
        componentTypes[typeId] = { typeName, variantName: variant?.name ?? 'Невідомий варіант' }
      } catch (err) {
        logSilent('Step10/handlePrintBrand', err)
        componentTypes[typeId] = { typeName: 'Невідомий тип', variantName: 'Невідомий варіант' }
      }
    })
    await Promise.all(fetchPromises)

    const ceoSelectionsResolved: Record<string, string> = {}
    for (const key of CEO_LIBRARY_KEYS) {
      const v = store.brandCeoSelections?.[key]
      if (key === 'externalNaming') {
        const ids = ceoSelectionAsArray(v)
        if (ids.length === 0) continue
        const names = ids
          .map(id => externalNamings.value.find(n => n.id === id)?.name ?? id)
          .filter((n): n is string => Boolean(n))
        if (names.length > 0) ceoSelectionsResolved[key] = names.join(', ')
      } else {
        const id = ceoSelectionAsString(v)
        if (!id?.trim()) continue
        if (key === 'concept') {
          ceoSelectionsResolved[key] = concepts.value.find(c => c.id === id)?.name ?? id
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
      ceoComments: flattenCeoCommentsForPdf(store.brandCeoComments),
      ceoSelections: Object.keys(ceoSelectionsResolved).length > 0 ? ceoSelectionsResolved : null,
    }

    await downloadPdf(data)
  } finally {
    isPdfLoading.value = false
  }
}
</script>

<template>
  <!-- Unified review layout — covers all five active modes:
       CEO finalize, PO draft, PO submitted, PO returned-from-CEO, approved
       read-only. -->
  <div class="flex flex-col flex-1 min-h-0 h-full">
    <div class="flex-1 min-h-0 overflow-y-auto">
      <div class="px-8 py-8 flex flex-col gap-6">
        <ReviewHeader
          :title="unifiedReviewTitle"
          :status="brandStatus"
          :subtitle="unifiedReviewSubtitle"
          :current-step="reviewMode === 'po-draft' ? 8 : undefined"
          :total-steps="reviewMode === 'po-draft' ? 8 : undefined"
          :progress-percent="reviewMode === 'po-draft' ? 100 : undefined"
          :info-override="reviewHeaderInfoOverride"
        />

        <div class="space-y-4">
          <ReviewSection
            title="Brand Basics"
            :edit-step="isPoEditable ? 1 : undefined"
            :has-unresolved="hasSectionUnresolvedComment('basics')"
            @edit="step => editSection(step, 'basics')"
          >
            <ReviewSectionRow
              v-if="basics.geo.length > 0"
              label="Географія"
              :value="basics.geo.join(', ')"
            >
              <template #icon>
                <svg
                  class="size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
                  <path
                    d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                  <path d="M2 12h20" stroke="currentColor" stroke-width="2" />
                </svg>
              </template>
            </ReviewSectionRow>
            <ReviewSectionRow
              v-if="basics.launchDate"
              label="Дата запуску"
              :value="formatDate(basics.launchDate)"
            >
              <template #icon>
                <svg
                  class="size-5"
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M6.04163 5.00033V1.66699C6.04163 1.32181 6.32145 1.04199 6.66663 1.04199C7.0118 1.04199 7.29163 1.32181 7.29163 1.66699V5.00033C7.29163 5.3455 7.0118 5.62533 6.66663 5.62533C6.32145 5.62533 6.04163 5.3455 6.04163 5.00033ZM12.7083 5.00033V1.66699C12.7083 1.32181 12.9881 1.04199 13.3333 1.04199C13.6785 1.04199 13.9583 1.32181 13.9583 1.66699V5.00033C13.9583 5.3455 13.6785 5.62533 13.3333 5.62533C12.9881 5.62533 12.7083 5.3455 12.7083 5.00033Z"
                    fill="#5B5B62"
                  />
                  <path
                    d="M16.875 9.99967C16.875 8.41071 16.8738 7.28183 16.7586 6.42546C16.6459 5.58706 16.4342 5.10414 16.0815 4.75147C15.7289 4.39881 15.246 4.1871 14.4076 4.07438C13.5512 3.95926 12.4223 3.95801 10.8333 3.95801H9.16667C7.5777 3.95801 6.44882 3.95926 5.59245 4.07438C4.75404 4.1871 4.27114 4.39879 3.91846 4.75147C3.56578 5.10414 3.35409 5.58705 3.24137 6.42546C3.12625 7.28183 3.125 8.41071 3.125 9.99967V11.6663C3.125 13.2553 3.12625 14.3842 3.24137 15.2406C3.3541 16.079 3.5658 16.5619 3.91846 16.9146C4.27114 17.2672 4.75405 17.4789 5.59245 17.5916C6.44882 17.7068 7.5777 17.708 9.16667 17.708H10.8333C12.4223 17.708 13.5512 17.7068 14.4076 17.5916C15.246 17.4789 15.7289 17.2672 16.0815 16.9146C16.4342 16.5619 16.6459 16.079 16.7586 15.2406C16.8738 14.3842 16.875 13.2553 16.875 11.6663V9.99967ZM18.125 11.6663C18.125 13.22 18.1262 14.4483 17.9972 15.4074C17.8659 16.3843 17.5889 17.1748 16.9653 17.7983C16.3418 18.4219 15.5513 18.6989 14.5744 18.8302C13.6153 18.9592 12.387 18.958 10.8333 18.958H9.16667C7.61299 18.958 6.38466 18.9592 5.42562 18.8302C4.4487 18.6989 3.65826 18.4219 3.03467 17.7983C2.41106 17.1748 2.13413 16.3843 2.00277 15.4074C1.87383 14.4483 1.875 13.22 1.875 11.6663V9.99967C1.875 8.44599 1.87383 7.21766 2.00277 6.25863C2.13414 5.28171 2.41108 4.49127 3.03467 3.86768C3.65826 3.24409 4.4487 2.96714 5.42562 2.83578C6.38466 2.70684 7.61299 2.70801 9.16667 2.70801H10.8333C12.387 2.70801 13.6153 2.70684 14.5744 2.83578C15.5513 2.96714 16.3418 3.24407 16.9653 3.86768C17.5889 4.49127 17.8659 5.28171 17.9972 6.25863C18.1262 7.21767 18.125 8.44599 18.125 9.99967V11.6663Z"
                    fill="#5B5B62"
                  />
                  <path
                    d="M17.5 7.70801C17.8452 7.70801 18.125 7.98783 18.125 8.33301C18.125 8.67819 17.8452 8.95801 17.5 8.95801H2.5C2.15482 8.95801 1.875 8.67819 1.875 8.33301C1.875 7.98783 2.15482 7.70801 2.5 7.70801H17.5Z"
                    fill="#5B5B62"
                  />
                </svg>
              </template>
            </ReviewSectionRow>
            <ReviewSectionRow
              v-if="basics.linkedProduct"
              label="Звʼязок з іншим продуктом"
              :value="basics.linkedProduct"
            >
              <template #icon>
                <svg
                  class="size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 17H7a5 5 0 0 1 0-10h2" />
                  <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </template>
            </ReviewSectionRow>
            <template #comment>
              <SectionCommentBlock
                section-key="basics"
                :po-comment="getPoCommentForSection('basics')"
                :ceo-comment="isPoReturnedView ? getSectionCeoCommentValue('basics') : (ceoComments.basics ?? '')"
                :ceo-editable="reviewMode === 'ceo' && !ceoFrozenView"
                :show-resolve-ui="isPoReturnedView && !!getSectionCeoCommentValue('basics')"
                :ceo-resolved="isSectionCeoCommentResolved('basics')"
                :can-resolve="isPoOwner"
                :ceo-resolve-loading="store.isCeoCommentResolveLoading('basics')"
                @update:ceo-comment="value => handleCeoCommentBySection('basics', value)"
                @resolve="handleCeoCommentResolve('basics')"
                @unresolve="handleCeoCommentUnresolve('basics')"
              />
            </template>
          </ReviewSection>

          <ReviewSection
            title="Concept"
            :edit-step="isPoEditable ? 2 : undefined"
            :change-choice="reviewMode === 'ceo' && !ceoFrozenView"
            :has-unresolved="hasSectionUnresolvedComment('concept')"
            :needs-choice="isPoReturnedView && isCeoChoiceAnAlternative('concept', store.brandCeoSelections?.concept ?? '') && !isCeoConceptApplied"
            @edit="step => editSection(step, 'concept')"
            @change="startCeoReselectBySection('concept')"
          >
            <ReviewConceptBlock
              :concept="selectedConcept"
              :ceo-concept="reviewCeoConceptForBlock"
              :mode="mode"
              :is-new-concept="isNewConcept"
              :show-apply-ceo="isPoReturnedView && isCeoChoiceAnAlternative('concept', store.brandCeoSelections?.concept ?? '') && !isCeoConceptApplied"
              :apply-loading="store.isApplyingCeoVariant"
              :ceo-applied="isCeoConceptApplied"
              @preview="openConceptPreview($event)"
              @apply-ceo="handleApplyCeoVariant('concept')"
            />
            <template #comment>
              <SectionCommentBlock
                section-key="concept"
                :po-comment="getPoCommentForSection('concept')"
                :ceo-comment="isPoReturnedView ? getSectionCeoCommentValue('concept') : (ceoComments.concept ?? '')"
                :ceo-editable="reviewMode === 'ceo' && !ceoFrozenView"
                :highlighted="reviewMode === 'ceo' && isSectionHighlighted('concept')"
                :show-resolve-ui="isPoReturnedView && !!getSectionCeoCommentValue('concept')"
                :ceo-resolved="isSectionCeoCommentResolved('concept')"
                :can-resolve="isPoOwner"
                :ceo-resolve-loading="store.isCeoCommentResolveLoading('concept')"
                @update:ceo-comment="value => handleCeoCommentBySection('concept', value)"
                @resolve="handleCeoCommentResolve('concept')"
                @unresolve="handleCeoCommentUnresolve('concept')"
              />
            </template>
          </ReviewSection>

          <ReviewSection
            title="External Naming"
            :edit-step="isPoEditable ? 3 : undefined"
            :change-choice="reviewMode === 'ceo' && !ceoFrozenView"
            :has-unresolved="hasSectionUnresolvedComment('externalNaming')"
            :needs-choice="isPoReturnedView && isCeoChoiceAnAlternative('externalNaming', store.brandCeoSelections?.externalNaming ?? '') && !isCeoExternalApplied"
            @edit="step => editSection(step, 'externalNaming')"
            @change="startCeoReselectBySection('externalNaming')"
          >
            <ReviewExternalNamingsList
              :items="externalNamingItems"
              :ceo-items="ceoExternalItemsForReview"
              :show-apply-ceo="isPoReturnedView && isCeoChoiceAnAlternative('externalNaming', store.brandCeoSelections?.externalNaming ?? '') && !isCeoExternalApplied"
              :apply-loading="store.isApplyingCeoVariant"
              :ceo-applied="isCeoExternalApplied"
              @apply-ceo="handleApplyCeoVariant('externalNaming')"
            />
            <template #comment>
              <SectionCommentBlock
                section-key="externalNaming"
                :po-comment="getPoCommentForSection('externalNaming')"
                :ceo-comment="isPoReturnedView ? getSectionCeoCommentValue('externalNaming') : (ceoComments.externalNaming ?? '')"
                :ceo-editable="reviewMode === 'ceo' && !ceoFrozenView"
                :highlighted="reviewMode === 'ceo' && isSectionHighlighted('externalNaming')"
                :show-resolve-ui="isPoReturnedView && !!getSectionCeoCommentValue('externalNaming')"
                :ceo-resolved="isSectionCeoCommentResolved('externalNaming')"
                :can-resolve="isPoOwner"
                :ceo-resolve-loading="store.isCeoCommentResolveLoading('externalNaming')"
                @update:ceo-comment="value => handleCeoCommentBySection('externalNaming', value)"
                @resolve="handleCeoCommentResolve('externalNaming')"
                @unresolve="handleCeoCommentUnresolve('externalNaming')"
              />
            </template>
          </ReviewSection>

          <ReviewSection
            title="Internal Naming"
            :edit-step="isPoEditable ? 4 : undefined"
            :change-choice="reviewMode === 'ceo' && !ceoFrozenView"
            :has-unresolved="hasSectionUnresolvedComment('internalNaming')"
            :needs-choice="isPoReturnedView && isCeoChoiceAnAlternative('internalNaming', store.brandCeoSelections?.internalNaming ?? '') && !isCeoInternalApplied"
            @edit="step => editSection(step, 'internalNaming')"
            @change="startCeoReselectBySection('internalNaming')"
          >
            <ReviewInternalNamingBlock
              :po-value="selectedInternalNaming?.name || internalFeedback || 'Не обрано'"
              :ceo-name="ceoInternalNameForReview"
              :show-apply-ceo="isPoReturnedView && isCeoChoiceAnAlternative('internalNaming', store.brandCeoSelections?.internalNaming ?? '') && !isCeoInternalApplied"
              :apply-loading="store.isApplyingCeoVariant"
              :ceo-applied="isCeoInternalApplied"
              @apply-ceo="handleApplyCeoVariant('internalNaming')"
            />
            <template #comment>
              <SectionCommentBlock
                section-key="internalNaming"
                :po-comment="getPoCommentForSection('internalNaming')"
                :ceo-comment="isPoReturnedView ? getSectionCeoCommentValue('internalNaming') : (ceoComments.internalNaming ?? '')"
                :ceo-editable="reviewMode === 'ceo' && !ceoFrozenView"
                :highlighted="reviewMode === 'ceo' && isSectionHighlighted('internalNaming')"
                :show-resolve-ui="isPoReturnedView && !!getSectionCeoCommentValue('internalNaming')"
                :ceo-resolved="isSectionCeoCommentResolved('internalNaming')"
                :can-resolve="isPoOwner"
                :ceo-resolve-loading="store.isCeoCommentResolveLoading('internalNaming')"
                @update:ceo-comment="value => handleCeoCommentBySection('internalNaming', value)"
                @resolve="handleCeoCommentResolve('internalNaming')"
                @unresolve="handleCeoCommentUnresolve('internalNaming')"
              />
            </template>
          </ReviewSection>

          <ReviewSection
            title="PR Package"
            :edit-step="isPoEditable ? 5 : undefined"
            :has-unresolved="hasSectionUnresolvedComment('marketingPackage')"
            @edit="step => editSection(step, 'marketingPackage')"
          >
            <ReviewPrPackageBlock
              :title="selectedPackage?.name ?? 'Не обрано'"
              @view="handlePrPackagePreview"
            />
            <template #comment>
              <SectionCommentBlock
                section-key="marketingPackage"
                :po-comment="getPoCommentForSection('marketingPackage')"
                :ceo-comment="isPoReturnedView ? getSectionCeoCommentValue('marketingPackage') : (ceoComments.marketingPackage ?? '')"
                :ceo-editable="reviewMode === 'ceo' && !ceoFrozenView"
                :show-resolve-ui="isPoReturnedView && !!getSectionCeoCommentValue('marketingPackage')"
                :ceo-resolved="isSectionCeoCommentResolved('marketingPackage')"
                :can-resolve="isPoOwner"
                :ceo-resolve-loading="store.isCeoCommentResolveLoading('marketingPackage')"
                @update:ceo-comment="value => handleCeoCommentBySection('marketingPackage', value)"
                @resolve="handleCeoCommentResolve('marketingPackage')"
                @unresolve="handleCeoCommentUnresolve('marketingPackage')"
              />
            </template>
          </ReviewSection>

          <ReviewSection
            title="Deliverables"
            :edit-step="isPoEditable ? 6 : undefined"
            :has-unresolved="hasSectionUnresolvedComment('deliverables')"
            @edit="step => editSection(step, 'deliverables')"
          >
            <ReviewDeliverablesBlock
              :scope="deliverablesScopeText"
              :timing="deliverablesTimingText"
            />
            <template #comment>
              <SectionCommentBlock
                section-key="deliverables"
                :po-comment="getPoCommentForSection('deliverables')"
                :ceo-comment="isPoReturnedView ? getSectionCeoCommentValue('deliverables') : (ceoComments.deliverables ?? '')"
                :ceo-editable="reviewMode === 'ceo' && !ceoFrozenView"
                :show-resolve-ui="isPoReturnedView && !!getSectionCeoCommentValue('deliverables')"
                :ceo-resolved="isSectionCeoCommentResolved('deliverables')"
                :can-resolve="isPoOwner"
                :ceo-resolve-loading="store.isCeoCommentResolveLoading('deliverables')"
                @update:ceo-comment="value => handleCeoCommentBySection('deliverables', value)"
                @resolve="handleCeoCommentResolve('deliverables')"
                @unresolve="handleCeoCommentUnresolve('deliverables')"
              />
            </template>
          </ReviewSection>

          <ReviewSection
            title="Visual Components"
            :edit-step="isPoEditable ? 7 : undefined"
            :has-unresolved="hasSectionUnresolvedComment('visualComponents')"
            @edit="step => editSection(step, 'visualComponents')"
          >
            <ReviewVisualComponentsBlock :summary="visualComponentsSummary" />
            <template #comment>
              <SectionCommentBlock
                section-key="visualComponents"
                :po-comment="getPoCommentForSection('visualComponents')"
                :ceo-comment="isPoReturnedView ? getSectionCeoCommentValue('visualComponents') : (ceoComments.visualComponents ?? '')"
                :ceo-editable="reviewMode === 'ceo' && !ceoFrozenView"
                :show-resolve-ui="isPoReturnedView && !!getSectionCeoCommentValue('visualComponents')"
                :ceo-resolved="isSectionCeoCommentResolved('visualComponents')"
                :can-resolve="isPoOwner"
                :ceo-resolve-loading="store.isCeoCommentResolveLoading('visualComponents')"
                @update:ceo-comment="value => handleCeoCommentBySection('visualComponents', value)"
                @resolve="handleCeoCommentResolve('visualComponents')"
                @unresolve="handleCeoCommentUnresolve('visualComponents')"
              />
            </template>
          </ReviewSection>

          <!-- General CEO comment read-only for PO returned view (Figma 1973:7884) -->
          <div
            v-if="isPoReturnedView && getSectionCeoCommentValue('general')"
            class="space-y-3"
          >
            <div class="flex items-center gap-2">
              <span class="inline-flex size-5 shrink-0 text-[#5B5B62]" aria-hidden="true">
                <svg
                  class="size-5"
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
              </span>
              <span class="text-base font-medium text-foreground tracking-[-0.31px]">
                Загальний коментар CEO
              </span>
            </div>
            <div class="flex flex-col gap-1 rounded-lg bg-[rgba(217,217,217,0.2)] p-4">
              <p class="text-[14px] font-medium leading-4 tracking-[-0.1504px] text-[#5B5B62]">
                Коментар CEO
              </p>
              <p class="text-[16px] leading-6 tracking-[-0.1504px] text-[#3D3D3D] whitespace-pre-line">
                {{ getSectionCeoCommentValue('general') }}
              </p>
            </div>
          </div>

          <div v-if="reviewMode === 'ceo'" class="space-y-3">
            <div class="flex items-center gap-2">
              <span class="inline-flex size-5 shrink-0 text-[#5B5B62]" aria-hidden="true">
                <svg
                  class="size-5"
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
              </span>
              <span class="text-base font-medium text-foreground tracking-[-0.31px]">
                Загальний коментар
              </span>
            </div>
            <SectionCommentBlock
              section-key="general"
              always-expanded
              :ceo-comment="ceoComments.general ?? ''"
              :ceo-editable="true"
              :highlighted="!!revisionWarning"
              empty-label="Коментар CEO"
              placeholder="Додайте ваші коментарі або побажання…"
              @update:ceo-comment="handleGeneralCeoCommentUpdate"
            />
          </div>
        </div>

        <div
          v-if="saveError || statusActionError"
          class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm"
        >
          {{ statusActionError || saveError }}
        </div>

        <CeoActionsFooter
          v-if="reviewMode === 'ceo' && brandStatus === 'submitted'"
          :loading="statusActionLoading"
          :warning="revisionWarning"
          :show-approve="true"
          :show-revise="true"
          @approve="handleStatusChange('approved')"
          @revise="handleStatusChange('needs_revision')"
        />
        <PoActionsFooter
          v-else-if="!ceoFrozenView && reviewMode !== 'po-submitted'"
          :loading="statusActionLoading || isSaving"
          :submit-label="
            isPoReturnedView
              ? 'На погодження CEO'
              : hasNewBrief
                ? 'Відправити в роботу'
                : 'Відправити на розгляд'
          "
          :submit-disabled="submitBlocked"
          :show-submit="reviewMode !== 'approved'"
          :show-back="!isPoReturnedView && reviewMode !== 'approved'"
          :show-share="showShareButton"
          :show-pdf="showPdfButton"
          :share-copied="shareSuccess"
          :pdf-loading="isPdfLoading"
          @submit="handleStatusChange('submitted')"
          @back="backToStep(7)"
          @share="handleShare"
          @pdf="handlePrintBrand"
        />
      </div>
    </div>
  </div>

  <!-- Modal 1 (Figma 1985:4362): PO applies CEO external naming while concept mismatch -->
  <SimpleModal
    v-if="showApplyExternalBeforeConceptModal"
    title="Застосувати варіант CEO?"
    body="Ці назви прив'язані до іншого концепту. Разом із ними буде застосовано концепт обраний СЕО."
    cancel-label="Скасувати"
    primary-label="Застосувати все"
    :primary-loading="store.isApplyingCeoVariant"
    @cancel="showApplyExternalBeforeConceptModal = false"
    @primary="handleApplyAll"
  />

  <!-- Modal 2 (Figma 1985:4657): PO tries to edit external naming with concept mismatch -->
  <SimpleModal
    v-if="showEditExternalBeforeConceptModal"
    title="Потрібно обрати концепт"
    body="Щоб редагувати назви, спочатку оберіть концепт. Застосуйте варіант СЕО або оберіть інший."
    cancel-label="Скасувати"
    primary-label="Редагувати концепт"
    @cancel="showEditExternalBeforeConceptModal = false"
    @primary="handleGoToEditConcept"
  />
</template>
