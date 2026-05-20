<script setup lang="ts">
import { computed } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import type {
  Concept,
  ExternalNaming,
  InternalNaming,
  PrPackage,
} from '@brand-constructor/shared/types'
import type { ComponentSelectionDetails } from '@/composables/useReviewComponentSelections'
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

/**
 * Unified Brand Brief review screen.
 *
 * Renders the same shell for all five active review modes:
 *  - `ceo`           — CEO/admin on submitted or needs_revision
 *  - `po-draft`      — PO on a fresh draft (or CEO peeking at one)
 *  - `po-submitted`  — PO awaiting CEO review (read-only)
 *  - `po-returned`   — PO opening a brief returned by CEO for revision
 *  - `approved`      — terminal read-only view for any role
 *
 * Mode-specific header info, CEO/PO action footer, "Editing" / "Change choice"
 * affordances, and the General CEO comment block are switched in-template
 * based on `reviewMode` and `ceoFrozenView`.
 *
 * Presentation component: reads store for stepData / brand metadata, but
 * receives orchestration state (revision validation, applied-state per
 * section, CEO display items, action loading flags) via props and emits
 * high-level events back to the parent for routing / mutation.
 */

interface SectionApplyFlags {
  conceptNeedsChoice: boolean
  externalNamingNeedsChoice: boolean
  internalNamingNeedsChoice: boolean
}

interface ReviewUnifiedViewProps {
  // Mode + role state
  reviewMode: 'ceo' | 'po-draft' | 'po-returned' | 'po-submitted' | 'approved'
  isPoReturnedView: boolean
  isPoOwner: boolean
  ceoFrozenView: boolean
  hasNewBrief: boolean

  // Attention + revision state
  attentionCounter: number
  submitBlocked: boolean
  revisionWarning: string | null
  revisionMissingSections: ReadonlySet<string>

  // CEO applied-state per section (only meaningful in po-returned view)
  isCeoConceptApplied: boolean
  isCeoExternalApplied: boolean
  isCeoInternalApplied: boolean

  // CEO needs-choice flags per section
  sectionApplyFlags: SectionApplyFlags

  // CEO display items (precomputed in parent)
  reviewCeoConceptForBlock: Concept | null
  ceoExternalItemsForReview: Array<{ id: string; name: string; domain?: string }>
  ceoInternalNameForReview: string | null

  // CEO comments mirror (parent owns the reactive state)
  ceoComments: Readonly<Record<string, string>>

  // `store.isApplyingCeoVariant` proxy (kept as prop for testability)
  applyCeoLoading: boolean

  // Selections summary (used by visualComponentsSummary)
  componentSelectionDetails: ComponentSelectionDetails

  // Status / save UI state
  statusActionLoading: boolean
  statusActionError: string | null
  saveError: string | null
  isSaving: boolean
  isPdfLoading: boolean
  shareSuccess: boolean
  showShareButton: boolean
  showPdfButton: boolean

  // Selected items (parent-resolved against the libraries store)
  selectedConcept: Concept | null
  isNewConcept: boolean
  selectedExternalNamings: ExternalNaming[]
  isNewNaming: boolean
  selectedInternalNaming: InternalNaming | null
  internalFeedback: string | null
  selectedPackage: PrPackage | null
}

const props = defineProps<ReviewUnifiedViewProps>()

const emit = defineEmits<{
  'status-change': [newStatus: 'submitted' | 'approved' | 'needs_revision']
  back: [step: number]
  share: []
  pdf: []
  'edit-section': [payload: { step: number; sectionKey: string }]
  'start-ceo-reselect': [sectionKey: string]
  'apply-ceo-variant': [section: 'concept' | 'externalNaming' | 'internalNaming']
  'open-concept-preview': [concept: Concept | null]
  'open-pr-package-preview': []
  'update:ceo-comment': [payload: { key: string; value: string }]
  'general-ceo-comment-update': [value: string]
  'resolve-ceo-comment': [sectionKey: string]
  'unresolve-ceo-comment': [sectionKey: string]
}>()

const store = useConstructorStore()

// ─── Store-derived read helpers ─────────────────────────────────────────────

const basics = computed(() => store.stepData.brandBasics)
const mode = computed(() => store.stepData.mode)
const deliverables = computed(() => store.stepData.deliverables)
const visualComponents = computed(() => store.stepData.visualComponents)
const componentSelectionCount = computed(
  () => Object.keys(visualComponents.value.selections).length
)

const brandStatus = computed(() => store.brandStatus ?? 'draft')

function hasSectionUnresolvedComment(sectionKey: string): boolean {
  if (!props.isPoReturnedView) return false
  const meta = store.brandCeoComments?.[sectionKey]
  return !!meta && meta.value.trim().length > 0 && !meta.resolved
}

