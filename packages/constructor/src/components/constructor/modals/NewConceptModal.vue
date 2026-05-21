<script setup lang="ts">
import { reactive, computed, ref } from 'vue'
import type { NewConceptBrief } from '@brand-constructor/shared/types'
import DatePicker from '@/components/constructor/fields/DatePicker.vue'

const props = defineProps<{
  initialData?: NewConceptBrief | null
}>()

const emit = defineEmits<{
  save: [brief: NewConceptBrief]
  cancel: []
}>()

const LANGUAGES = [
  'English',
  'German',
  'Portuguese',
  'Spanish',
  'French',
  'Italian',
  'Turkish',
  'Arabic',
  'Hindi',
  'Japanese',
  'Chinese',
  'Korean',
  'Russian',
  'Ukrainian',
]

const DOMAIN_ZONES = [
  '.com',
  '.net',
  '.io',
  '.co',
  '.org',
  '.bet',
  '.casino',
  '.games',
  '.play',
  '.fun',
  '.win',
  '.app',
  '.gg',
  '.club',
  '.live',
  '.online',
]

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

const isValid = computed(() => {
  return (
    form.conceptFeedback.trim() !== '' &&
    form.trafficTeamInfo.trim() !== '' &&
    form.namingDeadline !== ''
  )
})

