<script setup lang="ts">
import { reactive, computed, ref } from 'vue'
import type { NewNamingBrief } from '@brand-constructor/shared/types'
import DatePicker from '@/components/constructor/fields/DatePicker.vue'
import BriefModalShell from '@/components/constructor/modals/BriefModalShell.vue'
import YesNoToggle from '@/components/ui/YesNoToggle.vue'
import UiFieldLabel from '@/components/ui/UiFieldLabel.vue'
import UiTextField from '@/components/ui/UiTextField.vue'
import UiTextarea from '@/components/ui/UiTextarea.vue'
import { UI_FIELD_CONTROL_CLASS, resolveUiFieldSurfaceClasses } from '@/components/ui/uiField'

/**
 * Phase 11 put every field in this form on the kit Input `3424:2287`.
 * The drawn brief-order modal `5562:49171` is the reference for the
 * geometry: each question is Title 24 + gap 8 + a 48-tall field, or 96 when
 * it is a Type = Area.
 *
 * The language picker stays a native `<select>`. The kit's Dropdown
 * `3446:5801` is the Input surface plus a Popover, and this one has no
 * search, no grouping and no multi-select — replacing the native control
 * would cost keyboard and mobile behaviour and buy only the chevron. It
 * takes the same surface function as every other field, in `bare` mode,
 * because a `<select>` cannot be a flex container itself.
 */
const selectClass = [
  resolveUiFieldSurfaceClasses({ focusWithin: false, bare: true }),
  UI_FIELD_CONTROL_CLASS,
  'cursor-pointer appearance-none',
].join(' ')
import { BRIEF_LANGUAGES, BRIEF_DOMAIN_ZONES } from '@/data/brief-constants'
import {
  DOMAIN_ZONE_CHIP_ROW_CLASS,
  resolveDomainZoneChipClass,
} from '@/components/constructor/modals/domainZoneChip'

const props = withDefaults(
  defineProps<{
    initialData?: NewNamingBrief | null
    /** Render as read-only preview (reuses the same markup as edit). */
    readonly?: boolean
    /** Show «Редагувати» primary action (only meaningful when `readonly`). */
    showEditAction?: boolean
  }>(),
  { readonly: false, showEditAction: false },
)

const emit = defineEmits<{
  save: [brief: NewNamingBrief]
  cancel: []
  edit: []
}>()

const init = props.initialData

const form = reactive<NewNamingBrief>({
  isNewGeo: init?.isNewGeo ?? null,
  namingFeedback: init?.namingFeedback ?? '',
  trafficTeamInfo: init?.trafficTeamInfo ?? '',
  needsGeoResearch: init?.needsGeoResearch ?? null,
  namingLanguage: init?.namingLanguage ?? '',
  desiredWordsInName: init?.desiredWordsInName ?? '',
  domainZones: init?.domainZones ? [...init.domainZones] : [],
  wordsToAvoid: init?.wordsToAvoid ?? '',
  domainBudget: init?.domainBudget ?? null,
  namingDeadline: init?.namingDeadline ?? '',
  additionalGeoInfo: init?.additionalGeoInfo ?? '',
})

const isEditMode = !!init
const todayISO = new Date().toISOString().split('T')[0]
const budgetStr = ref(init?.domainBudget != null ? String(init.domainBudget) : '')

const isValid = computed(
  () =>
    form.namingFeedback.trim() !== '' &&
    form.trafficTeamInfo.trim() !== '' &&
    form.namingDeadline !== '',
)

function toggleDomainZone(zone: string) {
  const idx = form.domainZones.indexOf(zone)
  if (idx === -1) form.domainZones.push(zone)
  else form.domainZones.splice(idx, 1)
}

function handleBudgetInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  budgetStr.value = val
  const num = parseFloat(val)
  form.domainBudget = isNaN(num) ? null : num
}

function handleSave() {
  if (props.readonly || !isValid.value) return
  emit('save', { ...form, domainZones: [...form.domainZones] })
}

const title = computed(() => {
  if (props.readonly) return 'Бриф нового External Naming'
  return isEditMode
    ? 'Редагування брифу External Naming'
    : 'Замовити новий External Naming'
})
</script>

