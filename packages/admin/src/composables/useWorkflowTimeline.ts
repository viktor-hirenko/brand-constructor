import { ref, computed, watch, type MaybeRefOrGetter, toValue } from 'vue'
import type { BrandWorkflowEvent } from '@brand-constructor/shared'
import {
  BRAND_WORKFLOW_EVENT_TYPES as EVT,
  BRAND_WORKFLOW_EVENT_LABELS,
  BRIEF_SECTION_KEYS,
  BRIEF_SECTION_LABELS,
  ROLE_LABELS,
  parseSubmittedEventMeta,
  parseLegacySubmittedSnapshot,
  parseCeoFeedbackEventMeta,
  parsePoCommentResolvedEventMeta,
  parseWorkflowSelectionChanges,
  parseWorkflowSelectionFinals,
  type WorkflowPoCommentEntry,
  type WorkflowSelectionChange,
  type LegacySubmittedSnapshot,
} from '@brand-constructor/shared'
import { apiGet } from '@/composables/useApi'
import { countUk } from '@/utils/pluralUk'

export const COMMENT_LONG_THRESHOLD = 72
export const CEO_STEP_COLLAPSE_THRESHOLD = 5

export type TimelineRow =
  | { kind: 'event'; event: BrandWorkflowEvent }
  | { kind: 'ceo_group'; id: string; events: BrandWorkflowEvent[] }
  | { kind: 'po_resolve_group'; id: string; events: BrandWorkflowEvent[] }

export interface SectionBlock {
  label: string
  change?: { fromName: string | null; toName: string | null }
  finalName?: string
  /** A plain value, drawn like a «Submitted» selection (order events). */
  value?: string
  comment?: string
  poComment?: WorkflowPoCommentEntry
}

const EVENT_TONE: Record<string, string> = {
  [EVT.CREATED]: 'tone--gray',
  [EVT.SENT_TO_WORK]: 'tone--indigo',
  [EVT.SUBMITTED]: 'tone--blue',
  [EVT.CEO_FEEDBACK]: 'tone--amber',
  [EVT.APPROVED]: 'tone--green',
  [EVT.CEO_SELECTION_UPDATE]: 'tone--indigo',
  [EVT.PO_COMMENT_RESOLVED]: 'tone--gray',
  [EVT.RESUBMIT_CLEARED_CEO]: 'tone--blue',
  [EVT.SLACK_FAILED]: 'tone--amber',
  [EVT.ORDERS_READY]: 'tone--green',
  [EVT.ORDER_CANCELLED]: 'tone--gray',
}

const ORDER_KIND_SHORT: Record<string, string> = {
  concept: 'Concept',
  externalNaming: 'External Naming',
  internalNaming: 'Internal Naming',
}

function names(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v !== '') : []
}

/**
 * Order events (Orders page, phase 2a) open like «Submitted»: the summary
 * beside the badge, the details inside. The first version showed a bare
 * «Order ready (team)» badge (owner, 01.10).
 */
export function orderEventSummary(eventType: string, meta: Record<string, unknown>): string | null {
  if (eventType === EVT.ORDERS_READY) {
    const created = (meta.created ?? {}) as Record<string, unknown>
    const parts = [
      names(created.concepts).length ? countUk(names(created.concepts).length, 'концепт', 'концепти', 'концептів') : null,
      names(created.externalNamings).length ? countUk(names(created.externalNamings).length, 'назва', 'назви', 'назв') : null,
      names(created.internalNamings).length
        ? countUk(names(created.internalNamings).length, 'внутрішня назва', 'внутрішні назви', 'внутрішніх назв')
        : null,
    ].filter((p): p is string => p !== null)
    return parts.length > 0 ? parts.join(' · ') : null
  }
  if (eventType === EVT.ORDER_CANCELLED) {
    return typeof meta.kind === 'string' ? (ORDER_KIND_SHORT[meta.kind] ?? meta.kind) : null
  }
  return null
}

/** The blocks inside an order event: what the team made, or what the author picked instead. */
export function orderEventBlocks(eventType: string, meta: Record<string, unknown>): SectionBlock[] {
  if (eventType === EVT.ORDERS_READY) {
    const created = (meta.created ?? {}) as Record<string, unknown>
    return [
      { label: 'Concept', value: names(created.concepts).join(', ') },
      { label: 'External Naming', value: names(created.externalNamings).join(', ') },
      { label: 'Internal Naming', value: names(created.internalNamings).join(', ') },
    ].filter(b => b.value)
  }
  if (eventType === EVT.ORDER_CANCELLED && typeof meta.kind === 'string') {
    const picked = names(meta.picked)
    return [
      {
        label: ORDER_KIND_SHORT[meta.kind] ?? meta.kind,
        value: picked.length > 0 ? `Замість цього обрано з бібліотеки: ${picked.join(', ')}` : 'Замовлення скасовано',
      },
    ]
  }
  return []
}

