<script setup lang="ts">
import { computed } from 'vue'
import ApplyCeoVariantButton from './ApplyCeoVariantButton.vue'
import ReviewChoiceGroup from './ReviewChoiceGroup.vue'

interface ReviewInternalNamingBlockProps {
  poValue: string
  ceoName?: string | null
  /** Show "Застосувати варіант CEO" button. */
  showApplyCeo?: boolean
  applyLoading?: boolean
  /** Applied state: show single value with "Обрана назва" label. */
  ceoApplied?: boolean
}

const props = withDefaults(defineProps<ReviewInternalNamingBlockProps>(), {
  ceoName: null,
  showApplyCeo: false,
  applyLoading: false,
  ceoApplied: false,
})

const emit = defineEmits<{ applyCeo: [] }>()

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
        <ul class="review-internal-block__list flex flex-col gap-1">
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
        <ul class="review-internal-block__list flex flex-col gap-1">
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
