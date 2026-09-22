<script setup lang="ts">
import CalendarIcon from '@/components/icons/CalendarIcon.vue'
import DeliverablesScopeIcon from '@/components/icons/DeliverablesScopeIcon.vue'
import UiProperty from '@/components/ui/UiProperty.vue'

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
    <UiProperty
      class="review-deliverables-block__row"
      type="icon-label-value"
      label="Deliverables"
      :value="scope"
    >
      <template #icon="{ iconClass }">
        <DeliverablesScopeIcon :class="iconClass" />
      </template>
    </UiProperty>

    <UiProperty
      class="review-deliverables-block__row"
      type="icon-label-value"
      label="Дедлайн"
      :value="timing"
    >
      <template #icon="{ iconClass }">
        <CalendarIcon :class="iconClass" />
      </template>
    </UiProperty>
  </div>
</template>