const SLACK_CHANNEL_LABELS: Record<string, string> = {
  approvals: 'bc-approvals',
  strategy: 'bc-strategy',
  pr: 'bc-pr',
  design: 'bc-design',
}

/** «Slack message not delivered — bc-strategy (channel_not_found)». */
export function slackFailedTitle(base: string, meta: Record<string, unknown>): string {
  const kind = typeof meta.kind === 'string' ? (SLACK_CHANNEL_LABELS[meta.kind] ?? meta.kind) : null
  const error = typeof meta.error === 'string' && meta.error ? ` (${meta.error})` : ''
  return kind ? `${base} — ${kind}${error}` : `${base}${error}`
}

const SUBMITTED_SELECTION_FIELDS: { field: string; label: string }[] = [
  { field: BRIEF_SECTION_KEYS.CONCEPT, label: BRIEF_SECTION_LABELS.concept },
  { field: BRIEF_SECTION_KEYS.EXTERNAL_NAMING, label: BRIEF_SECTION_LABELS.externalNaming },
  { field: BRIEF_SECTION_KEYS.INTERNAL_NAMING, label: BRIEF_SECTION_LABELS.internalNaming },
  { field: BRIEF_SECTION_KEYS.MARKETING_PACKAGE, label: BRIEF_SECTION_LABELS.marketingPackage },
]

const SUBMITTED_COMMENT_ONLY_FIELDS: { field: string; label: string }[] = [
  { field: BRIEF_SECTION_KEYS.DELIVERABLES, label: BRIEF_SECTION_LABELS.deliverables },
  { field: BRIEF_SECTION_KEYS.VISUAL_COMPONENTS, label: BRIEF_SECTION_LABELS.visualComponents },
]

export function buildTimelineRows(raw: BrandWorkflowEvent[]): TimelineRow[] {
  const rows: TimelineRow[] = []
  let i = 0
  while (i < raw.length) {
    const e = raw[i]
    if (e.eventType === EVT.RESUBMIT_CLEARED_CEO) {
      i++
      continue
    }
    if (e.eventType === EVT.CEO_SELECTION_UPDATE) {
      const group: BrandWorkflowEvent[] = []
      while (i < raw.length && raw[i].eventType === EVT.CEO_SELECTION_UPDATE) {
        group.push(raw[i])
        i++
      }
      rows.push({ kind: 'ceo_group', id: `ceo-group-${group[0].id}`, events: group })
      continue
    }
    if (e.eventType === EVT.PO_COMMENT_RESOLVED) {
      const group: BrandWorkflowEvent[] = []
      while (i < raw.length && raw[i].eventType === EVT.PO_COMMENT_RESOLVED) {
        group.push(raw[i])
        i++
      }
      rows.push({
        kind: 'po_resolve_group',
        id: `po-resolve-group-${group[0].id}`,
        events: group,
      })
      continue
    }
    rows.push({ kind: 'event', event: e })
    i++
  }
  return rows
}

