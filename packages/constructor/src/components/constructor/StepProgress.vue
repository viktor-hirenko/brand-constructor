<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  currentStep: number;
  totalSteps: number;
}

const props = defineProps<Props>();

const progressPercent = computed(() => {
  return Math.round((props.currentStep / props.totalSteps) * 100);
});
</script>

<template>
  <div class="step-progress">
    <div class="step-progress__info">
      <span class="step-progress__label">
        Крок {{ currentStep }} з {{ totalSteps }}
      </span>
      <span class="step-progress__percent">{{ progressPercent }}%</span>
    </div>
    <div class="step-progress__bar">
      <div 
        class="step-progress__fill" 
        :style="{ width: `${progressPercent}%` }"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.step-progress {
  max-width: 600px;

  &__info {
    @include flex-between;
    margin-bottom: $spacing-2;
  }

  &__label {
    @include small-text;
    font-weight: $font-weight-medium;
    color: $color-text;
  }

  &__percent {
    @include small-text;
    color: $color-text-secondary;
  }

  &__bar {
    height: 8px;
    background: $color-bg-secondary;
    border-radius: $radius-full;
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    background: $color-primary;
    border-radius: $radius-full;
    @include transition(width);
  }
}
</style>