function toggleDomainZone(zone: string) {
  const idx = form.domainZones.indexOf(zone)
  if (idx === -1) {
    form.domainZones.push(zone)
  } else {
    form.domainZones.splice(idx, 1)
  }
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
  <Teleport to="body">
    <div class="fixed inset-0 z-[9999] flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="emit('cancel')" />

      <div
        class="relative bg-white rounded-[16px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] w-[672px] max-h-[85vh] flex flex-col"
      >
        <!-- Header: per Figma h-[73px], border-b, title + close button -->
        <div
          class="flex items-center justify-between h-[73px] px-6 border-b border-black/10 shrink-0"
        >
          <h2 class="text-xl font-semibold leading-[28px] tracking-[-0.45px] text-[#0a0a0a]">
            {{ isEditMode ? 'Редагування брифу концепту' : 'Створення нового концепту' }}
          </h2>
          <button
            type="button"
            class="size-10 rounded-full bg-[#ececf0] flex items-center justify-center hover:bg-[#dddde2] transition-colors"
            @click="emit('cancel')"
          >
            <svg
              class="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <!-- Scrollable form -->
        <div class="flex-1 overflow-y-auto px-6 pt-6 pb-6">
          <div class="flex flex-col gap-6">
            <!-- 1. Чи це концепт для Нового ГЕО? -->
            <div class="flex flex-col gap-3">
              <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
                1. Чи це концепт для Нового ГЕО?
              </label>
              <div class="flex gap-4">
                <button
                  type="button"
                  class="flex-1 h-[52px] rounded-[10px] border-2 text-base font-medium leading-6 tracking-[-0.31px] transition-all"
                  :class="
                    form.isNewGeo === true
                      ? 'border-[#030213] bg-[rgba(3,2,19,0.05)] text-[#030213]'
                      : 'border-black/10 text-[#0a0a0a] hover:border-black/20'
                  "
                  @click="form.isNewGeo = true"
                >
                  Так
                </button>
                <button
                  type="button"
                  class="flex-1 h-[52px] rounded-[10px] border-2 text-base font-medium leading-6 tracking-[-0.31px] transition-all"
                  :class="
                    form.isNewGeo === false
                      ? 'border-[#030213] bg-[rgba(3,2,19,0.05)] text-[#030213]'
                      : 'border-black/10 text-[#0a0a0a] hover:border-black/20'
                  "
                  @click="form.isNewGeo = false"
                >
                  Ні
                </button>
              </div>
            </div>

            <!-- 2. Чи є якась інформація про ГЕО? -->
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

            <!-- 3. Потрібен Research GEO? -->
            <div class="flex flex-col gap-3">
              <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
                3. Потрібен Research GEO?
              </label>
              <div class="flex gap-4">
                <button
                  type="button"
                  class="flex-1 h-[52px] rounded-[10px] border-2 text-base font-medium leading-6 tracking-[-0.31px] transition-all"
                  :class="
                    form.needsGeoResearch === true
                      ? 'border-[#030213] bg-[rgba(3,2,19,0.05)] text-[#030213]'
                      : 'border-black/10 text-[#0a0a0a] hover:border-black/20'
                  "
                  @click="form.needsGeoResearch = true"
                >
                  Так
                </button>
                <button
                  type="button"
                  class="flex-1 h-[52px] rounded-[10px] border-2 text-base font-medium leading-6 tracking-[-0.31px] transition-all"
                  :class="
                    form.needsGeoResearch === false
                      ? 'border-[#030213] bg-[rgba(3,2,19,0.05)] text-[#030213]'
                      : 'border-black/10 text-[#0a0a0a] hover:border-black/20'
                  "
                  @click="form.needsGeoResearch = false"
                >
                  Ні
                </button>
              </div>
            </div>

            <!-- 4. Інформація по гравцям від команди Трафіку -->
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

            <!-- 5. Хто ключові конкуренти? -->
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

            <!-- 6. Чи важливо зберегти зв'язок? -->
            <div class="flex flex-col gap-3">
              <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
                6. Чи важливо зберегти звʼязок з іншими продуктами компанії?
              </label>
              <div class="flex gap-4">
                <button
                  type="button"
                  class="flex-1 h-[52px] rounded-[10px] border-2 text-base font-medium leading-6 tracking-[-0.31px] transition-all"
                  :class="
                    form.keepProductConnection === true
                      ? 'border-[#030213] bg-[rgba(3,2,19,0.05)] text-[#030213]'
                      : 'border-black/10 text-[#0a0a0a] hover:border-black/20'
                  "
                  @click="form.keepProductConnection = true"
                >
                  Так
                </button>
                <button
                  type="button"
                  class="flex-1 h-[52px] rounded-[10px] border-2 text-base font-medium leading-6 tracking-[-0.31px] transition-all"
                  :class="
                    form.keepProductConnection === false
                      ? 'border-[#030213] bg-[rgba(3,2,19,0.05)] text-[#030213]'
                      : 'border-black/10 text-[#0a0a0a] hover:border-black/20'
                  "
                  @click="form.keepProductConnection = false"
                >
                  Ні
                </button>
              </div>
              <input
                v-if="form.keepProductConnection === true"
                v-model="form.connectedProducts"
                type="text"
                class="w-full px-3 py-3 bg-white border border-black/10 rounded-[10px] text-base leading-6 tracking-[-0.31px] placeholder:text-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#030213]/20 transition-all"
                placeholder="З якими продуктами?"
              />
            </div>

            <!-- 7. Яка мова створення назви? -->
            <div class="flex flex-col gap-3">
              <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
                7. Яка мова створення назви?
              </label>
              <select
                v-model="form.namingLanguage"
                class="w-full px-3 py-3 bg-white border border-black/10 rounded-[10px] text-base leading-6 tracking-[-0.31px] focus:outline-none focus:ring-2 focus:ring-[#030213]/20 transition-all appearance-none cursor-pointer"
              >
                <option value="" disabled>Оберіть мову</option>
                <option v-for="lang in LANGUAGES" :key="lang" :value="lang">
                  {{ lang }}
                </option>
              </select>
            </div>

            <!-- 8. Які слова/приставки? -->
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

            <!-- 9. Які доменні зони? -->
            <div class="flex flex-col gap-3">
              <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
                9. Які доменні зони можна розглядати?
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="zone in DOMAIN_ZONES"
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

            <!-- 10. Бюджет домена -->
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

            <!-- 11. Дедлайн -->
            <div class="flex flex-col gap-3">
              <label class="text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a]">
                11. Дедлайн розробки назви і концепту <span class="text-red-500">*</span>
              </label>
              <DatePicker v-model="form.namingDeadline" :min-date="todayISO" />
            </div>

            <!-- 12. Опишіть, що вам не підійшло -->
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

            <!-- 13. Додаткова інформація по ГЕО -->
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
          </div>
        </div>

        <!-- Footer: per Figma - right-aligned, gap-12px, border-t -->
        <div
          class="flex items-start justify-end gap-3 px-6 pt-[17px] pb-4 border-t border-black/10 shrink-0"
        >
          <button
            type="button"
            class="h-[46px] px-6 border border-black/10 rounded-[10px] text-base font-medium leading-6 tracking-[-0.31px] text-[#0a0a0a] hover:bg-black/[0.02] transition-all"
            @click="emit('cancel')"
          >
            Скасувати
          </button>
          <button
            type="button"
            :disabled="!isValid"
            class="h-[46px] px-6 bg-[#030213] text-white rounded-[10px] text-base font-medium leading-6 tracking-[-0.31px] disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all"
            @click="handleSave"
          >
            Зберегти
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
