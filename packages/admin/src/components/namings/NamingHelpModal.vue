<script setup lang="ts">
import BaseModal from '@/components/ui/BaseModal.vue'
import { HELP_FOOTNOTE, HELP_SECTIONS } from '@/utils/namingHelp'

/**
 * «Як це працює» of the External Naming table: what the statuses mean, where
 * the price comes from, when a person is needed. One screen, read once —
 * the terms themselves are explained where they stand, on hover.
 */
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <BaseModal title="Як це працює" width="560px" @close="emit('close')">
    <div class="naming-help">
      <section v-for="section in HELP_SECTIONS" :key="section.title" class="naming-help__section">
        <h3 class="naming-help__title">{{ section.title }}</h3>
        <ul class="naming-help__lines">
          <li v-for="line in section.lines" :key="line">{{ line }}</li>
        </ul>
      </section>
      <p class="naming-help__footnote">{{ HELP_FOOTNOTE }}</p>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
.naming-help {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;
  font-size: $font-size-sm;
  line-height: $line-height-normal;
  color: $color-text;

  &__section {
    display: flex;
    flex-direction: column;
    gap: $spacing-1;
  }

  &__title {
    margin: 0;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
  }

  &__lines {
    display: flex;
    flex-direction: column;
    gap: $spacing-1;
    margin: 0;
    padding-left: $spacing-4;
    color: $color-text-secondary;
  }

  &__footnote {
    margin: 0;
    padding-top: $spacing-3;
    border-top: 1px solid $color-border;
    color: $color-text-secondary;
  }
}
</style>
