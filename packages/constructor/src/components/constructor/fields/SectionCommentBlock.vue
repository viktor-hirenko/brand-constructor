<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import SupervisorCommentCard from '@/components/constructor/review/SupervisorCommentCard.vue'
import PlusIcon from '@/components/icons/PlusIcon.vue'
import { isSectionCommentBlockVisible } from '@/utils/sectionCommentBlockVisibility'
import UiButton from '@/components/ui/UiButton.vue'
import UiComment from '@/components/ui/UiComment.vue'
import UiTextarea from '@/components/ui/UiTextarea.vue'

/**
 * Phase 11 put the CEO editor on the kit Input, Type = Area (`3424:2287`).
 *
 * This is the one place in the wizard that carries the kit's **inner Label** —
 * the `caption/l/medium` 14/16 caption that sits INSIDE the box, above the
 * value (`3436:4420`). Every other field hides it, exactly as all seven Input
 * instances on the drawn brief-order modal `5562:49171` do. This editor had
 * already drawn that exact shape by hand, at #5B5B62 on a
 * `rgba(197,197,200,0.2)` fill; it now takes `input/description` #6f6f7d on
 * `input/bg/default` #f3f3f5.
 *
 * The line caps moved from `constants/ceoCommentFieldVisual.ts` (deleted) to
 * `rows` / `max-rows` here, and the arithmetic to `computeTextareaAutosize` in
 * `uiField.ts`. Same numbers — a section comment caps at 5 lines, the general
 * comment starts at 6 and caps at 12 — but measured against the live
 * line-height instead of a hard-coded 24, which is what the embed scale needs.
 *
 * The amber highlight is validation, not a kit state: the kit's Input has no
 * Warning. It keeps its meaning and takes the kit's own `amber/border`
 * (#e9c162) in place of the hand-written #C97D00.
 *
 * ── The "+ Коментар CEO" affordance has a kit, measured 2026-09-24 ───────────
 * Row 9 of the divergences file said it had none. It does: the drawn CEO screen
 * `5387:83810` puts a `Button` under every Comment — `3760:2310`, full width,
 * 40 tall, `button/secondary/bg/default` #ffffff on `button/secondary/border`
 * #eaeaeb, `radius/button` 8, label `caption/l/medium` 14/16 in
 * `button/secondary/content/default` #393947, a 16 icon with `spacing/4` to it,
 * and 8 below the Comment above. That is `UiButton` Secondary M, so the dashed
 * 1px frame and the two hand-written #373737 are gone. The kit gives the button
 * no invalid state, so the validation highlight stays ours and borrows the same
 * `amber/border` the editor below it already uses.
 */
const CEO_SECTION_COMMENT_MAX_ROWS = 5

/**
 * The in-card CEO editor opens at the Comment's own 68 (label + one line), not
 * at the Area floor of 96: the written comment rests as a 68 `UiComment`, and
 * a 96 editor made the card jump 28 on every click. No drawing covers the
 * editing state; owner 30.09 chose «no jump». Longer text still grows the
 * field to five lines, then it scrolls. The `!` beats the Area's `min-h-24`.
 */
const CEO_SECTION_EDITOR_FLOOR_CLASS = 'min-h-0!'
const CEO_GENERAL_COMMENT_MIN_ROWS = 3
const CEO_GENERAL_COMMENT_MAX_ROWS = 12

/**
 * «Загальний коментар» opens at the kit's own Area floor, 96 — as drawn on
 * `5387:79023` (128 with the Title). It stood at 112 after the written
 * DP-15450 «CEO view 1» remark; the owner chose the drawing on 30.09.
 */

