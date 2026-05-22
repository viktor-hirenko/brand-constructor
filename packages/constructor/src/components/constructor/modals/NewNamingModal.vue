<script setup lang="ts">
import { reactive, computed, ref } from 'vue'
import type { NewNamingBrief } from '@brand-constructor/shared/types'
import DatePicker from '@/components/constructor/fields/DatePicker.vue'
import BriefModalShell from '@/components/constructor/modals/BriefModalShell.vue'
import YesNoToggle from '@/components/ui/YesNoToggle.vue'
import { BRIEF_LANGUAGES, BRIEF_DOMAIN_ZONES } from '@/data/brief-constants'

const props = defineProps<{
  initialData?: NewNamingBrief | null
}>()

const emit = defineEmits<{
  save: [brief: NewNamingBrief]
  cancel: []
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
  if (!isValid.value) return
  emit('save', { ...form, domainZones: [...form.domainZones] })
}
</script>

<template>
  <BriefModalShell
    :title="isEditMode ? 'Редагування брифу External Naming' : 'Замовити новий External Naming'"
    :is-valid="isValid"
    @cancel="emit('cancel')"
    @save="handleSave"
  >
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-3">
        <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
          1. Чи це нове ГЕО?
        </label>
        <YesNoToggle v-model="form.isNewGeo" />
      </div>

      <div class="flex flex-col gap-3">
        <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
          2. Опис, що не підійшло в запропонованих неймінгах
          <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="form.namingFeedback"
          rows="3"
          class="w-full p-3 bg-white border border-black/10 rounded-[10px] resize-none text-base leading-6 tracking-[-0.31px] placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#030213]/20 transition-all"
          placeholder="Що саме не підходить?"
        />
      </div>

      <div class="flex flex-col gap-3">
        <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
          3. Інформація по гравцям від команди Трафіку <span class="text-red-500">*</span>
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
          4. Потрібен Brand Research GEO?
        </label>
        <YesNoToggle v-model="form.needsGeoResearch" />
      </div>

      <div class="flex flex-col gap-3">
        <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
          5. Яка мова створення назви?
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
          6. Які слова/приставки хочеться бачити в назві?
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
          7. Які доменні зони можна розглядати?
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
          8. Яких слів, рішень, знаків хотілося б уникнути в назві?
        </label>
        <textarea
          v-model="form.wordsToAvoid"
          rows="2"
          class="w-full p-3 bg-white border border-black/10 rounded-[10px] resize-none text-base leading-6 tracking-[-0.31px] placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#030213]/20 transition-all"
          placeholder="Наприклад: slot, free, magic..."
        />
      </div>

      <div class="flex flex-col gap-3">
        <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
          9. Бюджет домена в $?
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
          10. Дедлайн розробки назви <span class="text-red-500">*</span>
        </label>
        <DatePicker v-model="form.namingDeadline" :min-date="todayISO" />
      </div>

      <div class="flex flex-col gap-3">
        <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
          11. Додаткова інформація по ГЕО
        </label>
        <textarea
          v-model="form.additionalGeoInfo"
          rows="3"
          class="w-full p-3 bg-white border border-black/10 rounded-[10px] resize-none text-base leading-6 tracking-[-0.31px] placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#030213]/20 transition-all"
          placeholder="Будь-яка додаткова інформація..."
        />
      </div>
    </div>
  </BriefModalShell>
</template>
