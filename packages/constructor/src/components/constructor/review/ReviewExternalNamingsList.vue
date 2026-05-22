<script setup lang="ts">
import { computed } from 'vue'
import ApplyCeoVariantButton from './ApplyCeoVariantButton.vue'
import ReviewChoiceGroup from './ReviewChoiceGroup.vue'
import EyeIcon from '@/components/icons/EyeIcon.vue'

interface ExternalNamingItem {
  id: string
  name: string
  domain?: string
}

interface ReviewExternalNamingsListProps {
  items: ExternalNamingItem[]
  ceoItems?: ExternalNamingItem[]
  showApplyCeo?: boolean
  applyLoading?: boolean
  ceoApplied?: boolean
  isNewBrief?: boolean
}

const props = withDefaults(defineProps<ReviewExternalNamingsListProps>(), {
  ceoItems: () => [],
  showApplyCeo: false,
  applyLoading: false,
  ceoApplied: false,
  isNewBrief: false,
})

const emit = defineEmits<{ applyCeo: []; previewBrief: [] }>()

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
        <div
          v-else-if="isNewBrief"
          class="review-external-list__brief flex items-center justify-between gap-4"
        >
          <div class="flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]">
            <span class="text-[#5B5B62]">•</span>
            <span class="text-[#1A1A1A]">Бриф нового External Naming</span>
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
        <div
          v-else-if="isNewBrief"
          class="review-external-list__brief flex items-center justify-between gap-4"
        >
          <div class="flex items-baseline gap-1 text-[16px] leading-6 tracking-[-0.1504px]">
            <span class="text-[#5B5B62]">•</span>
            <span class="text-[#1A1A1A]">Бриф нового External Naming</span>
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
