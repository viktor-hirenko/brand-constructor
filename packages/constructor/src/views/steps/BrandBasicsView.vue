<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import GeoMultiSelect from '@/components/constructor/fields/GeoMultiSelect.vue'
import DatePicker from '@/components/constructor/fields/DatePicker.vue'
import GlobeIcon from '@/components/icons/GlobeIcon.vue'
import CalendarIcon from '@/components/icons/CalendarIcon.vue'
import FileIcon from '@/components/icons/FileIcon.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'

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
        <GlobeIcon class="size-4 text-muted-foreground" />
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
        <CalendarIcon class="size-4 text-muted-foreground" />
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
        <FileIcon class="size-4 text-muted-foreground" />
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
    <StepCommentField v-model="comment" optional />
  </div>
</template>