interface SectionCommentBlockProps {
  /** Section identifier from CEO_COMMENT_SECTIONS (concept, externalNaming, ...). */
  sectionKey: string
  /** Read-only Author comment from the corresponding step. */
  authorComment?: string
  /** Persisted Supervisor comment (single source of truth from store). */
  supervisorComment?: string
  /** Whether the Supervisor field can be edited (true for Supervisor in submitted/needs_revision). */
  supervisorEditable: boolean
  /** Highlight Supervisor field with amber border when validation requires comment. */
  highlighted?: boolean
  /** Optional override for the Supervisor empty-state CTA label. */
  emptyLabel?: string
  /** Optional placeholder for textarea. */
  placeholder?: string
  /** Debounce in ms for the autosave emit. Defaults to 600ms. */
  debounceMs?: number
  /** Always show textarea (e.g. general comment block) — no dashed CTA. */
  alwaysExpanded?: boolean
  /**
   * When true, the Supervisor comment is shown as SupervisorCommentCard with resolve UI.
   * Used in Author needs_revision view. Requires `supervisorResolved` and `canResolve`.
   */
  showResolveUi?: boolean
  /** Whether this Supervisor comment is marked as resolved by Author. */
  supervisorResolved?: boolean
  /** Whether the current user can resolve/unresolve (brand owner only). */
  canResolve?: boolean
  /** Whether a resolve/unresolve request is in flight for this section. */
  supervisorResolveLoading?: boolean
  /** Inline error when resolve/unresolve fails for this section. */
  supervisorResolveError?: string | null
}

const props = withDefaults(defineProps<SectionCommentBlockProps>(), {
  authorComment: '',
  supervisorComment: '',
  highlighted: false,
  emptyLabel: 'Коментар CEO',
  placeholder: 'Додайте ваші коментарі або побажання...',
  debounceMs: 600,
  alwaysExpanded: false,
  showResolveUi: false,
  supervisorResolved: false,
  canResolve: false,
  supervisorResolveLoading: false,
  supervisorResolveError: null,
})

const emit = defineEmits<{
  /** Fired (debounced) when Supervisor comment value changes. Empty string means cleared. */
  'update:supervisorComment': [value: string]
  /** Fired when PO clicks "Позначити як вирішений". */
  resolve: []
  /** Fired when PO clicks "Повернути" (unresolve). */
  unresolve: []
}>()

const draft = ref<string>(props.supervisorComment ?? '')
const isExpanded = ref<boolean>(props.alwaysExpanded || !!(props.supervisorComment ?? '').trim())
const textareaRef = ref<InstanceType<typeof UiTextarea> | null>(null)
/**
 * A written section comment rests as the kit Comment — the same box as
 * «Коментар замовника» above it (`5387:104592`: two Comments, 68 each, 8
 * apart). A click turns it back into the field; leaving the field shows the
 * Comment again. Owner 30.09.
 */
const isEditing = ref(false)
let flushTimer: ReturnType<typeof setTimeout> | null = null

const editorRows = computed(() => (props.alwaysExpanded ? CEO_GENERAL_COMMENT_MIN_ROWS : 1))
const editorMaxRows = computed(() =>
  props.alwaysExpanded ? CEO_GENERAL_COMMENT_MAX_ROWS : CEO_SECTION_COMMENT_MAX_ROWS
)

watch(
  () => props.supervisorComment,
  next => {
    const incoming = next ?? ''
    if (incoming !== draft.value) {
      draft.value = incoming
    }
    if (incoming.trim()) isExpanded.value = true
  }
)

watch(
  () => props.alwaysExpanded,
  v => {
    if (v) isExpanded.value = true
  },
  { immediate: true }
)

function scheduleEmit(value: string) {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushTimer = null
    if (value !== (props.supervisorComment ?? '')) {
      emit('update:supervisorComment', value)
    }
  }, props.debounceMs)
}

function flushNow() {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (draft.value !== (props.supervisorComment ?? '')) {
    emit('update:supervisorComment', draft.value)
  }
}

onBeforeUnmount(() => {
  flushNow()
})

function onInput(value: string) {
  draft.value = value
  scheduleEmit(value)
}

