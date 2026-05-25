<script setup lang="ts">
import { computed } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import DatePicker from '@/components/constructor/fields/DatePicker.vue'
import CalendarIcon from '@/components/icons/CalendarIcon.vue'
import HandshakeIcon from '@/components/icons/HandshakeIcon.vue'
import DeliverablesScopeIcon from '@/components/icons/DeliverablesScopeIcon.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import DeliverableToggleCard from '@/components/constructor/fields/DeliverableToggleCard.vue'

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

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <DeliverableToggleCard
        v-model="legalLanding"
        title="Legal Landing"
        description="Лендінг зі всією юридичною інформацією про бренд: політика конфіденційності, умови використання, GDPR compliance"
      >
        <template #icon>
          <DeliverablesScopeIcon class="size-6 text-foreground" />
        </template>
      </DeliverableToggleCard>

      <DeliverableToggleCard
        v-model="partnerLanding"
        title="Partner Landing"
        description="Сайт для партнерів, для підписаня контрактів"
      >
        <template #icon>
          <HandshakeIcon class="size-6 text-foreground" />
        </template>
      </DeliverableToggleCard>
    </div>

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

    <StepCommentField v-model="comment" />
  </div>
</template>
