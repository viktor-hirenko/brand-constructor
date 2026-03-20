<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import GeoMultiSelect from '@/components/constructor/GeoMultiSelect.vue'
import DatePicker from '@/components/constructor/DatePicker.vue'

const store = useConstructorStore()

const touched = ref({ geo: false, launchDate: false })

const todayISO = new Date().toISOString().split('T')[0]

const geo = computed({
  get: () => store.stepData.brandBasics.geo,
  set: (val: string[]) => store.setBrandBasics({ geo: val }),
})

const launchDate = computed({
  get: () => store.stepData.brandBasics.launchDate,
  set: (val: string) => store.setBrandBasics({ launchDate: val }),
})

const linkedProduct = computed({
  get: () => store.stepData.brandBasics.linkedProduct,
  set: (val: string) => store.setBrandBasics({ linkedProduct: val }),
})

const comment = computed({
  get: () => store.stepData.brandBasics.comment,
  set: (val: string) => store.setBrandBasics({ comment: val }),
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- GEO -->
    <div>
      <label class="flex items-center gap-2 mb-2">
        <svg
          class="size-4 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
        <span class="font-medium text-base">GEO (Географія)</span>
        <span class="text-error text-sm">*</span>
      </label>
      <GeoMultiSelect v-model="geo" @update:model-value="touched.geo = true" />
      <p v-if="touched.geo && geo.length === 0" class="text-red-500 text-sm mt-1">
        Оберіть хоча б одну ГЕО
      </p>
    </div>

    <!-- Launch Date -->
    <div>
      <label class="flex items-center gap-2 mb-2">
        <svg
          class="size-4 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
        </svg>
        <span class="font-medium text-base">Плануєма дата запуску</span>
        <span class="text-error text-sm">*</span>
      </label>
      <DatePicker
        v-model="launchDate"
        :min-date="todayISO"
        @update:model-value="touched.launchDate = true"
      />
      <p v-if="touched.launchDate && !launchDate" class="text-red-500 text-sm mt-1">
        Вкажіть дату запуску
      </p>
    </div>

    <!-- Linked Product -->
    <div>
      <label class="flex items-center gap-2 mb-2">
        <svg
          class="size-4 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M10 9H8" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
        </svg>
        <span class="font-medium text-base">Звʼязок з іншим продуктом (якщо є)</span>
      </label>
      <input
        v-model="linkedProduct"
        type="text"
        placeholder="Thor, Alpa..."
        class="w-full px-4 py-3 bg-input border border-black/10 rounded-[10px] outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base placeholder:text-foreground/50"
      />
    </div>

    <!-- Comment -->
    <div>
      <label class="flex items-center gap-2 mb-2">
        <svg
          class="size-4 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M10 9H8" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
        </svg>
        <span class="font-medium text-base">Коментар</span>
        <span class="text-sm text-muted-foreground">(необовʼязково)</span>
      </label>
      <textarea
        v-model="comment"
        rows="3"
        placeholder="Додайте ваші коментарі або побажання..."
        class="w-full px-4 py-3 bg-input border border-transparent rounded-[10px] outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base placeholder:text-foreground/50 resize-none"
      />
    </div>
  </div>
</template>