<template>
  <BriefModalShell
    :title="title"
    :is-valid="isValid"
    :readonly="readonly"
    :show-edit-action="showEditAction"
    @cancel="emit('cancel')"
    @save="handleSave"
    @edit="emit('edit')"
  >
    <fieldset :disabled="readonly" class="brief-form m-0 p-0 border-0 min-w-0 flex flex-col gap-6">
      <div class="flex flex-col gap-3">
        <UiFieldLabel>
          1. Чи це нове ГЕО?
        </UiFieldLabel>
        <YesNoToggle v-model="form.isNewGeo" />
      </div>

      <div class="flex flex-col gap-3">
        <UiFieldLabel>
          2. Чи є якась інформація про ГЕО?
        </UiFieldLabel>
        <UiTextarea
          v-model="form.additionalGeoInfo"
          :rows="4"
          placeholder="Опишіть інформацію про ГЕО..."
        />
      </div>

      <div class="flex flex-col gap-3">
        <UiFieldLabel>
          3. Потрібен Brand Research GEO?
        </UiFieldLabel>
        <YesNoToggle v-model="form.needsGeoResearch" />
      </div>

      <div class="flex flex-col gap-3">
        <UiFieldLabel required>
          4. Інформація по гравцям від команди Трафіку
        </UiFieldLabel>
        <UiTextarea
          v-model="form.trafficTeamInfo"
          :rows="3"
          placeholder="Хто наші користувачі по трафіку"
        />
      </div>

      <div class="flex flex-col gap-3">
        <UiFieldLabel>
          5. Яка мова створення назви?
        </UiFieldLabel>
        <select
          v-model="form.namingLanguage"
          :class="selectClass"
        >
          <option value="" disabled>Оберіть мову</option>
          <option v-for="lang in BRIEF_LANGUAGES" :key="lang" :value="lang">{{ lang }}</option>
        </select>
      </div>

      <div class="flex flex-col gap-3">
        <UiFieldLabel>
          6. Які слова/приставки хочеться бачити в назві?
        </UiFieldLabel>
        <UiTextarea
          v-model="form.desiredWordsInName"
          :rows="2"
          placeholder="Наприклад: bet, win, play..."
        />
      </div>

      <div class="flex flex-col gap-3">
        <UiFieldLabel>
          7. Які доменні зони можна розглядати?
        </UiFieldLabel>
        <div :class="DOMAIN_ZONE_CHIP_ROW_CLASS">
          <button
            v-for="zone in BRIEF_DOMAIN_ZONES"
            :key="zone"
            type="button"
            :aria-pressed="form.domainZones.includes(zone)"
            :class="resolveDomainZoneChipClass(form.domainZones.includes(zone))"
            @click="toggleDomainZone(zone)"
          >
            {{ zone }}
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <UiFieldLabel>
          8. Яких слів, рішень, знаків хотілося б уникнути в назві?
        </UiFieldLabel>
        <UiTextarea
          v-model="form.wordsToAvoid"
          :rows="2"
          placeholder="Наприклад: slot, free, magic..."
        />
      </div>

      <div class="flex flex-col gap-3">
        <UiFieldLabel>
          9. Бюджет домена в $?
        </UiFieldLabel>
        <UiTextField
          :model-value="budgetStr"
          type="number"
          min="0"
          step="100"
          placeholder="Наприклад: 5000"
          @input="handleBudgetInput"
        />
      </div>

      <div class="flex flex-col gap-3">
        <UiFieldLabel required>
          10. Дедлайн розробки назви
        </UiFieldLabel>
        <DatePicker v-model="form.namingDeadline" :min-date="todayISO" />
      </div>

      <div class="flex flex-col gap-3">
        <UiFieldLabel required>
          11. Опишіть, що вам не підійшло в запропонованих неймінгах
        </UiFieldLabel>
        <UiTextarea
          v-model="form.namingFeedback"
          :rows="4"
          placeholder="Ваш відгук про неймінги..."
        />
      </div>
    </fieldset>
  </BriefModalShell>
</template>

<style scoped>
.brief-form:disabled {
  opacity: 1;
}
.brief-form:disabled :deep(input),
.brief-form:disabled :deep(textarea),
.brief-form:disabled :deep(select),
.brief-form:disabled :deep(button) {
  opacity: 1 !important;
  cursor: default;
}
</style>
