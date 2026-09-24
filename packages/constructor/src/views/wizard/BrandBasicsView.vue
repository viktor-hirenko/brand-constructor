<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import GeoMultiSelect from '@/components/constructor/fields/GeoMultiSelect.vue'
import DatePicker from '@/components/constructor/fields/DatePicker.vue'
import GlobeIcon from '@/components/icons/GlobeIcon.vue'
import CalendarIcon from '@/components/icons/CalendarIcon.vue'
import LinkIcon from '@/components/icons/LinkIcon.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import UiFieldHint from '@/components/ui/UiFieldHint.vue'
import UiFieldLabel from '@/components/ui/UiFieldLabel.vue'
import UiTextField from '@/components/ui/UiTextField.vue'

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
      <UiFieldLabel class="mb-2" required>
        <template #icon="{ iconClass }">
          <GlobeIcon :class="iconClass" />
        </template>
        GEO (Географія)
      </UiFieldLabel>
      <GeoMultiSelect v-model="geo" @update:model-value="touched.geo = true" />
      <UiFieldHint v-if="touched.geo && geo.length === 0" tone="error" class="mt-1">
        Оберіть хоча б одну ГЕО
      </UiFieldHint>
    </div>

    <!-- Launch Date -->
    <div>
      <UiFieldLabel class="mb-2" required>
        <template #icon="{ iconClass }">
          <CalendarIcon :class="iconClass" />
        </template>
        Плануєма дата запуску
      </UiFieldLabel>
      <DatePicker
        v-model="launchDate"
        :min-date="todayISO"
        @update:model-value="touched.launchDate = true"
      />
      <UiFieldHint v-if="touched.launchDate && !launchDate" tone="error" class="mt-1">
        Вкажіть дату запуску
      </UiFieldHint>
    </div>

    <!-- Linked Product -->
    <div>
      <UiFieldLabel class="mb-2">
        <template #icon="{ iconClass }">
          <!-- Mapping table row "Звʼязок з іншим продуктом | → Link, Regular". -->
          <LinkIcon :class="iconClass" />
        </template>
        Звʼязок з іншим продуктом (якщо є)
      </UiFieldLabel>
      <UiTextField v-model="linkedProduct" placeholder="Thor, Alpa..." />
    </div>

    <!-- Comment -->
    <StepCommentField v-model="comment" optional />
  </div>
</template>
