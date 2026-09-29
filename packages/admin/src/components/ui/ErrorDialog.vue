<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useErrorDialog } from '@/composables/useErrorDialog'

/**
 * Draws `useErrorDialog()` — mounted once, in `App.vue`.
 *
 * The worker's own words go under «Технічні деталі», folded: useful to whoever
 * debugs it, noise to everyone else. The request body is never shown.
 */
const { current, closeError } = useErrorDialog()
</script>

<template>
  <BaseModal v-if="current" :title="current.title" width="440px" @close="closeError">
    <div class="error-dialog">
      <p class="error-dialog__body">{{ current.body }}</p>
      <details v-if="current.detail" class="error-dialog__detail">
        <summary>Технічні деталі</summary>
        <code>{{ current.detail }}</code>
      </details>
    </div>
    <template #footer>
      <BaseButton @click="closeError">Зрозуміло</BaseButton>
    </template>
  </BaseModal>
</template>

<style lang="scss" scoped>
.error-dialog {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;

  &__body {
    margin: 0;
    font-size: $font-size-sm;
    line-height: 1.55;
  }

  &__detail {
    font-size: $font-size-xs;
    color: $color-text-secondary;

    summary {
      cursor: pointer;
    }

    code {
      display: block;
      margin-top: $spacing-2;
      padding: $spacing-2;
      background: $color-bg;
      border: 1px solid $color-border;
      border-radius: $radius-sm;
      white-space: pre-wrap;
      word-break: break-word;
    }
  }
}
</style>
