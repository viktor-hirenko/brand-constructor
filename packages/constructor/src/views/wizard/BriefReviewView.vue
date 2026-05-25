<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useAuthStore } from '@/stores/auth'
import { apiPatch, apiGet } from '@/composables/useApi'
import { useLibrariesStore } from '@/stores/libraries'
import { useReviewComponentSelections } from '@/composables/useReviewComponentSelections'
import { useSupervisorApplyVariants } from '@/composables/useSupervisorApplyVariants'
import { useSupervisorReviewComments } from '@/composables/useSupervisorReviewComments'
import { logSilent } from '@/utils/log'
import type {
  Concept,
  ExternalNaming,
  Brand,
} from '@brand-constructor/shared/types'
import {
  usePrintBrand,
  type PrintBrandData,
  type ComponentTypeInfo,
} from '@/composables/usePrintBrand'
import ReviewUnifiedView from '@/components/constructor/review/ReviewUnifiedView.vue'
import SimpleModal from '@/components/ui/SimpleModal.vue'
import {
  useBrandBriefReviewPhase,
  BRAND_BRIEF_REVIEW_PHASE,
} from '@/composables/useBrandBriefReviewPhase'

const router = useRouter()
const { downloadPdf } = usePrintBrand()
const store = useConstructorStore()
const authStore = useAuthStore()
const librariesStore = useLibrariesStore()

const concepts = computed(() => librariesStore.concepts)
const externalNamings = computed(() => librariesStore.externalNamings)
const internalNamings = computed(() => librariesStore.internalNamings)
const prPackages = computed(() => librariesStore.prPackages)

// ─── Role + mode flags ────────────────────────────────────────────────────

const isCeoView = computed(() => authStore.isCeo)
const brandStatus = computed(() => store.brandStatus ?? 'draft')

const { reviewPhase } = useBrandBriefReviewPhase()

/** True when PO is viewing a brief that was returned from CEO (needs_revision). */
const isPoReturnedView = computed(
  () => reviewPhase.value === BRAND_BRIEF_REVIEW_PHASE.AUTHOR_RETURNED
)

/** True if the current user is the brand owner (can resolve CEO comments). */
const isPoOwner = computed(() => !isCeoView.value && !!store.brandId)

/**
 * CEO viewing a brand that was already sent back to PO for revision.
 * Read-only frozen view — CEO already did their work, waits for PO to resubmit.
 * No editable comments, no footer actions.
 */
const ceoFrozenView = computed(
  () => isCeoView.value && brandStatus.value === 'needs_revision'
)

/**
 * Maps the current review phase to the string union expected by
 * `ReviewUnifiedView`'s `:review-mode` prop.
 */
const reviewMode = computed<
  'ceo' | 'po-draft' | 'po-returned' | 'po-submitted' | 'approved'
>(() => {
  switch (reviewPhase.value) {
    case BRAND_BRIEF_REVIEW_PHASE.SUPERVISOR_REVIEW: return 'ceo'
    case BRAND_BRIEF_REVIEW_PHASE.AUTHOR_RETURNED:   return 'po-returned'
    case BRAND_BRIEF_REVIEW_PHASE.AUTHOR_SUBMITTED:  return 'po-submitted'
    case BRAND_BRIEF_REVIEW_PHASE.APPROVED:          return 'approved'
    default:                                          return 'po-draft'
  }
})

// ─── CEO orchestration composables (explicit two-way wiring) ──────────────

const apply = useSupervisorApplyVariants({
  isPoReturnedView,
  concepts,
  externalNamings,
  internalNamings,
  router,
})

const comments = useSupervisorReviewComments({
  isPoReturnedView,
  isCeoChoiceAnAlternative: apply.isCeoChoiceAnAlternative,
})

// ─── Selected items (props for ReviewUnifiedView + PDF generator) ─────────

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
const isNewInternalNaming = computed(
  () => !selectedInternalNaming.value && !!internalFeedback.value?.trim()
)

const selectedPackage = computed(() => {
  const id = store.stepData.marketingPackage.selectedId
  return id ? (prPackages.value.find(p => p.id === id) ?? null) : null
})

const { componentSelectionDetails, loadComponentSelectionDetails } =
  useReviewComponentSelections()

// ─── Status / save state ──────────────────────────────────────────────────

const shareSuccess = ref(false)
const isSaving = computed(() => store.isSaving)
const saveError = computed(() => store.saveError)
const statusActionLoading = ref(false)
const statusActionError = ref<string | null>(null)
const isPdfLoading = ref(false)

const hasNewBrief = computed(() => {
  return (
    store.stepData?.concept?.newConceptBrief != null ||
    store.stepData?.externalNaming?.newNamingBrief != null ||
    store.stepData?.internalNaming?.newNamingFeedback != null
  )
})

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

