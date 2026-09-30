<script setup lang="ts">
import { computed } from 'vue'
import ApplyCeoVariantButton from './ApplyCeoVariantButton.vue'
import ReviewChoiceGroup from './ReviewChoiceGroup.vue'
import EyeIcon from '@/components/icons/EyeIcon.vue'
import UiLink from '@/components/ui/UiLink.vue'

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
    >
      <template #applied>
        <ul class="review-internal-block__list flex flex-col gap-2">
          <li class="review-internal-block__item flex items-baseline text-[1rem] leading-6">
            <span class="w-6 shrink-0 text-center text-ink-900" aria-hidden="true">•</span>
            <span class="text-ink-900">{{ poValue }}</span>
          </li>
        </ul>
      </template>

      <template #po>
        <div
          v-if="isNewBrief"
          class="review-internal-block__brief flex items-center justify-between gap-4"
        >
          <div class="flex items-baseline gap-1 text-[1rem] leading-6">
            <span class="text-ink-700">•</span>
            <span class="text-ink-900">Бриф на створення Internal Naming</span>
          </div>
          <UiLink @click="emit('previewBrief')">
            <template #icon="{ iconClass }"><EyeIcon :class="iconClass" /></template>
            Переглянути
          </UiLink>
        </div>
        <ul v-else class="review-internal-block__list flex flex-col gap-2">
          <li class="review-internal-block__item flex items-baseline text-[1rem] leading-6">
            <span class="w-6 shrink-0 text-center text-ink-900" aria-hidden="true">•</span>
            <span class="text-ink-900">{{ poValue }}</span>
          </li>
        </ul>
      </template>

      <template #ceo>
        <ul class="review-internal-block__list flex flex-col gap-2">
          <li class="review-internal-block__item flex items-baseline text-[1rem] leading-6">
            <span class="w-6 shrink-0 text-center text-ink-900" aria-hidden="true">•</span>
            <span class="text-ink-900">{{ ceoName }}</span>
          </li>
        </ul>
      </template>

      <template #single>
        <div
          v-if="isNewBrief"
          class="review-internal-block__brief flex items-center justify-between gap-4"
        >
          <div class="flex items-baseline gap-1 text-[1rem] leading-6">
            <span class="text-ink-700">•</span>
            <span class="text-ink-900">Бриф на створення Internal Naming</span>
          </div>
          <UiLink @click="emit('previewBrief')">
            <template #icon="{ iconClass }"><EyeIcon :class="iconClass" /></template>
            Переглянути
          </UiLink>
        </div>
        <ul v-else class="review-internal-block__list flex flex-col gap-2">
          <li class="review-internal-block__item flex items-baseline text-[1rem] leading-6">
            <span class="w-6 shrink-0 text-center text-ink-900" aria-hidden="true">•</span>
            <span class="text-ink-900">{{ poValue }}</span>
          </li>
        </ul>
      </template>

      <template v-if="showApplyCeo" #actions>
        <ApplyCeoVariantButton :loading="applyLoading" @click="emit('applyCeo')" />
      </template>
    </ReviewChoiceGroup>
  </div>
</template>
