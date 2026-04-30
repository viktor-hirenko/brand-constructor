<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

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
}

const props = withDefaults(defineProps<SectionCommentBlockProps>(), {
  poComment: '',
  ceoComment: '',
  highlighted: false,
  emptyLabel: '+ Коментар CEO',
  placeholder: 'Додайте коментар CEO…',
  debounceMs: 600,
})

const emit = defineEmits<{
  /** Fired (debounced) when CEO comment value changes. Empty string means cleared. */
  'update:ceoComment': [value: string]
}>()

const draft = ref<string>(props.ceoComment ?? '')
const isExpanded = ref<boolean>(!!(props.ceoComment ?? '').trim())
const textareaRef = ref<HTMLTextAreaElement | null>(null)
let flushTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.ceoComment,
  next => {
    const incoming = next ?? ''
    if (incoming !== draft.value) {
      draft.value = incoming
    }
    if (incoming.trim()) isExpanded.value = true
  }
)

watch(
  () => props.highlighted,
  highlighted => {
    if (highlighted && props.ceoEditable && !isExpanded.value) {
      isExpanded.value = true
      nextTick(() => textareaRef.value?.focus())
    }
  }
)

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

onBeforeUnmount(() => {
  flushNow()
})

function onInput(e: Event) {
  const value = (e.target as HTMLTextAreaElement).value
  draft.value = value
  scheduleEmit(value)
}

function onBlur() {
  flushNow()
  if (!draft.value.trim()) {
    isExpanded.value = false
  }
}

function openEditor() {
  isExpanded.value = true
  nextTick(() => textareaRef.value?.focus())
}

const hasPoComment = computed(() => (props.poComment ?? '').trim().length > 0)
const hasCeoComment = computed(() => (draft.value ?? '').trim().length > 0)

const ceoFieldClass = computed(() => [
  'relative w-full rounded-lg border bg-[#f3f3f5] transition-colors',
  props.highlighted
    ? 'border-amber-400 ring-2 ring-amber-200'
    : 'border-transparent focus-within:border-black/10',
])
</script>

<template>
  <div class="space-y-2" :data-section="sectionKey">
    <!-- Product Owner comment (read-only) -->
    <div v-if="hasPoComment" class="rounded-lg bg-[#f3f3f5] p-3">
      <p class="text-xs text-muted-foreground mb-1">Коментар замовника</p>
      <p class="text-sm whitespace-pre-line text-foreground">{{ poComment }}</p>
    </div>

    <!-- CEO comment block -->
    <template v-if="ceoEditable">
      <div v-if="!isExpanded && !hasCeoComment" class="flex">
        <button
          type="button"
          :class="[
            'inline-flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm transition-colors',
            highlighted
              ? 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100'
              : 'border-black/15 text-foreground hover:bg-black/[0.03]',
          ]"
          @click="openEditor"
        >
          <svg
            class="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          {{ emptyLabel }}
        </button>
      </div>

      <div v-else :class="ceoFieldClass">
        <label class="block px-3 pt-2 text-xs text-muted-foreground">Коментар CEO</label>
        <textarea
          ref="textareaRef"
          :value="draft"
          rows="2"
          :placeholder="placeholder"
          class="block w-full min-h-[4rem] resize-y bg-transparent px-3 pb-2 pt-1 text-sm placeholder:text-foreground/40 focus:outline-none"
          @input="onInput"
          @blur="onBlur"
        />
      </div>
    </template>

    <!-- Read-only CEO comment (PO/admin reading existing comments) -->
    <div v-else-if="hasCeoComment" class="rounded-lg bg-amber-50 p-3 border border-amber-200">
      <p class="text-xs font-medium text-amber-800 mb-1">Коментар CEO</p>
      <p class="text-sm whitespace-pre-line text-amber-900">{{ ceoComment }}</p>
    </div>
  </div>
</template>