// ─── Lifecycle ────────────────────────────────────────────────────────────

onMounted(() => {
  librariesStore.load(store.brandId)
  loadComponentSelectionDetails()
})

// ─── Section / navigation handlers ────────────────────────────────────────

function openConceptPreview(concept?: Concept | null) {
  const c = concept ?? selectedConcept.value
  if (!c) return
  store.openConceptPreview(c.id)
}

function startCeoReselectBySection(key: string) {
  const bid = store.brandId
  if (!bid) return
  if (key === 'concept') {
    store.seedSupervisorReselectFromBrand('concept')
    router.push(`/constructor/brand/${bid}/ceo-reselect/concept`)
  } else if (key === 'externalNaming') {
    store.seedSupervisorReselectFromBrand('externalNaming')
    router.push(`/constructor/brand/${bid}/ceo-reselect/external-naming`)
  } else if (key === 'internalNaming') {
    store.seedSupervisorReselectFromBrand('internalNaming')
    router.push(`/constructor/brand/${bid}/ceo-reselect/internal-naming`)
  }
}

/**
 * PO "Редагувати" from a review section — captures a snapshot so the user can
 * cancel changes and come back to the Final review with Скасувати / Зберегти.
 * Uses the section key (same as SectionCommentBlock) to locate the slice.
 */
function editSection(step: number, sectionKey: string) {
  const bid = store.brandId
  // In returned-from-CEO view, concept/external/internal use dedicated po-edit routes.
  if (isPoReturnedView.value && bid) {
    if (sectionKey === 'externalNaming') {
      if (apply.hasConceptMismatch.value) {
        apply.showEditExternalBeforeConceptModal.value = true
        return
      }
      const query = apply.isCeoExternalApplied.value ? { mode: 'post-apply' } : {}
      router.push({ path: `/constructor/brand/${bid}/po-edit/external-naming`, query })
      return
    }
    if (sectionKey === 'concept') {
      const query = apply.isCeoConceptApplied.value ? { mode: 'post-apply' } : {}
      router.push({ path: `/constructor/brand/${bid}/po-edit/concept`, query })
      return
    }
    if (sectionKey === 'internalNaming') {
      const query = apply.isCeoInternalApplied.value ? { mode: 'post-apply' } : {}
      router.push({ path: `/constructor/brand/${bid}/po-edit/internal-naming`, query })
      return
    }
  }
  store.beginEditSection(sectionKey, 8)
  // `editBrand` lets the router guard recognise an F5 on the wizard URL as
  // an interrupted brand-edit session (not a fresh wizard run) and redirect
  // back to the brand review page instead of dumping the user on step/1.
  router.push({ path: `/constructor/step/${step}`, query: { editBrand: bid ?? undefined } })
}

/** PO footer "Назад" — plain step navigation, no edit-mode marker. */
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
    logSilent('ReviewSubmit/copyShareUrl', err)
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

