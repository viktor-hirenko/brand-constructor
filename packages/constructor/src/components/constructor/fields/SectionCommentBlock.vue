<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CeoCommentCard from '@/components/constructor/review/CeoCommentCard.vue'
import PlusIcon from '@/components/icons/PlusIcon.vue'

interface SectionCommentBlockProps {
  /** Section identifier from CEO_COMMENT_SECTIONS (concept, externalNaming, ...). */
  sectionKey: string
  /** Read-only Product Owner comment from the corresponding step. */
  poComment?: string
  /** Persisted CEO comment (single source of truth from store). */
  ceoComment?: string
  /** Whether the CEO field can be edited (true for CEO/admin in submitted/needs_revision). */
  ceoEditable: boolean
  /** Highlight CEO field with amber border when validation requires comment. */
  highlighted?: boolean
  /** Optional override for the CEO empty-state CTA label. */
  emptyLabel?: string
  /** Optional placeholder for textarea. */
  placeholder?: string
  /** Debounce in ms for the autosave emit. Defaults to 600ms. */
  debounceMs?: number
  /** Always show textarea (e.g. general comment block) — no dashed CTA. */
  alwaysExpanded?: boolean
  /**
   * When true, the CEO comment is shown as CeoCommentCard with resolve UI.
   * Used in PO needs_revision view. Requires `ceoResolved` and `canResolve`.
   */
  showResolveUi?: boolean
  /** Whether this CEO comment is marked as resolved by PO. */
  ceoResolved?: boolean
  /** Whether the current user can resolve/unresolve (brand owner only). */
  canResolve?: boolean
  /** Whether a resolve/unresolve request is in flight for this section. */
  ceoResolveLoading?: boolean
}

const props = withDefaults(defineProps<SectionCommentBlockProps>(), {
  poComment: '',
  ceoComment: '',
  highlighted: false,
  emptyLabel: 'Коментар CEO',
  placeholder: 'Додайте ваші коментарі або побажання…',
  debounceMs: 600,
  alwaysExpanded: false,
  showResolveUi: false,
  ceoResolved: false,
  canResolve: false,
  ceoResolveLoading: false,
})

const emit = defineEmits<{
  /** Fired (debounced) when CEO comment value changes. Empty string means cleared. */
  'update:ceoComment': [value: string]
  /** Fired when PO clicks "Позначити як вирішений". */
  resolve: []
  /** Fired when PO clicks "Повернути" (unresolve). */
  unresolve: []
}>()

const draft = ref<string>(props.ceoComment ?? '')
const isExpanded = ref<boolean>(
  props.alwaysExpanded || !!(props.ceoComment ?? '').trim()
)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
let flushTimer: ReturnType<typeof setTimeout> | null = null

function autosize() {
  const ta = textareaRef.value
  if (!ta) return
  ta.style.height = 'auto'
  ta.style.height = `${ta.scrollHeight}px`
}

watch(
  () => props.ceoComment,
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
    if (value !== (props.ceoComment ?? '')) {
      emit('update:ceoComment', value)
    }
  }, props.debounceMs)
}

function flushNow() {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (draft.value !== (props.ceoComment ?? '')) {
    emit('update:ceoComment', draft.value)
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

const hasPoComment = computed(() => (props.poComment ?? '').trim().length > 0)
const hasCeoComment = computed(() => (draft.value ?? '').trim().length > 0)
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
      v-if="hasPoComment"
      class="section-comment__po flex flex-col gap-1 rounded-lg bg-[rgba(197,197,200,0.2)] p-4"
    >
      <p class="text-[14px] font-medium leading-4 tracking-[-0.1504px] text-[#5B5B62]">
        Коментар замовника
      </p>
      <p
        class="text-[16px] leading-6 tracking-[-0.1504px] text-[#3D3D3D] whitespace-pre-line"
      >
        {{ poComment }}
      </p>
    </div>

    <!-- CEO comment block -->
    <template v-if="ceoEditable">
      <button
        v-if="!alwaysExpanded && !isExpanded && !hasCeoComment"
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
          highlighted && !hasCeoComment
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
    <CeoCommentCard
      v-else-if="hasCeoComment && showResolveUi"
      :value="ceoComment ?? ''"
      :resolved="ceoResolved"
      :loading="ceoResolveLoading"
      :can-resolve="canResolve"
      @resolve="emit('resolve')"
      @unresolve="emit('unresolve')"
    />

    <!-- Read-only CEO comment without resolve UI (used outside the PO returned-from-CEO view) -->
    <div
      v-else-if="hasCeoComment"
      class="section-comment__ceo-readonly flex flex-col gap-1 rounded-lg bg-[rgba(217,217,217,0.2)] p-4"
    >
      <p class="text-[14px] font-medium leading-4 tracking-[-0.1504px] text-[#5B5B62]">
        Коментар CEO
      </p>
      <p
        class="text-[16px] leading-6 tracking-[-0.1504px] text-[#3D3D3D] whitespace-pre-line"
      >
        {{ ceoComment }}
      </p>
    </div>
  </div>
</template>
