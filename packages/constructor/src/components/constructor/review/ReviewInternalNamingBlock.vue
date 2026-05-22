<script setup lang="ts">
import { computed } from 'vue'
import ApplyCeoVariantButton from './ApplyCeoVariantButton.vue'
import ReviewChoiceGroup from './ReviewChoiceGroup.vue'
import EyeIcon from '@/components/icons/EyeIcon.vue'

interface ReviewInternalNamingBlockProps {
  poValue: string
  ceoName?: string | null
  /** Show "Застосувати варіант CEO" button. */
  showApplyCeo?: boolean
  applyLoading?: boolean
  /** Applied state: show single value with "Обрана назва" label. */
  ceoApplied?: boolean
  /** PO ordered a new internal naming brief instead of picking from library. */
  isNewBrief?: boolean
}

const props = withDefaults(defineProps<ReviewInternalNamingBlockProps>(), {
  ceoName: null,
  showApplyCeo: false,
  applyLoading: false,
  ceoApplied: false,
  isNewBrief: false,
})

const emit = defineEmits<{ applyCeo: []; previewBrief: [] }>()

const showDual = computed(
  () => !!props.ceoName && String(props.ceoName).trim().length > 0 && !props.ceoApplied
)

const layout = computed<'applied' | 'dual' | 'single'>(() => {
  if (props.ceoApplied) return 'applied'
  if (showDual.value) return 'dual'
  return 'single'
})

const layoutModifier = computed(() => {
  if (props.ceoApplied) return 'review-internal-block--applied'
  if (showDual.value) return 'review-internal-block--dual-view'
  return 'review-internal-block--single'
})
</script>

<template>
  <div :class="['review-internal-block', layoutModifier]">
    <ReviewChoiceGroup
      :layout="layout"
      applied-label="Обрана назва"
      dual-outer-gap="gap-4"
      column-inner-gap="gap-1"
      choice-gap="gap-1"
    >
      <template #applied>
        <ul class="review-internal-block__list flex flex-col gap-1">
          <li class="review-internal-block__item flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]">
            <span class="text-[#5B5B62]">•</span>
            <span class="text-[#1A1A1A]">{{ poValue }}</span>
          </li>
        </ul>
      </template>

      <template #po>
        <div
          v-if="isNewBrief"
          class="review-internal-block__brief flex items-center justify-between gap-4"
        >
          <div class="flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]">
            <span class="text-[#5B5B62]">•</span>
            <span class="text-[#1A1A1A]">Бриф нової Internal Naming</span>
          </div>
          <button
            type="button"
            class="inline-flex shrink-0 items-center gap-1 h-10 px-3 rounded-lg text-[14px] font-medium leading-4 tracking-[-0.1504px] text-[#373737] hover:bg-black/[0.04] transition-colors"
            @click="emit('previewBrief')"
          >
            <EyeIcon />
            Переглянути
          </button>
        </div>
        <ul v-else class="review-internal-block__list flex flex-col gap-1">
          <li class="review-internal-block__item flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]">
            <span class="text-[#5B5B62]">•</span>
            <span class="text-[#1A1A1A]">{{ poValue }}</span>
          </li>
        </ul>
      </template>

      <template #ceo>
        <ul class="review-internal-block__list flex flex-col gap-1">
          <li class="review-internal-block__item flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]">
            <span class="text-[#5B5B62]">•</span>
            <span class="text-[#1A1A1A]">{{ ceoName }}</span>
          </li>
        </ul>
      </template>

      <template #single>
        <div
          v-if="isNewBrief"
          class="review-internal-block__brief flex items-center justify-between gap-4"
        >
          <div class="flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]">
            <span class="text-[#5B5B62]">•</span>
            <span class="text-[#1A1A1A]">Бриф нової Internal Naming</span>
          </div>
          <button
            type="button"
            class="inline-flex shrink-0 items-center gap-1 h-10 px-3 rounded-lg text-[14px] font-medium leading-4 tracking-[-0.1504px] text-[#373737] hover:bg-black/[0.04] transition-colors"
            @click="emit('previewBrief')"
          >
            <EyeIcon />
            Переглянути
          </button>
        </div>
        <ul v-else class="review-internal-block__list flex flex-col gap-1">
          <li class="review-internal-block__item flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]">
            <span class="text-[#5B5B62]">•</span>
            <span class="text-[#1A1A1A]">{{ poValue }}</span>
          </li>
        </ul>
      </template>

      <template v-if="showApplyCeo" #actions>
        <ApplyCeoVariantButton :loading="applyLoading" @click="emit('applyCeo')" />
      </template>
    </ReviewChoiceGroup>
  </div>
</template>
