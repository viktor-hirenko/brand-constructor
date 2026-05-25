<script setup lang="ts">
import { reactive, computed, ref } from 'vue'
import type { NewConceptBrief } from '@brand-constructor/shared/types'
import DatePicker from '@/components/constructor/fields/DatePicker.vue'
import BriefModalShell from '@/components/constructor/modals/BriefModalShell.vue'
import YesNoToggle from '@/components/ui/YesNoToggle.vue'
import { BRIEF_LANGUAGES, BRIEF_DOMAIN_ZONES } from '@/data/brief-constants'

const props = withDefaults(
  defineProps<{
    initialData?: NewConceptBrief | null
    /** Render as read-only preview (reuses the same markup as edit). */
    readonly?: boolean
    /** Show «Редагувати» primary action (only meaningful when `readonly`). */
    showEditAction?: boolean
  }>(),
  { readonly: false, showEditAction: false },
)

const emit = defineEmits<{
  save: [brief: NewConceptBrief]
  cancel: []
  edit: []
}>()

const init = props.initialData

const form = reactive<NewConceptBrief>({
  isNewGeo: init?.isNewGeo ?? null,
  geoInfo: init?.geoInfo ?? '',
  needsGeoResearch: init?.needsGeoResearch ?? null,
  conceptFeedback: init?.conceptFeedback ?? '',
  trafficTeamInfo: init?.trafficTeamInfo ?? '',
  competitors: init?.competitors ?? '',
  keepProductConnection: init?.keepProductConnection ?? null,
  connectedProducts: init?.connectedProducts ?? '',
  namingLanguage: init?.namingLanguage ?? '',
  desiredWordsInName: init?.desiredWordsInName ?? '',
  domainZones: init?.domainZones ? [...init.domainZones] : [],
  domainBudget: init?.domainBudget ?? null,
  namingDeadline: init?.namingDeadline ?? '',
  additionalGeoInfo: init?.additionalGeoInfo ?? '',
})

const isEditMode = !!init
const todayISO = new Date().toISOString().split('T')[0]
const budgetStr = ref(init?.domainBudget != null ? String(init.domainBudget) : '')

const isValid = computed(
  () =>
    form.conceptFeedback.trim() !== '' &&
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
  if (props.readonly) return 'Бриф нового концепту'
  return isEditMode ? 'Редагування брифу концепту' : 'Створення нового концепту'
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
        <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
          1. Чи це концепт для Нового ГЕО?
        </label>
        <YesNoToggle v-model="form.isNewGeo" />
      </div>

      <div class="flex flex-col gap-3">
        <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
          2. Чи є якась інформація про ГЕО?
        </label>
        <textarea
          v-model="form.geoInfo"
          rows="4"
          class="w-full p-3 bg-white border border-black/10 rounded-[10px] resize-none text-base leading-6 tracking-[-0.31px] placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#030213]/20 transition-all"
          placeholder="Опишіть інформацію про ГЕО..."
        />
      </div>

      <div class="flex flex-col gap-3">
        <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
          3. Потрібен Research GEO?
        </label>
        <YesNoToggle v-model="form.needsGeoResearch" />
      </div>

      <div class="flex flex-col gap-3">
        <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
          4. Інформація по гравцям від команди Трафіку <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="form.trafficTeamInfo"
          rows="3"
          class="w-full p-3 bg-white border border-black/10 rounded-[10px] resize-none text-base leading-6 tracking-[-0.31px] placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#030213]/20 transition-all"
          placeholder="Хто наші користувачі по трафіку"
        />
      </div>

      <div class="flex flex-col gap-3">
        <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
          5. Хто ключові конкуренти?
        </label>
        <textarea
          v-model="form.competitors"
          rows="2"
          class="w-full p-3 bg-white border border-black/10 rounded-[10px] resize-none text-base leading-6 tracking-[-0.31px] placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#030213]/20 transition-all"
          placeholder="Опишіть основних конкурентів"
        />
      </div>

      <div class="flex flex-col gap-3">
        <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
          6. Чи важливо зберегти звʼязок з іншими продуктами компанії?
        </label>
        <YesNoToggle v-model="form.keepProductConnection" />
        <input
          v-if="form.keepProductConnection === true"
          v-model="form.connectedProducts"
          type="text"
          class="w-full px-3 py-3 bg-white border border-black/10 rounded-[10px] text-base leading-6 tracking-[-0.31px] placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#030213]/20 transition-all"
          placeholder="З якими продуктами?"
        />
      </div>

      <div class="flex flex-col gap-3">
        <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
          7. Яка мова створення назви?
        </label>
        <select
          v-model="form.namingLanguage"
          class="w-full px-3 py-3 bg-white border border-black/10 rounded-[10px] text-base leading-6 tracking-[-0.31px] focus:outline-none focus:ring-2 focus:ring-[#030213]/20 transition-all appearance-none cursor-pointer"
        >
          <option value="" disabled>Оберіть мову</option>
          <option v-for="lang in BRIEF_LANGUAGES" :key="lang" :value="lang">{{ lang }}</option>
        </select>
      </div>

      <div class="flex flex-col gap-3">
        <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
          8. Які слова/приставки хочеться бачити в назві?
        </label>
        <textarea
          v-model="form.desiredWordsInName"
          rows="2"
          class="w-full p-3 bg-white border border-black/10 rounded-[10px] resize-none text-base leading-6 tracking-[-0.31px] placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#030213]/20 transition-all"
          placeholder="Наприклад: bet, win, play..."
        />
      </div>

      <div class="flex flex-col gap-3">
        <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
          9. Які доменні зони можна розглядати?
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="zone in BRIEF_DOMAIN_ZONES"
            :key="zone"
            type="button"
            class="px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all"
            :class="
              form.domainZones.includes(zone)
                ? 'border-[#030213] bg-[rgba(3,2,19,0.05)] text-[#030213]'
                : 'border-black/10 hover:border-black/20 text-[#0a0a0a]'
            "
            @click="toggleDomainZone(zone)"
          >
            {{ zone }}
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
          10. Бюджет домена в $?
        </label>
        <input
          :value="budgetStr"
          type="number"
          min="0"
          step="100"
          class="w-full px-3 py-3 bg-white border border-black/10 rounded-[10px] text-base leading-6 tracking-[-0.31px] placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#030213]/20 transition-all"
          placeholder="Наприклад: 5000"
          @input="handleBudgetInput"
        />
      </div>

      <div class="flex flex-col gap-3">
        <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
          11. Дедлайн розробки назви і концепту <span class="text-red-500">*</span>
        </label>
        <DatePicker v-model="form.namingDeadline" :min-date="todayISO" />
      </div>

      <div class="flex flex-col gap-3">
        <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
          12. Опишіть, що вам не підійшло в запропонованих концептах
          <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="form.conceptFeedback"
          rows="4"
          class="w-full p-3 bg-white border border-black/10 rounded-[10px] resize-none text-base leading-6 tracking-[-0.31px] placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#030213]/20 transition-all"
          placeholder="Ваш відгук про концепти..."
        />
      </div>

      <div class="flex flex-col gap-3">
        <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
          13. Додаткова інформація по ГЕО
        </label>
        <textarea
          v-model="form.additionalGeoInfo"
          rows="3"
          class="w-full p-3 bg-white border border-black/10 rounded-[10px] resize-none text-base leading-6 tracking-[-0.31px] placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#030213]/20 transition-all"
          placeholder="Будь-яка додаткова інформація по ГЕО..."
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
