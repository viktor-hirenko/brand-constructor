<script setup lang="ts">
import { computed } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { useTouchedFields } from '@/composables/useTouchedFields'
import { useWizardBlockedNext } from '@/composables/wizardBlockedNextContext'
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

// A hint shows once the field was changed, left empty, or the grey «Далі» was
// pressed — never on a fresh screen (H-38).
const { touched, touch } = useTouchedFields(['geo', 'launchDate'] as const, useWizardBlockedNext())

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
  <!--
    `spacing/16` between neighbouring fields — the drawn step 1 `5409:35822`
    stacks its four Inputs at y = 0, 96, 192, 288 inside a 527-wide column, and
    an Input is 80 tall (Title 24 + 8 + field 48). 96 − 80 = 16. It was 24,
    which was nobody's number: the screen counted as "the designer drew
    nothing" until the `UXUI-2651` canvas turned up.
  -->
  <div class="flex flex-col gap-4">
    <!-- GEO -->
    <div>
      <UiFieldLabel class="mb-2" required>
        <template #icon="{ iconClass }">
          <GlobeIcon :class="iconClass" />
        </template>
        GEO (Географія)
      </UiFieldLabel>
      <GeoMultiSelect
        v-model="geo"
        @update:model-value="touch('geo')"
        @blur="touch('geo')"
      />
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
        @update:model-value="touch('launchDate')"
        @blur="touch('launchDate')"
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

    <!--
      Comment.

      `flush` because the drawn screen spaces this field like the other three —
      16, not 16 + the component's own 8. Its 8 is load-bearing on the fifteen
      edit-flow and wizard screens phase 18 measured at 32, so it stays their
      default and step 1 opts out.

      No `optional`: the drawn Title reads «Коментар» and nothing else. The
      "(необов'язково)" suffix was ours.
    -->
    <StepCommentField v-model="comment" />
  </div>
</template>
