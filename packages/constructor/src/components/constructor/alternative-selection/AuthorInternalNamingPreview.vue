<script setup lang="ts">
interface AuthorInternalNamingPreviewProps {
  name: string | null
}

defineProps<AuthorInternalNamingPreviewProps>()
</script>

<template>
  <div class="author-internal-naming-preview flex flex-col gap-3">
    <p class="author-internal-naming-preview__label text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">
      Вибір замовника
    </p>
    <div v-if="name" class="author-internal-naming-preview__grid grid grid-cols-3 gap-2 max-w-[506px]">
      <div
        class="h-[128px] rounded-[16px] bg-[#f1f1f3] border border-black/10 flex flex-col items-center justify-center px-6 py-10 text-center"
      >
        <p class="text-[20px] font-medium leading-6 text-[#1a1a1a] tracking-[-0.1504px] break-words w-full">
          {{ name }}
        </p>
      </div>
    </div>
    <p
      v-else
      class="author-internal-naming-preview__empty text-[16px] leading-6 tracking-[-0.3125px] text-[#717182] italic"
    >
      Назву не обрано
    </p>
  </div>
</template>
