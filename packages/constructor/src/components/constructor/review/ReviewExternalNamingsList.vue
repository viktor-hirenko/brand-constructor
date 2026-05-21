<script setup lang="ts">
import { computed } from 'vue'
import ApplyCeoVariantButton from './ApplyCeoVariantButton.vue'
import ReviewChoiceGroup from './ReviewChoiceGroup.vue'

interface ExternalNamingItem {
  id: string
  name: string
  domain?: string
}

interface ReviewExternalNamingsListProps {
  items: ExternalNamingItem[]
  /** CEO picks — when non-empty, shows a second labelled list. */
  ceoItems?: ExternalNamingItem[]
  /** Show "Застосувати варіант CEO" button below the dual list. */
  showApplyCeo?: boolean
  /** Disable the apply button while request is in-flight. */
  applyLoading?: boolean
  /** Applied state: show single list with "Обрані назви" label. */
  ceoApplied?: boolean
}

const props = withDefaults(defineProps<ReviewExternalNamingsListProps>(), {
  ceoItems: () => [],
  showApplyCeo: false,
  applyLoading: false,
  ceoApplied: false,
})

const emit = defineEmits<{ applyCeo: [] }>()

const showDual = computed(() => props.ceoItems.length > 0 && !props.ceoApplied)

const layout = computed<'applied' | 'dual' | 'single'>(() => {
  if (props.ceoApplied) return 'applied'
  if (showDual.value) return 'dual'
  return 'single'
})

const layoutModifier = computed(() => {
  if (props.ceoApplied) return 'review-external-list--applied'
  if (showDual.value) return 'review-external-list--dual-view'
  return 'review-external-list--single'
})
</script>

<template>
  <div :class="['review-external-list', layoutModifier]">
    <ReviewChoiceGroup :layout="layout" applied-label="Обрані назви">
      <template #applied>
        <ul v-if="items.length > 0" class="review-external-list__list flex flex-col gap-1">
          <li
            v-for="item in items"
            :key="item.id"
            class="review-external-list__item flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]"
          >
            <span class="text-[#5B5B62]">•</span>
            <span class="text-[#1A1A1A]">{{ item.name }}</span>
            <span v-if="item.domain" class="text-[#5B5B62]">({{ item.domain }})</span>
          </li>
        </ul>
        <p v-else class="review-external-list__empty text-[14px] text-[#5B5B62] italic">
          Назву не обрано
        </p>
      </template>

      <template #po>
        <ul v-if="items.length > 0" class="review-external-list__list flex flex-col gap-1">
          <li
            v-for="item in items"
            :key="item.id"
            class="review-external-list__item flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]"
          >
            <span class="text-[#5B5B62]">•</span>
            <span class="text-[#1A1A1A]">{{ item.name }}</span>
            <span v-if="item.domain" class="text-[#5B5B62]">({{ item.domain }})</span>
          </li>
        </ul>
        <p v-else class="review-external-list__empty text-[14px] text-[#5B5B62] italic">
          Назву не обрано
        </p>
      </template>

      <template #ceo>
        <ul class="review-external-list__list flex flex-col gap-1">
          <li
            v-for="item in ceoItems"
            :key="item.id"
            class="review-external-list__item flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]"
          >
            <span class="text-[#5B5B62]">•</span>
            <span class="text-[#1A1A1A]">{{ item.name }}</span>
            <span v-if="item.domain" class="text-[#5B5B62]">({{ item.domain }})</span>
          </li>
        </ul>
      </template>

      <template #single>
        <ul v-if="items.length > 0" class="review-external-list__list flex flex-col gap-1">
          <li
            v-for="item in items"
            :key="item.id"
            class="review-external-list__item flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]"
          >
            <span class="text-[#5B5B62]">•</span>
            <span class="text-[#1A1A1A]">{{ item.name }}</span>
            <span v-if="item.domain" class="text-[#5B5B62]">({{ item.domain }})</span>
          </li>
        </ul>
        <p v-else class="review-external-list__empty text-[14px] text-[#5B5B62] italic">
          Назву не обрано
        </p>
      </template>

      <template v-if="showApplyCeo" #actions>
        <ApplyCeoVariantButton :loading="applyLoading" @click="emit('applyCeo')" />
      </template>
    </ReviewChoiceGroup>
  </div>
</template>