export function useWorkflowTimeline(brandId: MaybeRefOrGetter<string>) {
  const events = ref<BrandWorkflowEvent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const expandedIds = ref<Set<string>>(new Set())

  const timelineRows = computed(() => buildTimelineRows(events.value))

  function formatDateTime(dateStr: string): string {
    const d = new Date(dateStr)
    return d.toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function roleLabel(role: string): string {
    return ROLE_LABELS[role] ?? role
  }

  function eventTitle(event: BrandWorkflowEvent): string {
    const base = BRAND_WORKFLOW_EVENT_LABELS[event.eventType] ?? event.eventType
    const submitted = parseSubmittedEventMeta(event.meta)
    if (event.eventType === EVT.SUBMITTED && submitted) {
      return `${base} (#${submitted.submitCount})`
    }
    if (event.eventType === EVT.SLACK_FAILED) return slackFailedTitle(base, event.meta)
    return base
  }

  function eventTone(event: BrandWorkflowEvent): string {
    return EVENT_TONE[event.eventType] ?? 'tone--gray'
  }

  function submittedMeta(event: BrandWorkflowEvent) {
    if (event.eventType !== EVT.SUBMITTED) return null
    return parseSubmittedEventMeta(event.meta)
  }

  function isFirstSubmit(event: BrandWorkflowEvent): boolean {
    const meta = submittedMeta(event)
    return !meta || meta.submitCount <= 1
  }

  function submittedIsResubmit(event: BrandWorkflowEvent): boolean {
    return submittedMeta(event)?.isResubmit === true
  }

  function submittedDetailsGroupTitle(event: BrandWorkflowEvent): string {
    if (isFirstSubmit(event)) return 'Вибір PO'
    if (submittedIsResubmit(event)) return 'Зміни PO під час повторного надсилання'
    return 'Зміни PO'
  }

  function submittedLegacySnapshot(event: BrandWorkflowEvent): LegacySubmittedSnapshot | null {
    return parseLegacySubmittedSnapshot(event.meta.summary)
  }

  function buildSubmittedSectionBlocks(event: BrandWorkflowEvent): SectionBlock[] {
    const meta = submittedMeta(event)
    const legacy = submittedLegacySnapshot(event)
    const firstSubmit = isFirstSubmit(event)
    const changes = meta?.changes ?? []
    const poComments = meta?.poComments ?? []
    const changeByField = new Map(changes.map(c => [c.field, c]))
    const commentBySection = new Map(poComments.map(c => [c.section, c]))
    const blocks: SectionBlock[] = []

    for (const { field, label } of [...SUBMITTED_SELECTION_FIELDS, ...SUBMITTED_COMMENT_ONLY_FIELDS]) {
      const ch = changeByField.get(field)
      const pc = commentBySection.get(field)
      const snapVal = legacy?.[field as keyof LegacySubmittedSnapshot]
      const value = typeof snapVal === 'string' ? snapVal : null

      if (firstSubmit) {
        if (!pc && !value) continue
      } else if (!ch && !pc) {
        continue
      }

      const block: SectionBlock = { label: ch?.fieldLabel ?? pc?.sectionLabel ?? label }
      if (!firstSubmit && ch) {
        block.change = { fromName: ch.fromName, toName: ch.toName }
      } else {
        const displayValue = value ?? ch?.toName ?? null
        if (displayValue) block.finalName = displayValue
      }
      if (pc) block.poComment = pc
      blocks.push(block)
    }

    return blocks
  }

  function submittedHasDetails(event: BrandWorkflowEvent): boolean {
    if (event.eventType !== EVT.SUBMITTED) return false
    if (buildSubmittedSectionBlocks(event).length > 0) return true
    const legacy = submittedLegacySnapshot(event)
    return !!(legacy?.internalName || legacy?.geo)
  }

  function selectionChanges(event: BrandWorkflowEvent): WorkflowSelectionChange[] {
    if (event.eventType === EVT.CEO_FEEDBACK) {
      return parseCeoFeedbackEventMeta(event.meta).selections
    }
    if (event.eventType === EVT.CEO_SELECTION_UPDATE) {
      return parseWorkflowSelectionChanges(event.meta.selections)
    }
    if (event.eventType === EVT.APPROVED) return []
    return parseWorkflowSelectionChanges(event.meta.selections)
  }

  function buildSectionBlocks(event: BrandWorkflowEvent): SectionBlock[] {
    const orderBlocks = orderEventBlocks(event.eventType, event.meta)
    if (orderBlocks.length > 0) return orderBlocks
    const order: string[] = []
    const map = new Map<string, SectionBlock>()

    function ensure(label: string): SectionBlock {
      if (!map.has(label)) {
        map.set(label, { label })
        order.push(label)
      }
      return map.get(label)!
    }

    for (const sel of selectionChanges(event)) {
      const block = ensure(sel.fieldLabel)
      block.change = { fromName: sel.fromName, toName: sel.toName }
    }

    if (event.eventType === EVT.APPROVED) {
      for (const fin of parseWorkflowSelectionFinals(event.meta.selections)) {
        const block = ensure(fin.fieldLabel)
        block.finalName = fin.name
      }
    }

    if (event.eventType === EVT.CEO_FEEDBACK) {
      for (const c of parseCeoFeedbackEventMeta(event.meta).comments) {
        const block = ensure(c.sectionLabel)
        block.comment = c.excerpt
      }
    }

    return order
      .map(label => map.get(label)!)
      .filter(block => block.change || block.finalName || block.comment)
  }

  function hasDetails(event: BrandWorkflowEvent): boolean {
    if (buildSectionBlocks(event).length > 0) return true
    return submittedHasDetails(event)
  }

  function isLongComment(text: string): boolean {
    return text.trim().length > COMMENT_LONG_THRESHOLD
  }

  function poResolvedItem(event: BrandWorkflowEvent) {
    return parsePoCommentResolvedEventMeta(event.meta)
  }

  function poResolvedChronological(groupEvents: BrandWorkflowEvent[]): BrandWorkflowEvent[] {
    return [...groupEvents].reverse()
  }

  function poGroupTitle(count: number): string {
    return `Зауваження CEO опрацьовано (${countUk(count, 'розділ', 'розділи', 'розділів')})`
  }

  function poGroupSummary(groupEvents: BrandWorkflowEvent[]): string {
    const items = groupEvents.map(poResolvedItem)
    const reopened = items.filter(i => !i.resolved).length
    if (reopened === 0) return 'Усі розділи позначено вирішеними'
    if (reopened === items.length) return 'Розділи відкрито знову'
    return `вирішено: ${items.length - reopened} · відкрито знову: ${reopened}`
  }

  function poGroupSectionsPreview(groupEvents: BrandWorkflowEvent[]): string {
    return groupEvents.map(e => poResolvedItem(e).sectionLabel).join(' · ')
  }

  function timelineRowKey(row: TimelineRow): string {
    if (row.kind === 'ceo_group' || row.kind === 'po_resolve_group') return row.id
    return row.event.id
  }

  function timelineRowDotTone(row: TimelineRow): string {
    if (row.kind === 'ceo_group') return 'tone--indigo'
    if (row.kind === 'po_resolve_group') return 'tone--green'
    return eventTone(row.event)
  }

  function eventSummaryLine(event: BrandWorkflowEvent): string | null {
    const order = orderEventSummary(event.eventType, event.meta)
    if (order) return order
    if (event.eventType === EVT.SUBMITTED) {
      const meta = submittedMeta(event)
      const parts: string[] = []
      if (meta?.isResubmit) parts.push('Повторне надсилання')
      const ch = meta?.changes ?? []
      const pc = meta?.poComments ?? []
      if (ch.length && !isFirstSubmit(event)) {
        parts.push(countUk(ch.length, 'зміна', 'зміни', 'змін'))
      }
      if (pc.length) {
        parts.push(countUk(pc.length, 'коментар PO', 'коментарі PO', 'коментарів PO'))
      }
      return parts.length ? parts.join(' · ') : null
    }
    const changes = selectionChanges(event)
    const comments =
      event.eventType === EVT.CEO_FEEDBACK
        ? parseCeoFeedbackEventMeta(event.meta).comments
        : []
    const parts: string[] = []
    if (changes.length) {
      parts.push(countUk(changes.length, 'альтернатива', 'альтернативи', 'альтернатив'))
    }
    if (comments.length) {
      parts.push(countUk(comments.length, 'коментар', 'коментарі', 'коментарів'))
    }
    return parts.length ? parts.join(' · ') : null
  }

  function ceoEditsChronological(groupEvents: BrandWorkflowEvent[]): BrandWorkflowEvent[] {
    return [...groupEvents].reverse()
  }

  function isCompactEvent(event: BrandWorkflowEvent): boolean {
    return (
      event.eventType === EVT.CREATED ||
      event.eventType === EVT.RESUBMIT_CLEARED_CEO ||
      event.eventType === EVT.SENT_TO_WORK ||
      event.eventType === EVT.SLACK_FAILED
    )
  }

  function ceoGroupTitle(count: number): string {
    return `Правки CEO в альтернативах (${countUk(count, 'правка', 'правки', 'правок')})`
  }

  function ceoProgressStepLabel(stepIndex: number, total: number, event: BrandWorkflowEvent): string {
    const n = selectionChanges(event).length
    const fields = countUk(n, 'поле', 'поля', 'полів')
    return `Крок ${stepIndex} з ${total} · ${formatDateTime(event.createdAt)} · ${fields}`
  }

  function ceoGroupRange(groupEvents: BrandWorkflowEvent[]): string {
    if (groupEvents.length === 1) return formatDateTime(groupEvents[0].createdAt)
    const newest = groupEvents[0]
    const oldest = groupEvents[groupEvents.length - 1]
    return `${formatDateTime(oldest.createdAt)} – ${formatDateTime(newest.createdAt)}`
  }

  function ceoStepId(editId: string): string {
    return `ceo-step-${editId}`
  }

  function usesCollapsibleCeoSteps(editCount: number): boolean {
    return editCount >= CEO_STEP_COLLAPSE_THRESHOLD
  }

  function defaultCeoStepIds(groupEvents: BrandWorkflowEvent[]): string[] {
    if (!usesCollapsibleCeoSteps(groupEvents.length)) return []
    const chronological = ceoEditsChronological(groupEvents)
    const last = chronological[chronological.length - 1]
    return last ? [ceoStepId(last.id)] : []
  }

  function allCeoStepIds(groupEvents: BrandWorkflowEvent[]): string[] {
    if (!usesCollapsibleCeoSteps(groupEvents.length)) return []
    return groupEvents.map(e => ceoStepId(e.id))
  }

  function isCeoStepBodyVisible(groupEvents: BrandWorkflowEvent[], edit: BrandWorkflowEvent): boolean {
    if (!usesCollapsibleCeoSteps(groupEvents.length)) return true
    return expandedIds.value.has(ceoStepId(edit.id))
  }

  function seedCeoStepDefaults(next: Set<string>, groupEvents: BrandWorkflowEvent[]) {
    if (!usesCollapsibleCeoSteps(groupEvents.length)) return
    const hasAny = groupEvents.some(e => next.has(ceoStepId(e.id)))
    if (!hasAny) {
      for (const id of defaultCeoStepIds(groupEvents)) next.add(id)
    }
  }

  function collectExpandableIds(): string[] {
    const ids: string[] = []
    for (const row of buildTimelineRows(events.value)) {
      if (row.kind === 'ceo_group' || row.kind === 'po_resolve_group') ids.push(row.id)
      else if (hasDetails(row.event)) ids.push(row.event.id)
    }
    return ids
  }

  function buildExpandedIdSet(options: { allCeoSteps: boolean }): Set<string> {
    const ids = collectExpandableIds()
    for (const row of buildTimelineRows(events.value)) {
      if (row.kind !== 'ceo_group') continue
      if (options.allCeoSteps) ids.push(...allCeoStepIds(row.events))
      else ids.push(...defaultCeoStepIds(row.events))
    }
    return new Set(ids)
  }

  function setDefaultExpanded() {
    const expandable = collectExpandableIds()
    if (expandable.length !== 1) {
      expandedIds.value = new Set()
      return
    }
    const onlyId = expandable[0]
    const ids = [onlyId]
    for (const row of buildTimelineRows(events.value)) {
      if (row.kind === 'ceo_group' && row.id === onlyId) {
        ids.push(...defaultCeoStepIds(row.events))
        break
      }
    }
    expandedIds.value = new Set(ids)
  }

  function toggleExpanded(id: string) {
    const next = new Set(expandedIds.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
      const ceoRow = timelineRows.value.find(row => row.kind === 'ceo_group' && row.id === id)
      if (ceoRow?.kind === 'ceo_group') seedCeoStepDefaults(next, ceoRow.events)
    }
    expandedIds.value = next
  }

  function expandAll() {
    expandedIds.value = buildExpandedIdSet({ allCeoSteps: true })
  }

  function collapseAll() {
    expandedIds.value = new Set()
  }

  async function loadEvents() {
    const id = toValue(brandId)
    if (!id) return
    loading.value = true
    error.value = null
    try {
      events.value = await apiGet<BrandWorkflowEvent[]>(`/api/brands/${id}/workflow-events`)
      setDefaultExpanded()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не вдалося завантажити історію'
      events.value = []
    } finally {
      loading.value = false
    }
  }

  watch(
    () => toValue(brandId),
    id => {
      if (id) loadEvents()
    },
    { immediate: true }
  )

  return {
    EVT,
    events,
    loading,
    error,
    expandedIds,
    timelineRows,
    formatDateTime,
    roleLabel,
    eventTitle,
    eventTone,
    eventSummaryLine,
    timelineRowKey,
    timelineRowDotTone,
    toggleExpanded,
    expandAll,
    collapseAll,
    buildSubmittedSectionBlocks,
    submittedHasDetails,
    submittedDetailsGroupTitle,
    submittedIsResubmit,
    submittedLegacySnapshot,
    buildSectionBlocks,
    hasDetails,
    isLongComment,
    selectionChanges,
    poResolvedItem,
    poResolvedChronological,
    poGroupTitle,
    poGroupSummary,
    poGroupSectionsPreview,
    ceoEditsChronological,
    isCompactEvent,
    ceoGroupTitle,
    ceoProgressStepLabel,
    ceoGroupRange,
    usesCollapsibleCeoSteps,
    isCeoStepBodyVisible,
    ceoStepId,
  }
}
