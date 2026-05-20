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
import ReviewUnifiedView from '@/components/constructor/review/ReviewUnifiedView.vue'
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

/**
 * Per-section flags for `<ReviewUnifiedView>` — whether the section currently
 * shows the "needs choice" badge and the "Apply CEO" CTA (PO returned view
 * only, when the CEO picked a different library item and the PO has not yet
 * applied or overridden it).
 */
const sectionApplyFlags = computed(() => ({
  conceptNeedsChoice:
    isPoReturnedView.value &&
    isCeoChoiceAnAlternative('concept', store.brandCeoSelections?.concept ?? '') &&
    !isCeoConceptApplied.value,
  externalNamingNeedsChoice:
    isPoReturnedView.value &&
    isCeoChoiceAnAlternative(
      'externalNaming',
      store.brandCeoSelections?.externalNaming ?? ''
    ) &&
    !isCeoExternalApplied.value,
  internalNamingNeedsChoice:
    isPoReturnedView.value &&
    isCeoChoiceAnAlternative(
      'internalNaming',
      store.brandCeoSelections?.internalNaming ?? ''
    ) &&
    !isCeoInternalApplied.value,
}))

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
  <ReviewUnifiedView
    :review-mode="reviewMode"
    :is-po-returned-view="isPoReturnedView"
    :is-po-owner="isPoOwner"
    :ceo-frozen-view="ceoFrozenView"
    :has-new-brief="hasNewBrief"
    :attention-counter="attentionCounter"
    :submit-blocked="submitBlocked"
    :revision-warning="revisionWarning"
    :revision-missing-sections="revisionMissingSections"
    :is-ceo-concept-applied="isCeoConceptApplied"
    :is-ceo-external-applied="isCeoExternalApplied"
    :is-ceo-internal-applied="isCeoInternalApplied"
    :section-apply-flags="sectionApplyFlags"
    :review-ceo-concept-for-block="reviewCeoConceptForBlock"
    :ceo-external-items-for-review="ceoExternalItemsForReview"
    :ceo-internal-name-for-review="ceoInternalNameForReview"
    :ceo-comments="ceoComments"
    :apply-ceo-loading="store.isApplyingCeoVariant"
    :component-selection-details="componentSelectionDetails"
    :status-action-loading="statusActionLoading"
    :status-action-error="statusActionError"
    :save-error="saveError"
    :is-saving="isSaving"
    :is-pdf-loading="isPdfLoading"
    :share-success="shareSuccess"
    :show-share-button="showShareButton"
    :show-pdf-button="showPdfButton"
    :selected-concept="selectedConcept"
    :is-new-concept="isNewConcept"
    :selected-external-namings="selectedExternalNamings"
    :is-new-naming="isNewNaming"
    :selected-internal-naming="selectedInternalNaming"
    :internal-feedback="internalFeedback"
    :selected-package="selectedPackage"
    @status-change="handleStatusChange"
    @back="backToStep"
    @share="handleShare"
    @pdf="handlePrintBrand"
    @edit-section="({ step, sectionKey }) => editSection(step, sectionKey)"
    @start-ceo-reselect="startCeoReselectBySection"
    @apply-ceo-variant="handleApplyCeoVariant"
    @open-concept-preview="openConceptPreview"
    @open-pr-package-preview="handlePrPackagePreview"
    @update:ceo-comment="({ key, value }) => handleCeoCommentBySection(key, value)"
    @general-ceo-comment-update="handleGeneralCeoCommentUpdate"
    @resolve-ceo-comment="handleCeoCommentResolve"
    @unresolve-ceo-comment="handleCeoCommentUnresolve"
  />

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