function isSectionCeoCommentResolved(sectionKey: string): boolean {
  return store.brandCeoComments?.[sectionKey]?.resolved ?? false
}

function getSectionCeoCommentValue(sectionKey: string): string {
  return store.brandCeoComments?.[sectionKey]?.value ?? ''
}

function isCeoCommentResolveLoading(sectionKey: string): boolean {
  return store.isCeoCommentResolveLoading(sectionKey)
}

function isSectionHighlighted(sectionKey: string): boolean {
  return props.revisionMissingSections.has(sectionKey)
}

// ─── Layout-specific computeds (only used inside this template) ─────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(date)
    .replace(/\s*р\.$/, '')
}

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
  if (props.reviewMode === 'po-draft') return poDraftInfoOverride
  if (props.reviewMode === 'po-submitted') {
    return {
      title: 'Бриф на розгляді',
      description: 'Бриф відправлено CEO на погодження. Очікуйте на відповідь.',
      iconVariant: 'check' as const,
    }
  }
  if (props.reviewMode === 'approved') {
    return {
      title: 'Бриф затверджено',
      description: 'Це фінальна версія брифу, погоджена СЕО.',
      iconVariant: 'check' as const,
    }
  }
  if (props.reviewMode === 'po-returned') {
    if (props.attentionCounter > 0) {
      return {
        title: `${props.attentionCounter} ${sectionWord(props.attentionCounter)} потребують уваги`,
        description:
          'Перегляньте коментарі та зміни від СЕО і оновіть бриф перед повторним відправленням.',
        iconVariant: 'warning' as const,
      }
    }
    // Counter reached 0 — explicitly hide the info block (null = no block)
    return null
  }
  if (props.ceoFrozenView) {
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
    props.selectedExternalNamings[0]?.name ||
    props.selectedConcept?.name ||
    'Новий бренд'
)

const unifiedReviewTitle = computed(() => {
  if (props.reviewMode === 'po-draft') return 'Final review'
  // po-returned + ceo both show brand name as header
  return brandHeaderTitle.value
})

const unifiedReviewSubtitle = computed(() =>
  props.reviewMode === 'po-draft' ? 'Перевірте всі дані перед відправкою' : undefined
)

/**
 * `Редагувати` button is available in PO draft AND PO returned-from-CEO views,
 * but NOT in CEO finalize, PO submitted or approved read-only view.
 */
const isPoEditable = computed(
  () =>
    props.reviewMode !== 'ceo' &&
    props.reviewMode !== 'po-submitted' &&
    props.reviewMode !== 'approved'
)

