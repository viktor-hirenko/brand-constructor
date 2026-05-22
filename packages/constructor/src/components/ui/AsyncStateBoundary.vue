<script setup lang="ts">
withDefaults(
  defineProps<{
    loading: boolean
    error?: string | null
  }>(),
  { error: null },
)

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div v-if="loading" class="flex items-center justify-center py-16">
    <div class="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
  </div>

  <div v-else-if="error" class="text-center py-12">
    <p class="text-red-500 mb-3">{{ error }}</p>
    <button class="text-primary underline text-sm" @click="emit('retry')">
      Спробувати знову
    </button>
  </div>

  <slot v-else />
</template>
