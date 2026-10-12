<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { useLibrariesStore } from '@/stores/libraries'
import { inWorkHeaderInfo, isMadeForBrief, madeForBriefSummary } from '@/utils/madeForBrief'
import {
  authorSubmitLabel as submitLabelFor,
  authorSubmitTarget,
  isInWorkReadyForCeo,
  isSectionEditableInMode,
} from '@/utils/inWorkReview'
import type {
  Concept,
  ExternalNaming,
  InternalNaming,
  PrPackage,
} from '@brand-constructor/shared/types'
import type { ComponentSelectionDetails } from '@/composables/useReviewComponentSelections'
import SectionCommentBlock from '@/components/constructor/fields/SectionCommentBlock.vue'
import ReviewHeader from '@/components/constructor/review/ReviewHeader.vue'
import ReviewSection from '@/components/constructor/review/ReviewSection.vue'
import UiProperty from '@/components/ui/UiProperty.vue'
import UiTextarea from '@/components/ui/UiTextarea.vue'
import UiFieldLabel from '@/components/ui/UiFieldLabel.vue'
import ReviewConceptBlock from '@/components/constructor/review/ReviewConceptBlock.vue'
import ReviewExternalNamingsList from '@/components/constructor/review/ReviewExternalNamingsList.vue'
import ReviewInternalNamingBlock from '@/components/constructor/review/ReviewInternalNamingBlock.vue'
import ReviewPrPackageBlock from '@/components/constructor/review/ReviewPrPackageBlock.vue'
import ReviewDeliverablesBlock from '@/components/constructor/review/ReviewDeliverablesBlock.vue'
import ReviewVisualComponentsBlock from '@/components/constructor/review/ReviewVisualComponentsBlock.vue'
import SupervisorActionsFooter from '@/components/constructor/review/SupervisorActionsFooter.vue'
import AuthorActionsFooter from '@/components/constructor/review/AuthorActionsFooter.vue'
import {
  LEFT_PANE_SCROLL_GUTTER_CLASS,
  LEFT_PANE_SCROLL_INNER_CLASS,
  LEFT_PANE_SCROLL_TRACK_CLASS,
} from '@/components/constructor/layout/dualPaneLayoutClasses'
import ChatBubbleIcon from '@/components/icons/ChatBubbleIcon.vue'
import CalendarIcon from '@/components/icons/CalendarIcon.vue'
import GlobeIcon from '@/components/icons/GlobeIcon.vue'
import LinkIcon from '@/components/icons/LinkIcon.vue'
import { attentionBannerTitle } from '@/utils/attentionBannerTitle'
import { externalNamingReviewNote } from '@/utils/externalNamingPrice'

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
  reviewMode: 'ceo' | 'po-draft' | 'po-returned' | 'po-submitted' | 'po-in-work' | 'approved'
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
  ceoExternalItemsForReview: Array<{ id: string; name: string; domain?: string; note?: string | null }>
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
  isNewInternalNaming: boolean
  selectedPackage: PrPackage | null
}

const props = defineProps<ReviewUnifiedViewProps>()

/**
 * The error line sits under the last button of the stack, which can be below
 * the fold on a long review — bring it into view when it appears.
 */
