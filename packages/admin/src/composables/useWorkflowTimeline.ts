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
  comment?: string
  poComment?: WorkflowPoCommentEntry
}

const EVENT_TONE: Record<string, string> = {
  [EVT.CREATED]: 'tone--gray',
  [EVT.SUBMITTED]: 'tone--blue',
  [EVT.CEO_FEEDBACK]: 'tone--amber',
  [EVT.APPROVED]: 'tone--green',
  [EVT.CEO_SELECTION_UPDATE]: 'tone--indigo',
  [EVT.PO_COMMENT_RESOLVED]: 'tone--gray',
  [EVT.RESUBMIT_CLEARED_CEO]: 'tone--blue',
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
    if (isFirstSubmit(event)) return 'PO selection'
    if (submittedIsResubmit(event)) return 'PO updates on resubmit'
    return 'PO updates'
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
    return count === 1
      ? 'PO resolved CEO feedback (1 section)'
      : `PO resolved CEO feedback (${count} sections)`
  }

  function poGroupSummary(groupEvents: BrandWorkflowEvent[]): string {
    const items = groupEvents.map(poResolvedItem)
    const reopened = items.filter(i => !i.resolved).length
    if (reopened === 0) return 'All sections marked resolved'
    if (reopened === items.length) return 'Sections reopened'
    return `${items.length - reopened} resolved · ${reopened} reopened`
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
    if (event.eventType === EVT.SUBMITTED) {
      const meta = submittedMeta(event)
      const parts: string[] = []
      if (meta?.isResubmit) parts.push('Resubmitted')
      const ch = meta?.changes ?? []
      const pc = meta?.poComments ?? []
      if (ch.length && !isFirstSubmit(event)) {
        parts.push(ch.length === 1 ? '1 change' : `${ch.length} changes`)
      }
      if (pc.length) {
        parts.push(pc.length === 1 ? '1 PO comment' : `${pc.length} PO comments`)
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
      parts.push(changes.length === 1 ? '1 alternative' : `${changes.length} alternatives`)
    }
    if (comments.length) {
      parts.push(comments.length === 1 ? '1 comment' : `${comments.length} comments`)
    }
    return parts.length ? parts.join(' · ') : null
  }

  function ceoEditsChronological(groupEvents: BrandWorkflowEvent[]): BrandWorkflowEvent[] {
    return [...groupEvents].reverse()
  }

  function isCompactEvent(event: BrandWorkflowEvent): boolean {
    return event.eventType === EVT.CREATED || event.eventType === EVT.RESUBMIT_CLEARED_CEO
  }

  function ceoGroupTitle(count: number): string {
    return count === 1
      ? 'CEO edited alternatives (1 edit)'
      : `CEO edited alternatives (${count} edits)`
  }

  function ceoProgressStepLabel(stepIndex: number, total: number, event: BrandWorkflowEvent): string {
    const n = selectionChanges(event).length
    const fields = n === 1 ? '1 field' : `${n} fields`
    return `Step ${stepIndex} of ${total} · ${formatDateTime(event.createdAt)} · ${fields}`
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
      error.value = err instanceof Error ? err.message : 'Failed to load history'
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
