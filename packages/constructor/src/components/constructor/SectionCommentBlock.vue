<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

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
}

const props = withDefaults(defineProps<SectionCommentBlockProps>(), {
  poComment: '',
  ceoComment: '',
  highlighted: false,
  emptyLabel: 'Коментар CEO',
  placeholder: 'Додайте ваші коментарі або побажання…',
  debounceMs: 600,
  alwaysExpanded: false,
})

const emit = defineEmits<{
  /** Fired (debounced) when CEO comment value changes. Empty string means cleared. */
  'update:ceoComment': [value: string]
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
  <div class="flex flex-col gap-2" :data-section="sectionKey">
    <!-- Product Owner comment (read-only) -->
    <div
      v-if="hasPoComment"
      class="flex flex-col gap-1 rounded-lg bg-[rgba(197,197,200,0.2)] p-4"
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
          'w-full inline-flex items-center justify-center gap-1 rounded-lg border border-dashed p-3 transition-colors',
          highlighted
            ? 'border-[#C97D00] hover:bg-black/[0.02]'
            : 'border-[rgba(0,0,0,0.2)] hover:bg-black/[0.02]',
        ]"
        @click="openEditor"
      >
        <svg
          class="size-4 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M7.5 13V8.5H3C2.72386 8.5 2.5 8.27614 2.5 8C2.5 7.72386 2.72386 7.5 3 7.5H7.5V3C7.5 2.72386 7.72386 2.5 8 2.5C8.27614 2.5 8.5 2.72386 8.5 3V7.5H13C13.2761 7.5 13.5 7.72386 13.5 8C13.5 8.27614 13.2761 8.5 13 8.5H8.5V13C8.5 13.2761 8.27614 13.5 8 13.5C7.72386 13.5 7.5 13.2761 7.5 13Z"
            fill="#373737"
          />
        </svg>
        <span class="text-[14px] font-medium leading-4 tracking-[-0.3125px] text-[#373737]">
          {{ emptyLabel }}
        </span>
      </button>

      <label
        v-else
        :class="[
          'block w-full rounded-lg border bg-[rgba(197,197,200,0.2)] p-4 transition-colors cursor-text',
          highlighted && !hasCeoComment
            ? 'border-[#C97D00]'
            : 'border-transparent focus-within:border-[#c8c7cc]',
        ]"
      >
        <span
          class="block text-[14px] font-medium leading-4 tracking-[-0.1504px] text-[#5B5B62] mb-1"
        >
          Коментар CEO
        </span>
        <textarea
          ref="textareaRef"
          :value="draft"
          rows="1"
          :placeholder="placeholder"
          class="block w-full resize-none overflow-hidden bg-transparent border-0 p-0 text-[16px] leading-6 tracking-[-0.1504px] text-[#3D3D3D] placeholder:text-[rgba(61,61,61,0.5)] focus:outline-none focus:ring-0"
          @input="onInput"
          @blur="onBlur"
        />
      </label>
    </template>

    <!-- Read-only CEO comment (PO/admin reading existing comments) -->
    <div
      v-else-if="hasCeoComment"
      class="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-4"
    >
      <p class="text-[14px] font-medium leading-4 tracking-[-0.1504px] text-amber-800">
        Коментар CEO
      </p>
      <p
        class="text-[16px] leading-6 tracking-[-0.1504px] text-amber-900 whitespace-pre-line"
      >
        {{ ceoComment }}
      </p>
    </div>
  </div>
</template>