const externalNamingItems = computed(() =>
  props.selectedExternalNamings.map(n => ({
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
    .map(typeId => props.componentSelectionDetails[typeId]?.typeName ?? typeId)
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

function emitInlineCommentUpdate(key: string, value: string) {
  emit('update:ceo-comment', { key, value })
}

function emitEditSection(step: number, sectionKey: string) {
  emit('edit-section', { step, sectionKey })
}
</script>

<template>
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
            @edit="step => emitEditSection(step, 'basics')"
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
                :ceo-resolve-loading="isCeoCommentResolveLoading('basics')"
                @update:ceo-comment="value => emitInlineCommentUpdate('basics', value)"
                @resolve="emit('resolve-ceo-comment', 'basics')"
                @unresolve="emit('unresolve-ceo-comment', 'basics')"
              />
            </template>
          </ReviewSection>

          <ReviewSection
            title="Concept"
            :edit-step="isPoEditable ? 2 : undefined"
            :change-choice="reviewMode === 'ceo' && !ceoFrozenView"
            :has-unresolved="hasSectionUnresolvedComment('concept')"
            :needs-choice="sectionApplyFlags.conceptNeedsChoice"
            @edit="step => emitEditSection(step, 'concept')"
            @change="emit('start-ceo-reselect', 'concept')"
          >
            <ReviewConceptBlock
              :concept="selectedConcept"
              :ceo-concept="reviewCeoConceptForBlock"
              :mode="mode"
              :is-new-concept="isNewConcept"
              :show-apply-ceo="sectionApplyFlags.conceptNeedsChoice"
              :apply-loading="applyCeoLoading"
              :ceo-applied="isCeoConceptApplied"
              @preview="emit('open-concept-preview', $event)"
              @apply-ceo="emit('apply-ceo-variant', 'concept')"
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
                :ceo-resolve-loading="isCeoCommentResolveLoading('concept')"
                @update:ceo-comment="value => emitInlineCommentUpdate('concept', value)"
                @resolve="emit('resolve-ceo-comment', 'concept')"
                @unresolve="emit('unresolve-ceo-comment', 'concept')"
              />
            </template>
          </ReviewSection>

          <ReviewSection
            title="External Naming"
            :edit-step="isPoEditable ? 3 : undefined"
            :change-choice="reviewMode === 'ceo' && !ceoFrozenView"
            :has-unresolved="hasSectionUnresolvedComment('externalNaming')"
            :needs-choice="sectionApplyFlags.externalNamingNeedsChoice"
            @edit="step => emitEditSection(step, 'externalNaming')"
            @change="emit('start-ceo-reselect', 'externalNaming')"
          >
            <ReviewExternalNamingsList
              :items="externalNamingItems"
              :ceo-items="ceoExternalItemsForReview"
              :show-apply-ceo="sectionApplyFlags.externalNamingNeedsChoice"
              :apply-loading="applyCeoLoading"
              :ceo-applied="isCeoExternalApplied"
              @apply-ceo="emit('apply-ceo-variant', 'externalNaming')"
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
                :ceo-resolve-loading="isCeoCommentResolveLoading('externalNaming')"
                @update:ceo-comment="value => emitInlineCommentUpdate('externalNaming', value)"
                @resolve="emit('resolve-ceo-comment', 'externalNaming')"
                @unresolve="emit('unresolve-ceo-comment', 'externalNaming')"
              />
            </template>
          </ReviewSection>

          <ReviewSection
            title="Internal Naming"
            :edit-step="isPoEditable ? 4 : undefined"
            :change-choice="reviewMode === 'ceo' && !ceoFrozenView"
            :has-unresolved="hasSectionUnresolvedComment('internalNaming')"
            :needs-choice="sectionApplyFlags.internalNamingNeedsChoice"
            @edit="step => emitEditSection(step, 'internalNaming')"
            @change="emit('start-ceo-reselect', 'internalNaming')"
          >
            <ReviewInternalNamingBlock
              :po-value="selectedInternalNaming?.name || internalFeedback || 'Не обрано'"
              :ceo-name="ceoInternalNameForReview"
              :show-apply-ceo="sectionApplyFlags.internalNamingNeedsChoice"
              :apply-loading="applyCeoLoading"
              :ceo-applied="isCeoInternalApplied"
              @apply-ceo="emit('apply-ceo-variant', 'internalNaming')"
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
                :ceo-resolve-loading="isCeoCommentResolveLoading('internalNaming')"
                @update:ceo-comment="value => emitInlineCommentUpdate('internalNaming', value)"
                @resolve="emit('resolve-ceo-comment', 'internalNaming')"
                @unresolve="emit('unresolve-ceo-comment', 'internalNaming')"
              />
            </template>
          </ReviewSection>

          <ReviewSection
            title="PR Package"
            :edit-step="isPoEditable ? 5 : undefined"
            :has-unresolved="hasSectionUnresolvedComment('marketingPackage')"
            @edit="step => emitEditSection(step, 'marketingPackage')"
          >
            <ReviewPrPackageBlock
              :title="selectedPackage?.name ?? 'Не обрано'"
              @view="emit('open-pr-package-preview')"
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
                :ceo-resolve-loading="isCeoCommentResolveLoading('marketingPackage')"
                @update:ceo-comment="value => emitInlineCommentUpdate('marketingPackage', value)"
                @resolve="emit('resolve-ceo-comment', 'marketingPackage')"
                @unresolve="emit('unresolve-ceo-comment', 'marketingPackage')"
              />
            </template>
          </ReviewSection>

          <ReviewSection
            title="Deliverables"
            :edit-step="isPoEditable ? 6 : undefined"
            :has-unresolved="hasSectionUnresolvedComment('deliverables')"
            @edit="step => emitEditSection(step, 'deliverables')"
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
                :ceo-resolve-loading="isCeoCommentResolveLoading('deliverables')"
                @update:ceo-comment="value => emitInlineCommentUpdate('deliverables', value)"
                @resolve="emit('resolve-ceo-comment', 'deliverables')"
                @unresolve="emit('unresolve-ceo-comment', 'deliverables')"
              />
            </template>
          </ReviewSection>

          <ReviewSection
            title="Visual Components"
            :edit-step="isPoEditable ? 7 : undefined"
            :has-unresolved="hasSectionUnresolvedComment('visualComponents')"
            @edit="step => emitEditSection(step, 'visualComponents')"
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
                :ceo-resolve-loading="isCeoCommentResolveLoading('visualComponents')"
                @update:ceo-comment="value => emitInlineCommentUpdate('visualComponents', value)"
                @resolve="emit('resolve-ceo-comment', 'visualComponents')"
                @unresolve="emit('unresolve-ceo-comment', 'visualComponents')"
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
              @update:ceo-comment="value => emit('general-ceo-comment-update', value)"
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
          @approve="emit('status-change', 'approved')"
          @revise="emit('status-change', 'needs_revision')"
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
          @submit="emit('status-change', 'submitted')"
          @back="emit('back', 7)"
          @share="emit('share')"
          @pdf="emit('pdf')"
        />
      </div>
    </div>
  </div>
</template>
