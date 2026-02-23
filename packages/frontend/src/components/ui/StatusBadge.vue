<script setup lang="ts">
import { STATUS_LABELS } from '@brand-constructor/shared';

interface BadgeProps {
  status: string;
}

defineProps<BadgeProps>();
</script>

<template>
  <span class="status-badge" :class="`status-badge--${status}`">
    {{ STATUS_LABELS[status] || status }}
  </span>
</template>

<style lang="scss" scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: $spacing-1 $spacing-2;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
  border-radius: $radius-full;
  text-transform: capitalize;

  &--active {
    background-color: #dcfce7;
    color: #166534;
  }

  &--draft {
    background-color: #fef9c3;
    color: #854d0e;
  }

  &--archived {
    background-color: #f1f5f9;
    color: #475569;
  }

  &--used {
    background-color: #dbeafe;
    color: #1e40af;
  }
}
</style>