async function handleStatusChange(newStatus: 'submitted' | 'approved' | 'needs_revision') {
  if (newStatus === 'needs_revision') {
    const validation = comments.validateNeedsRevision()
    if (!validation.ok) {
      // Scroll only when CEO must add a comment in a specific section; for the
      // generic "no comments at all" case keep the viewport in place so the
      // warning under the button stays visible.
      if (validation.reason === 'missing-section') {
        const targetSection = comments.revisionMissingSections.value.values().next().value ?? null
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
    comments.revisionRequiresAnyComment.value = false
    comments.revisionMissingSections.value = new Set()
  }

  if (newStatus === 'submitted') {
    const saved = await store.saveBrand()
    if (!saved) return
  }

  statusActionLoading.value = true
  statusActionError.value = null

  try {
    const payload: Record<string, unknown> = { status: newStatus }
    if (isCeoView.value && Object.keys(comments.nonEmptyCeoComments.value).length > 0) {
      payload.ceoComments = comments.nonEmptyCeoComments.value
    }
    if (isCeoView.value) {
      const persisted = store.brandCeoSelections
      if (persisted && Object.keys(persisted).length > 0) {
        payload.ceoSelections = { ...persisted }
      }
    }
    await apiPatch<Brand>(`/api/brands/${store.brandId}/status`, payload)
    store.setBrandStatus(newStatus)

    // The Author has resubmitted their revision — any cached in-progress
    // overlay is now durably persisted on the server and the local
    // envelope must be dropped, otherwise reopening the brief in a future
    // `needs_revision` cycle would resurrect stale picks. Stale-protection
    // would eventually catch this via `briefStatus` mismatch, but explicit
    // is better.
    if (newStatus === 'submitted') {
      store.resetAuthorRevisionDraft()
    }

    // The Supervisor has dispatched the brief (approve / needs_revision) —
    // `brandCeoComments` was sent in the PATCH payload above and is now
    // durably persisted on the server. Drop the supervisor-comments envelope
    // so a subsequent F5 doesn't resurrect the same text on top of the
    // server-side snapshot.
    if (newStatus === 'needs_revision' || newStatus === 'approved') {
      store.purgeSupervisorCommentsCache()
    }

    if (
      newStatus === 'needs_revision' ||
      newStatus === 'approved' ||
      newStatus === 'submitted'
    ) {
      router.push('/constructor/success')
      return
    }
  } catch (err) {
    statusActionError.value = err instanceof Error ? err.message : 'Помилка зміни статусу'
  } finally {
    statusActionLoading.value = false
  }
}

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
        logSilent('ReviewSubmit/handlePrintBrand', err)
        componentTypes[typeId] = { typeName: 'Невідомий тип', variantName: 'Невідомий варіант' }
      }
    })
    await Promise.all(fetchPromises)

    const ceoSelectionsResolved: Record<string, string> = {}
    for (const key of (['concept', 'externalNaming', 'internalNaming'] as const)) {
      const v = store.brandCeoSelections?.[key]
      if (key === 'externalNaming') {
        const ids = apply.ceoSelectionAsArray(v)
        if (ids.length === 0) continue
        const names = ids
          .map(id => externalNamings.value.find(n => n.id === id)?.name ?? id)
          .filter((n): n is string => Boolean(n))
        if (names.length > 0) ceoSelectionsResolved[key] = names.join(', ')
      } else {
        const id = apply.ceoSelectionAsString(v)
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
      ceoComments: apply.flattenCeoCommentsForPdf(store.brandCeoComments),
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
    :attention-counter="apply.attentionCounter.value"
    :submit-blocked="apply.submitBlocked.value"
    :revision-warning="comments.revisionWarning.value"
    :revision-missing-sections="comments.revisionMissingSections.value"
    :is-ceo-concept-applied="apply.isCeoConceptApplied.value"
    :is-ceo-external-applied="apply.isCeoExternalApplied.value"
    :is-ceo-internal-applied="apply.isCeoInternalApplied.value"
    :section-apply-flags="apply.sectionApplyFlags.value"
    :review-ceo-concept-for-block="apply.reviewCeoConceptForBlock.value"
    :ceo-external-items-for-review="apply.ceoExternalItemsForReview.value"
    :ceo-internal-name-for-review="apply.ceoInternalNameForReview.value"
    :ceo-comments="comments.ceoComments"
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
    :is-new-internal-naming="isNewInternalNaming"
    :selected-package="selectedPackage"
    @status-change="handleStatusChange"
    @back="backToStep"
    @share="handleShare"
    @pdf="handlePrintBrand"
    @edit-section="({ step, sectionKey }) => editSection(step, sectionKey)"
    @start-ceo-reselect="startCeoReselectBySection"
    @apply-ceo-variant="apply.handleApplyCeoVariant"
    @open-concept-preview="openConceptPreview"
    @open-pr-package-preview="handlePrPackagePreview"
    @open-concept-brief="store.openBriefPreview('concept')"
    @open-external-naming-brief="store.openBriefPreview('externalNaming')"
    @open-internal-naming-brief="store.openBriefPreview('internalNaming')"
    @update:ceo-comment="({ key, value }) => comments.handleCeoCommentBySection(key, value)"
    @general-ceo-comment-update="comments.handleGeneralCeoCommentUpdate"
    @resolve-ceo-comment="comments.handleCeoCommentResolve"
    @unresolve-ceo-comment="comments.handleCeoCommentUnresolve"
  />

  <!-- Modal 1 (Figma 1985:4362): PO applies CEO external naming while concept mismatch -->
  <SimpleModal
    v-if="apply.showApplyExternalBeforeConceptModal.value"
    title="Застосувати варіант CEO?"
    body="Ці назви прив'язані до іншого концепту. Разом із ними буде застосовано концепт обраний СЕО."
    cancel-label="Скасувати"
    primary-label="Застосувати все"
    :primary-loading="store.isApplyingCeoVariant"
    @cancel="apply.showApplyExternalBeforeConceptModal.value = false"
    @primary="apply.handleApplyAll"
  />

  <!-- Modal 2 (Figma 1985:4657): PO tries to edit external naming with concept mismatch -->
  <SimpleModal
    v-if="apply.showEditExternalBeforeConceptModal.value"
    title="Потрібно обрати концепт"
    body="Щоб редагувати назви, спочатку оберіть концепт. Застосуйте варіант СЕО або оберіть інший."
    cancel-label="Скасувати"
    primary-label="Редагувати концепт"
    @cancel="apply.showEditExternalBeforeConceptModal.value = false"
    @primary="apply.handleGoToEditConcept"
  />
</template>
