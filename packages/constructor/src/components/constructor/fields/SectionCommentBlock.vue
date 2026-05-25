<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import SupervisorCommentCard from '@/components/constructor/review/SupervisorCommentCard.vue'
import PlusIcon from '@/components/icons/PlusIcon.vue'

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
  placeholder: 'Додайте ваші коментарі або побажання…',
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
const textareaRef = ref<HTMLTextAreaElement | null>(null)
let flushTimer: ReturnType<typeof setTimeout> | null = null

function autosize() {
  const ta = textareaRef.value
  if (!ta) return
  ta.style.height = 'auto'
  ta.style.height = `${ta.scrollHeight}px`
}

watch(
  () => props.supervisorComment,
  next => {
    const incoming = next ?? ''
    if (incoming !== draft.value) {
      draft.value = incoming
      nextTick(autosize)
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

watch(isExpanded, expanded => {
  if (expanded) nextTick(autosize)
})

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

onMounted(() => {
  if (isExpanded.value) nextTick(autosize)
})

onBeforeUnmount(() => {
  flushNow()
})

function onInput(e: Event) {
  const value = (e.target as HTMLTextAreaElement).value
  draft.value = value
  scheduleEmit(value)
  autosize()
}

function onBlur() {
  flushNow()
  if (!props.alwaysExpanded && !draft.value.trim()) {
    isExpanded.value = false
  }
}

function openEditor() {
  isExpanded.value = true
  nextTick(() => {
    textareaRef.value?.focus()
    autosize()
  })
}

const hasAuthorComment = computed(() => (props.authorComment ?? '').trim().length > 0)
const hasSupervisorComment = computed(() => (draft.value ?? '').trim().length > 0)
</script>

<template>
  <div
    :class="[
      'section-comment flex flex-col gap-2',
      highlighted ? 'section-comment--highlighted' : '',
      alwaysExpanded ? 'section-comment--always-expanded' : '',
    ]"
    :data-section="sectionKey"
  >
    <!-- Product Owner comment (read-only) -->
    <div
      v-if="hasAuthorComment"
      class="section-comment__po flex flex-col gap-1 rounded-lg bg-[rgba(217,217,217,0.2)] p-4"
    >
      <p class="text-[14px] font-medium leading-4 tracking-[-0.1504px] text-[#5B5B62]">
        Коментар замовника
      </p>
      <p class="text-[16px] leading-6 tracking-[-0.1504px] text-[#3D3D3D] whitespace-pre-line">
        {{ authorComment }}
      </p>
    </div>

    <!-- CEO comment block -->
    <template v-if="supervisorEditable">
      <button
        v-if="!alwaysExpanded && !isExpanded && !hasSupervisorComment"
        type="button"
        :class="[
          'section-comment__ceo-cta w-full inline-flex items-center justify-center gap-1 rounded-lg border border-dashed p-3 transition-colors',
          highlighted
            ? 'border-[#C97D00] hover:bg-black/[0.02]'
            : 'border-[rgba(0,0,0,0.2)] hover:bg-black/[0.02]',
        ]"
        @click="openEditor"
      >
        <PlusIcon class="size-4 shrink-0 text-[#373737]" />
        <span class="text-[14px] font-medium leading-4 tracking-[-0.3125px] text-[#373737]">
          {{ emptyLabel }}
        </span>
      </button>

      <label
        v-else
        :class="[
          'section-comment__ceo-editor block w-full rounded-lg border bg-[rgba(197,197,200,0.2)] p-4 transition-colors cursor-text',
          highlighted && !hasSupervisorComment
            ? 'border-[#C97D00]'
            : 'border-transparent focus-within:border-[#c8c7cc]',
        ]"
      >
        <span
          class="section-comment__ceo-editor-label block text-[14px] font-medium leading-4 tracking-[-0.1504px] text-[#5B5B62] mb-1"
        >
          Коментар CEO
        </span>
        <textarea
          ref="textareaRef"
          :value="draft"
          rows="1"
          :placeholder="placeholder"
          class="section-comment__ceo-textarea block w-full resize-none overflow-hidden bg-transparent border-0 p-0 text-[16px] leading-6 tracking-[-0.1504px] text-[#3D3D3D] placeholder:text-[rgba(61,61,61,0.5)] focus:outline-none focus:ring-0"
          @input="onInput"
          @blur="onBlur"
        />
      </label>
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
    <div
      v-else-if="hasSupervisorComment"
      class="section-comment__ceo-readonly flex flex-col gap-1 rounded-lg bg-[rgba(217,217,217,0.2)] p-4"
    >
      <p class="text-[14px] font-medium leading-4 tracking-[-0.1504px] text-[#5B5B62]">
        Коментар CEO
      </p>
      <p class="text-[16px] leading-6 tracking-[-0.1504px] text-[#3D3D3D] whitespace-pre-line">
        {{ supervisorComment }}
      </p>
    </div>
  </div>
</template>
