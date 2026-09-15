<script setup lang="ts">
import UiAlert from '@/components/ui/UiAlert.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { resolveUiAsyncStateClasses } from '@/components/ui/uiAsyncState'

/**
 * The one "failed to load" card. Replaces fourteen hand-written copies that
 * disagreed on six axes (`py-8` / `py-12` / `py-16`, red container text or red
 * paragraph, underlined link or filled button, with and without `type`).
 *
 * Loading is deliberately not handled here: every call site already renders its
 * own skeleton, and the four spinners this phase found were all unreachable.
 */
interface UiAsyncStateProps {
  /** The technical string from the API. Sits under the title, in grey. */
  message?: string | null
  title?: string
  retryLabel?: string
}

withDefaults(defineProps<UiAsyncStateProps>(), {
  message: null,
  title: 'Не вдалося завантажити дані',
  retryLabel: 'Спробувати знову',
})

const emit = defineEmits<{ retry: [] }>()

const classes = resolveUiAsyncStateClasses()
</script>

<template>
  <div :class="classes.root">
    <UiAlert type="error" :title="title" :description="message ?? ''">
      <template #actions>
        <UiButton variant="secondary" size="S" @click="emit('retry')">
          {{ retryLabel }}
        </UiButton>
      </template>
    </UiAlert>
  </div>
</template>
