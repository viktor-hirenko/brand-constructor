<script setup lang="ts">
import ChatBubbleIcon from '@/components/icons/ChatBubbleIcon.vue'

/**
 * Read-only CEO comment block — matches `StepCommentField` visual style but
 * non-editable. Used on PO edit screens (PoEditConcept/External/InternalView)
 * to surface the CEO's comment that triggered the revision.
 */
interface CeoCommentReadonlyProps {
  value: string
}

defineProps<CeoCommentReadonlyProps>()
</script>

<template>
  <div v-if="value" class="ceo-comment-readonly flex flex-col gap-2">
    <div class="ceo-comment-readonly__header flex items-center gap-2 h-6">
      <ChatBubbleIcon class="ceo-comment-readonly__icon text-[#5B5B62]" />
      <span
        class="ceo-comment-readonly__label text-[14px] font-medium leading-4 tracking-[-0.1504px] text-[#5b5b62]"
      >
        Коментар СЕО
      </span>
    </div>
    <div
      class="ceo-comment-readonly__body w-full px-4 py-4 bg-[rgba(197,197,200,0.2)] rounded-[8px] text-[16px] leading-6 tracking-[-0.1504px] text-[#3d3d3d] whitespace-pre-line"
    >
      {{ value }}
    </div>
  </div>
</template>