function onBlur() {
  flushNow()
  isEditing.value = false
  if (!props.alwaysExpanded && !draft.value.trim()) {
    isExpanded.value = false
  }
}

function openEditor() {
  isExpanded.value = true
  isEditing.value = true
  nextTick(() => {
    textareaRef.value?.focus()
  })
}

const hasAuthorComment = computed(() => (props.authorComment ?? '').trim().length > 0)
const hasSupervisorComment = computed(() => (draft.value ?? '').trim().length > 0)

const isVisible = computed(() =>
  isSectionCommentBlockVisible({
    authorComment: props.authorComment,
    supervisorComment: props.supervisorComment,
    supervisorEditable: props.supervisorEditable,
    showResolveUi: props.showResolveUi,
    alwaysExpanded: props.alwaysExpanded,
  })
)

defineExpose({ isVisible })
</script>

<template>
  <div
    v-if="isVisible"
    :class="[
      // The general comment sits under its own label, 8 below it (`5387:79023`
      // Title → Input field), so only the in-card blocks take the 16 above.
      alwaysExpanded ? 'section-comment flex flex-col gap-2' : 'section-comment mt-4 flex flex-col gap-2',
      highlighted ? 'section-comment--highlighted' : '',
      alwaysExpanded ? 'section-comment--always-expanded' : '',
    ]"
    :data-section="sectionKey"
  >
    <!-- Product Owner comment (read-only) — kit Comment, Type = Default -->
    <UiComment
      v-if="hasAuthorComment"
      class="section-comment__po"
      label="Коментар замовника"
      :value="authorComment"
    />

    <!-- CEO comment block -->
    <template v-if="supervisorEditable">
      <UiButton
        v-if="!alwaysExpanded && !isExpanded && !hasSupervisorComment"
        variant="secondary"
        size="M"
        :class="['section-comment__ceo-cta w-full', highlighted ? 'border-amber-border!' : '']"
        @click="openEditor"
      >
        <template #icon-left="{ iconClass }">
          <PlusIcon :class="iconClass" />
        </template>
        {{ emptyLabel }}
      </UiButton>

      <UiComment
        v-else-if="!alwaysExpanded && hasSupervisorComment && !isEditing"
        class="section-comment__ceo-comment cursor-text"
        label="Коментар CEO"
        :value="draft"
        role="button"
        tabindex="0"
        aria-label="Редагувати коментар CEO"
        @click="openEditor"
        @keydown.enter.prevent="openEditor"
      />

      <UiTextarea
        v-else
        ref="textareaRef"
        class="section-comment__ceo-editor"
        :class="[
          alwaysExpanded ? '' : CEO_SECTION_EDITOR_FLOOR_CLASS,
          highlighted && !hasSupervisorComment ? 'border-amber-border!' : '',
        ]"
        :model-value="draft"
        :label="alwaysExpanded ? '' : 'Коментар CEO'"
        :rows="editorRows"
        :max-rows="editorMaxRows"
        autosize
        :placeholder="placeholder"
        @update:model-value="onInput"
        @blur="onBlur"
      />
    </template>

    <!-- Read-only CEO comment with resolve UI (PO returned-from-CEO view) -->
    <template v-else-if="hasSupervisorComment && showResolveUi">
      <SupervisorCommentCard
        :value="supervisorComment ?? ''"
        :resolved="supervisorResolved"
        :loading="supervisorResolveLoading"
        :can-resolve="canResolve"
        @resolve="emit('resolve')"
        @unresolve="emit('unresolve')"
      />
      <p v-if="supervisorResolveError" class="section-comment__resolve-error text-sm text-red-600">
        {{ supervisorResolveError }}
      </p>
    </template>

    <!-- Read-only CEO comment without resolve UI (used outside the PO returned-from-CEO view) -->
    <UiComment
      v-else-if="hasSupervisorComment"
      class="section-comment__ceo-readonly"
      label="Коментар CEO"
      :value="supervisorComment"
    />
  </div>
</template>