const actionErrorEl = ref<HTMLElement | null>(null)
watch(
  () => props.statusActionError || props.saveError,
  async message => {
    if (!message) return
    await nextTick()
    actionErrorEl.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
)

const emit = defineEmits<{
  'status-change': [newStatus: 'in_work' | 'submitted' | 'approved' | 'needs_revision']
  back: [step: number]
  share: []
  pdf: []
  'edit-section': [payload: { step: number; sectionKey: string }]
  'start-ceo-reselect': [sectionKey: string]
  'apply-ceo-variant': [section: 'concept' | 'externalNaming' | 'internalNaming']
  'open-concept-preview': [concept: Concept | null]
  'open-pr-package-preview': []
  'open-concept-brief': []
  'open-external-naming-brief': []
  'open-internal-naming-brief': []
  'update:ceo-comment': [payload: { key: string; value: string }]
  'general-ceo-comment-update': [value: string]
  'resolve-ceo-comment': [sectionKey: string]
  'unresolve-ceo-comment': [sectionKey: string]
}>()

const store = useConstructorStore()
const librariesStore = useLibrariesStore()

/** What the teams made for this brief — named in the «Замовлення виконано» block. */
const madeSummary = computed(() => {
  const mine = <T extends { id: string; for_brand_id?: string | null }>(items: readonly T[]) =>
    items.filter(i => isMadeForBrief(i, store.brandId))
  return madeForBriefSummary({
    concepts: mine(librariesStore.concepts),
    externalNamings: mine(librariesStore.externalNamings),
    internalNamings: mine(librariesStore.internalNamings),
  })
})

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

function getCeoResolveError(sectionKey: string): string | null {
  if (store.saveCeoCommentResolvedErrorSection !== sectionKey) return null
  return store.saveCeoCommentResolvedError
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

/**
 * Read off the render of `5387:91772`, not off the layer name — the description
 * node is still *named* after the sentence it carried before the redraw.
 */
const poDraftInfoOverride = {
  title: 'Бриф готовий',
  description: 'Ви можете повернутись та змінити будь-який розділ перед відправкою.',
  iconVariant: 'check' as const,
} as const

/**
 * ReviewHeader info-block override — varies by reviewMode:
 *  - po-draft     → "Бриф готовий" (check icon) — Figma 5387:91772
 *  - po-returned  → "N секцій потребують уваги" (warning icon), no drawn screen
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
  if (props.reviewMode === 'po-in-work') {
    return inWorkHeaderInfo(store.brandOrdersReadyAt, madeSummary.value, !inWorkNotReady.value)
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
        title: attentionBannerTitle(props.attentionCounter),
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
  props.reviewMode === 'po-draft' ? 'Перевірте всі дані перед відправкою.' : undefined
)

/**
 * `Редагувати` is available in PO draft, PO returned-from-CEO and PO in-work
 * views, never in CEO finalize, PO submitted or approved read-only view. In a
 * brief «В роботі» the teams already have its data, so the author may only swap
 * what was ordered — Concept, External and Internal Naming — for library picks.
 */
function sectionEditStep(sectionKey: string, step: number): number | undefined {
  return isSectionEditableInMode(props.reviewMode, sectionKey, {
    conceptOrdered: props.isNewConcept,
  })
    ? step
    : undefined
}

/**
 * «На погодження CEO» from a brief in work waits until nothing is on order and
 * the brief is whole — the server refuses anything else (H-01, H-02).
 */
const inWorkNotReady = computed(
  () =>
    props.reviewMode === 'po-in-work' &&
    !isInWorkReadyForCeo({
      hasNewBrief: props.hasNewBrief,
      hasConcept: !!props.selectedConcept,
      externalCount: props.selectedExternalNamings.length,
      hasInternal: !!props.selectedInternalNaming,
    })
)

const authorSubmitLabel = computed(() => submitLabelFor(props.reviewMode, props.hasNewBrief))

/**
 * A draft or a brief back from the CEO with an order goes to the teams
 * (`in_work`); everything else to the CEO.
 */
const submitTarget = computed(() => authorSubmitTarget(props.reviewMode, props.hasNewBrief))

const externalNamingItems = computed(() =>
  props.selectedExternalNamings.map(n => ({
    id: n.id,
    name: n.name,
    domain: (n as ExternalNaming & { domain?: string }).domain,
    note: externalNamingReviewNote(n),
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

function getAuthorCommentForSection(key: string): string {
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

type SectionCommentKey =
  | 'basics'
  | 'concept'
  | 'externalNaming'
  | 'internalNaming'
  | 'marketingPackage'
  | 'deliverables'
  | 'visualComponents'

function sectionCommentBindings(sectionKey: SectionCommentKey) {
  return {
    sectionKey,
    authorComment: getAuthorCommentForSection(sectionKey),
    supervisorComment: props.isPoReturnedView
      ? getSectionCeoCommentValue(sectionKey)
      : (props.ceoComments[sectionKey] ?? ''),
    supervisorEditable: props.reviewMode === 'ceo' && !props.ceoFrozenView,
    highlighted: props.reviewMode === 'ceo' && isSectionHighlighted(sectionKey),
    showResolveUi: props.isPoReturnedView && !!getSectionCeoCommentValue(sectionKey),
    supervisorResolved: isSectionCeoCommentResolved(sectionKey),
    canResolve: props.isPoOwner,
    supervisorResolveLoading: isCeoCommentResolveLoading(sectionKey),
    supervisorResolveError: getCeoResolveError(sectionKey),
  }
}

const scrollContainerRef = ref<HTMLElement | null>(null)

function getScrollTop(): number {
  return scrollContainerRef.value?.scrollTop ?? 0
}

function setScrollTop(value: number): void {
  if (scrollContainerRef.value) {
    scrollContainerRef.value.scrollTop = Math.max(0, value)
  }
}

defineExpose({
  getScrollTop,
  setScrollTop,
})
</script>

<template>
  <div
    :class="[
      'review-unified-view flex flex-col flex-1 min-h-0 h-full',
      `review-unified-view--mode-${reviewMode}`,
      ceoFrozenView ? 'review-unified-view--ceo-frozen' : '',
    ]"
  >
    <div
      ref="scrollContainerRef"
      :class="[
        'review-unified-view__scroll flex-1 min-h-0 overflow-y-auto',
        LEFT_PANE_SCROLL_TRACK_CLASS,
        LEFT_PANE_SCROLL_GUTTER_CLASS,
      ]"
    >
      <!--
        24 between the step header, the card list, the general comment and the
        footer. Phase 18 set 32 here off `4492:16845` — the old canvas. Both
        step-8 screens of the current one say 24: on `5387:91764` the header
        ends at 192 and the list opens at 216, on `5387:83810` the header ends
        at 160 and the list opens at 184, the list ends at 2583.5 with the Input
        at 2607.5, and the Input ends at 2735.5 with the Navigation bar at
        2759.5. Cards stay 16 apart (`space-y-4`), which both canvases agree on.
      -->
      <div
        :class="[
          'review-unified-view__scroll-inner flex flex-col gap-6 pt-8 pb-8',
          LEFT_PANE_SCROLL_INNER_CLASS,
        ]"
      >
        <ReviewHeader
          :title="unifiedReviewTitle"
          :status="brandStatus"
          :subtitle="unifiedReviewSubtitle"
          :info-override="reviewHeaderInfoOverride"
        />

        <div class="review-unified-view__sections space-y-4">
          <ReviewSection
            title="Brand Basics"
            :edit-step="sectionEditStep('basics', 1)"
            :has-unresolved="hasSectionUnresolvedComment('basics')"
            @edit="step => emitEditSection(step, 'basics')"
          >
            <UiProperty
              v-if="basics.geo.length > 0"
              label="Географія"
              :value="basics.geo.join(', ')"
            >
              <template #icon="{ iconClass }">
                <GlobeIcon :class="iconClass" />
              </template>
            </UiProperty>
            <UiProperty
              v-if="basics.launchDate"
              label="Дата запуску"
              :value="formatDate(basics.launchDate)"
            >
              <template #icon="{ iconClass }">
                <CalendarIcon :class="iconClass" />
              </template>
            </UiProperty>
            <UiProperty
              v-if="basics.linkedProduct"
              label="Звʼязок з іншим продуктом"
              :value="basics.linkedProduct"
            >
              <template #icon="{ iconClass }">
                <LinkIcon :class="iconClass" />
              </template>
            </UiProperty>
            <template #comment>
              <SectionCommentBlock
                v-bind="sectionCommentBindings('basics')"
                @update:supervisor-comment="value => emitInlineCommentUpdate('basics', value)"
                @resolve="emit('resolve-ceo-comment', 'basics')"
                @unresolve="emit('unresolve-ceo-comment', 'basics')"
              />
            </template>
          </ReviewSection>

          <ReviewSection
            title="Concept"
            :edit-step="sectionEditStep('concept', 2)"
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
              @preview-brief="emit('open-concept-brief')"
            />
            <template #comment>
              <SectionCommentBlock
                v-bind="sectionCommentBindings('concept')"
                @update:supervisor-comment="value => emitInlineCommentUpdate('concept', value)"
                @resolve="emit('resolve-ceo-comment', 'concept')"
                @unresolve="emit('unresolve-ceo-comment', 'concept')"
              />
            </template>
          </ReviewSection>

          <ReviewSection
            title="External Naming"
            :edit-step="sectionEditStep('externalNaming', 3)"
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
              :is-new-brief="isNewNaming"
              @apply-ceo="emit('apply-ceo-variant', 'externalNaming')"
              @preview-brief="emit('open-external-naming-brief')"
            />
            <template #comment>
              <SectionCommentBlock
                v-bind="sectionCommentBindings('externalNaming')"
                @update:supervisor-comment="value => emitInlineCommentUpdate('externalNaming', value)"
                @resolve="emit('resolve-ceo-comment', 'externalNaming')"
                @unresolve="emit('unresolve-ceo-comment', 'externalNaming')"
              />
            </template>
          </ReviewSection>

          <ReviewSection
            title="Internal Naming"
            :edit-step="sectionEditStep('internalNaming', 4)"
            :change-choice="reviewMode === 'ceo' && !ceoFrozenView"
            :has-unresolved="hasSectionUnresolvedComment('internalNaming')"
            :needs-choice="sectionApplyFlags.internalNamingNeedsChoice"
            @edit="step => emitEditSection(step, 'internalNaming')"
            @change="emit('start-ceo-reselect', 'internalNaming')"
          >
            <ReviewInternalNamingBlock
              :po-value="selectedInternalNaming?.name || 'Не обрано'"
              :ceo-name="ceoInternalNameForReview"
              :show-apply-ceo="sectionApplyFlags.internalNamingNeedsChoice"
              :apply-loading="applyCeoLoading"
              :ceo-applied="isCeoInternalApplied"
              :is-new-brief="isNewInternalNaming"
              @apply-ceo="emit('apply-ceo-variant', 'internalNaming')"
              @preview-brief="emit('open-internal-naming-brief')"
            />
            <template #comment>
              <SectionCommentBlock
                v-bind="sectionCommentBindings('internalNaming')"
                @update:supervisor-comment="value => emitInlineCommentUpdate('internalNaming', value)"
                @resolve="emit('resolve-ceo-comment', 'internalNaming')"
                @unresolve="emit('unresolve-ceo-comment', 'internalNaming')"
              />
            </template>
          </ReviewSection>

          <ReviewSection
            title="PR Package"
            :edit-step="sectionEditStep('marketingPackage', 5)"
            :has-unresolved="hasSectionUnresolvedComment('marketingPackage')"
            @edit="step => emitEditSection(step, 'marketingPackage')"
          >
            <ReviewPrPackageBlock
              :title="selectedPackage?.name ?? 'Не обрано'"
              @view="emit('open-pr-package-preview')"
            />
            <template #comment>
              <SectionCommentBlock
                v-bind="sectionCommentBindings('marketingPackage')"
                @update:supervisor-comment="value => emitInlineCommentUpdate('marketingPackage', value)"
                @resolve="emit('resolve-ceo-comment', 'marketingPackage')"
                @unresolve="emit('unresolve-ceo-comment', 'marketingPackage')"
              />
            </template>
          </ReviewSection>

          <ReviewSection
            title="Deliverables"
            :edit-step="sectionEditStep('deliverables', 6)"
            :has-unresolved="hasSectionUnresolvedComment('deliverables')"
            @edit="step => emitEditSection(step, 'deliverables')"
          >
            <ReviewDeliverablesBlock
              :scope="deliverablesScopeText"
              :timing="deliverablesTimingText"
            />
            <template #comment>
              <SectionCommentBlock
                v-bind="sectionCommentBindings('deliverables')"
                @update:supervisor-comment="value => emitInlineCommentUpdate('deliverables', value)"
                @resolve="emit('resolve-ceo-comment', 'deliverables')"
                @unresolve="emit('unresolve-ceo-comment', 'deliverables')"
              />
            </template>
          </ReviewSection>

          <ReviewSection
            title="Interface Components"
            :edit-step="sectionEditStep('visualComponents', 7)"
            :has-unresolved="hasSectionUnresolvedComment('visualComponents')"
            @edit="step => emitEditSection(step, 'visualComponents')"
          >
            <ReviewVisualComponentsBlock :summary="visualComponentsSummary" />
            <template #comment>
              <SectionCommentBlock
                v-bind="sectionCommentBindings('visualComponents')"
                @update:supervisor-comment="value => emitInlineCommentUpdate('visualComponents', value)"
                @resolve="emit('resolve-ceo-comment', 'visualComponents')"
                @unresolve="emit('unresolve-ceo-comment', 'visualComponents')"
              />
            </template>
          </ReviewSection>
        </div>

        <!--
          The general comment is the kit's own Input under the card list, not a
          card in it: `4492:16847` ends at 2588 and `4492:17415` opens at 2620,
          i.e. 32 below — the same 32 the list keeps from the step header and
          the footer keeps from the comment. It used to live inside the list
          and inherit its 16 (DP-15258 phase 18).
        -->
        <!-- General CEO comment read-only for PO returned view (Figma 1973:7884) -->
        <div
          v-if="isPoReturnedView && getSectionCeoCommentValue('general')"
          class="review-unified-view__general-comment-po flex flex-col gap-2"
        >
          <UiFieldLabel>
            <template #icon="{ iconClass }"><ChatBubbleIcon :class="iconClass" /></template>
            Загальний коментар CEO
          </UiFieldLabel>
          <!--
            The caption stays OUTSIDE the box here, unlike every other comment
            in review: it has to match the CEO's own editor a few lines below,
            whose caption is the kit's Title (`3424:1050`) above an Input, not
            the Comment's inner label. The box is that Input too — Area, 96,
            #f3f3f5 with its border, read-only (`5387:105225`, owner 30.09);
            it was a Comment box 48 tall.
          -->
          <UiTextarea
            class="review-unified-view__general-comment-po-value"
            :model-value="getSectionCeoCommentValue('general')"
            :rows="3"
            :max-rows="12"
            autosize
            readonly
          />
        </div>

        <div
          v-if="reviewMode === 'ceo'"
          class="review-unified-view__general-comment-ceo flex flex-col gap-2"
        >
          <UiFieldLabel>
            <template #icon="{ iconClass }"><ChatBubbleIcon :class="iconClass" /></template>
            Загальний коментар
          </UiFieldLabel>
          <SectionCommentBlock
            section-key="general"
            always-expanded
            :supervisor-comment="ceoComments.general ?? ''"
            :supervisor-editable="true"
            :highlighted="!!revisionWarning"
            empty-label="Коментар CEO"
            placeholder="Додайте ваші коментарі або побажання..."
            @update:supervisor-comment="value => emit('general-ceo-comment-update', value)"
          />
        </div>

        <SupervisorActionsFooter
          v-if="reviewMode === 'ceo' && brandStatus === 'submitted'"
          :loading="statusActionLoading"
          :warning="revisionWarning"
          :show-approve="true"
          :show-revise="true"
          @approve="emit('status-change', 'approved')"
          @revise="emit('status-change', 'needs_revision')"
        />
        <AuthorActionsFooter
          v-else-if="!ceoFrozenView && reviewMode !== 'po-submitted'"
          :loading="statusActionLoading || isSaving"
          :submit-label="authorSubmitLabel"
          :submit-disabled="submitBlocked || inWorkNotReady"
          :submit-hint="inWorkNotReady ? 'Оберіть замовлене з бібліотеки' : null"
          :show-submit="reviewMode !== 'approved'"
          :show-back="!isPoReturnedView && reviewMode !== 'approved' && reviewMode !== 'po-in-work'"
          :show-share="showShareButton"
          :show-pdf="showPdfButton"
          :share-copied="shareSuccess"
          :pdf-loading="isPdfLoading"
          @submit="emit('status-change', submitTarget)"
          @back="emit('back', 7)"
          @share="emit('share')"
          @pdf="emit('pdf')"
        />

        <!-- Under the buttons, as on every step (kit note `4378:16948`); it
             used to be a pink box above them, a shape the kit does not have. -->
        <p
          v-if="saveError || statusActionError"
          ref="actionErrorEl"
          class="review-unified-view__error text-center text-sm text-red-600"
          role="alert"
        >
          {{ statusActionError || saveError }}
        </p>
      </div>
    </div>
  </div>
</template>
