<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

interface Props {
  currentStep: number;
  totalSteps: number;
  canProceed?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  canProceed: true,
});

const emit = defineEmits<{
  next: [];
  back: [];
}>();

const router = useRouter();

const isFirstStep = computed(() => props.currentStep === 1);
const isLastStep = computed(() => props.currentStep === props.totalSteps);

function goBack() {
  if (!isFirstStep.value) {
    emit('back');
    router.push(`/constructor/step/${props.currentStep - 1}`);
  }
}

function goNext() {
  if (props.canProceed && !isLastStep.value) {
    emit('next');
    router.push(`/constructor/step/${props.currentStep + 1}`);
  } else if (isLastStep.value) {
    emit('next');
  }
}
</script>

<template>
  <div class="step-navigation">
    <button 
      class="step-navigation__btn step-navigation__btn--back"
      :disabled="isFirstStep"
      @click="goBack"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Назад</span>
    </button>

    <button 
      class="step-navigation__btn step-navigation__btn--next"
      :disabled="!canProceed"
      @click="goNext"
    >
      <span>{{ isLastStep ? 'Надіслати' : 'Далі' }}</span>
      <svg v-if="!isLastStep" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.step-navigation {
  @include flex-between;
  padding-top: $spacing-6;
  border-top: 1px solid $color-border;
  margin-top: auto;

  &__btn {
    @include button-base;
    gap: $spacing-2;

    &--back {
      background: transparent;
      color: $color-text-secondary;
      border: 1px solid $color-border;

      &:hover:not(:disabled) {
        background: $color-bg;
        color: $color-text;
      }

      &:disabled {
        opacity: 0.3;
      }
    }

    &--next {
      background: $color-primary;
      color: $color-white;

      &:hover:not(:disabled) {
        background: $color-primary-hover;
      }
    }
  }
}
</style>
