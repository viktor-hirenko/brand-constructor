<script setup lang="ts">
import { computed } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import DatePicker from '@/components/constructor/fields/DatePicker.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'

const store = useConstructorStore()

const todayISO = new Date().toISOString().split('T')[0]

const legalLanding = computed({
  get: () => store.stepData.deliverables.legalLanding,
  set: (val: boolean) => store.setDeliverables({ legalLanding: val }),
})

const partnerLanding = computed({
  get: () => store.stepData.deliverables.partnerLanding,
  set: (val: boolean) => store.setDeliverables({ partnerLanding: val }),
})

const developmentDeadline = computed({
  get: () => store.stepData.deliverables.developmentDeadline,
  set: (val: string) => store.setDeliverables({ developmentDeadline: val }),
})

const comment = computed({
  get: () => store.stepData.deliverables.comment,
  set: (val: string) => store.setDeliverables({ comment: val }),
})

const hasAnythingEnabled = computed(() => legalLanding.value || partnerLanding.value)
</script>

<template>
  <div class="flex flex-col gap-6">
    <p class="text-muted-foreground text-base tracking-[-0.31px]">
      Додаткові опції для вашого проєкту
    </p>

    <!-- Toggle Cards Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Legal Landing -->
      <div class="p-6 bg-[#f3f3f5] border border-black/10 rounded-[14px]">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-4 flex-1">
            <div
              class="size-12 rounded-[10px] bg-[rgba(3,2,19,0.1)] flex items-center justify-center shrink-0"
            >
              <svg
                class="size-6 text-foreground"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
                <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
                <path d="M7 21h10" />
                <path d="M12 3v18" />
                <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-medium text-foreground tracking-[-0.44px] mb-1">
                Legal Landing
              </h3>
              <p class="text-sm text-muted-foreground tracking-[-0.15px]">
                Лендінг зі всією юридичною інформацією про бренд: політика конфіденційності, умови
                використання, GDPR compliance
              </p>
            </div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer shrink-0">
            <input v-model="legalLanding" type="checkbox" class="sr-only peer" />
            <div
              class="w-14 h-7 bg-[#ececf0] rounded-full peer peer-checked:bg-[#030213] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:after:translate-x-7"
            />
          </label>
        </div>
      </div>

      <!-- Partner Landing -->
      <div class="p-6 bg-[#f3f3f5] border border-black/10 rounded-[14px]">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-4 flex-1">
            <div
              class="size-12 rounded-[10px] bg-[rgba(3,2,19,0.1)] flex items-center justify-center shrink-0"
            >
              <svg
                class="size-6 text-foreground"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m11 17 2 2a1 1 0 1 0 3-3" />
                <path
                  d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"
                />
                <path d="m21 3 1 11h-2" />
                <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
                <path d="M3 4h8" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-medium text-foreground tracking-[-0.44px] mb-1">
                Partner Landing
              </h3>
              <p class="text-sm text-muted-foreground tracking-[-0.15px]">
                Сайт для партнерів, для підписаня контрактів
              </p>
            </div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer shrink-0">
            <input v-model="partnerLanding" type="checkbox" class="sr-only peer" />
            <div
              class="w-14 h-7 bg-[#ececf0] rounded-full peer peer-checked:bg-[#030213] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:after:translate-x-7"
            />
          </label>
        </div>
      </div>
    </div>

    <!-- Development Deadline -->
    <div v-if="hasAnythingEnabled" class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <svg
          class="size-4 text-foreground"
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
        <span class="text-base font-medium text-foreground tracking-[-0.31px]">
          Дедлайн розробки
          <span class="text-red-500">*</span>
        </span>
      </div>
      <DatePicker v-model="developmentDeadline" :min-date="todayISO" />
      <p v-if="!developmentDeadline" class="text-xs text-red-500">
        Дедлайн є обовʼязковим, якщо увімкнено хоча б одну опцію
      </p>
    </div>

    <!-- Коментар -->
    <StepCommentField v-model="comment" />
  </div>
</template>
