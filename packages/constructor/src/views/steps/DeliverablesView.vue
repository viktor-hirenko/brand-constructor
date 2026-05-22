<script setup lang="ts">
import { computed } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import DatePicker from '@/components/constructor/fields/DatePicker.vue'
import CalendarIcon from '@/components/icons/CalendarIcon.vue'
import HandshakeIcon from '@/components/icons/HandshakeIcon.vue'
import DeliverablesScopeIcon from '@/components/icons/DeliverablesScopeIcon.vue'
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
              <DeliverablesScopeIcon class="size-6 text-foreground" />
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
              <HandshakeIcon class="size-6 text-foreground" />
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
        <CalendarIcon class="size-4 text-foreground" />
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
