<script setup lang="ts">
interface NamingMini {
  id: string
  name: string
  domain?: string
  price?: number | null
}

interface AuthorNamingsRowProps {
  namings: NamingMini[]
}

defineProps<AuthorNamingsRowProps>()

function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || !Number.isFinite(price)) return ''
  return `$${price.toLocaleString('uk-UA').replace(/,/g, ' ')}`
}
</script>

<template>
  <div class="author-namings-row flex flex-col gap-3">
    <p class="author-namings-row__label text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">
      Вибір замовника
    </p>
    <div
      v-if="namings.length > 0"
      class="author-namings-row__grid grid grid-cols-3 gap-2 max-w-[506px]"
    >
      <div
        v-for="n in namings"
        :key="n.id"
        class="rounded-[16px] bg-[#f1f1f3] border border-black/10 flex flex-col items-center gap-2 px-6 py-10 text-center tracking-[-0.1504px]"
      >
        <div class="flex flex-col gap-1 w-full">
          <p class="text-[20px] font-medium leading-6 text-[#1a1a1a] break-words w-full">
            {{ n.name }}
          </p>
          <p
            v-if="n.domain"
            class="text-[12px] font-normal leading-4 text-[#4b4b58] truncate w-full"
          >
            ({{ n.domain }})
          </p>
        </div>
        <p
          v-if="formatPrice(n.price)"
          class="text-[16px] font-medium leading-6 text-[#1a1a1a] w-full"
        >
          {{ formatPrice(n.price) }}
        </p>
      </div>
    </div>
    <p
      v-else
      class="author-namings-row__empty text-[16px] leading-6 tracking-[-0.3125px] text-[#717182] italic"
    >
      Назви не обрано
    </p>
  </div>
</template>
