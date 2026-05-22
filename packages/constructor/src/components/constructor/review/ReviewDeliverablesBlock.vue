<script setup lang="ts">
import CalendarIcon from '@/components/icons/CalendarIcon.vue'
import DeliverablesScopeIcon from '@/components/icons/DeliverablesScopeIcon.vue'

interface ReviewDeliverablesBlockProps {
  /** e.g. "Legal Landing, Partner Landing" */
  scope: string
  /** Date string */
  timing: string
}

defineProps<ReviewDeliverablesBlockProps>()
</script>

<template>
  <div class="review-deliverables-block flex flex-col gap-4">
    <div class="review-deliverables-block__row flex items-start gap-2">
      <div class="review-deliverables-block__icon size-5 shrink-0 text-[#5B5B62]">
        <DeliverablesScopeIcon class="size-5 text-[#5B5B62]" />
      </div>
      <div class="review-deliverables-block__content flex-1 min-w-0 flex flex-col gap-1">
        <p class="review-deliverables-block__label text-[14px] font-medium leading-4 text-[#5B5B62]">
          Deliverables
        </p>
        <p class="review-deliverables-block__value text-[16px] leading-6 tracking-[-0.1504px] text-[#1A1A1A]">
          {{ scope }}
        </p>
      </div>
    </div>

    <div class="review-deliverables-block__row flex items-start gap-2">
      <div class="review-deliverables-block__icon size-5 shrink-0 text-[#5B5B62]">
        <CalendarIcon class="size-5 text-[#5B5B62]" />
      </div>
      <div class="review-deliverables-block__content flex-1 min-w-0 flex flex-col gap-1">
        <p class="review-deliverables-block__label text-[14px] font-medium leading-4 text-[#5B5B62]">
          Дедлайн
        </p>
        <p class="review-deliverables-block__value text-[16px] leading-6 tracking-[-0.1504px] text-[#1A1A1A]">
          {{ timing }}
        </p>
      </div>
    </div>
  </div>
</template>
