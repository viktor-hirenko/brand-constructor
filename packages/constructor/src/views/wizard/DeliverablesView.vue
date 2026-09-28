<script setup lang="ts">
import { computed } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import DatePicker from '@/components/constructor/fields/DatePicker.vue'
import CalendarIcon from '@/components/icons/CalendarIcon.vue'
import HandshakeIcon from '@/components/icons/HandshakeIcon.vue'
import DeliverablesScopeIcon from '@/components/icons/DeliverablesScopeIcon.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import DeliverableToggleCard from '@/components/constructor/fields/DeliverableToggleCard.vue'
import UiFieldHint from '@/components/ui/UiFieldHint.vue'
import UiFieldLabel from '@/components/ui/UiFieldLabel.vue'
import {
  DELIVERABLE_CARD_ICON_CLASS,
  DELIVERABLE_FIELD_WIDTH_CLASS,
  DELIVERABLE_GRID_CLASS,
} from '@/constants/deliverableCard'

/**
 * Step 6 against the drawn screen `Deliverables (step 6)` `5411:37951`.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=5411-37951&m=dev
 *
 * `Frame 2087327396` `5411:37961` stacks three things under the step header at
 * a flat `spacing/24`: the pair of cards (ending at y = 106), the date Input
 * (y = 130) and the comment Input (y = 234, the date Input being 80 tall). So
 * the column is `gap-6` and the comment field opts out of its own 8 with
 * `flush` — otherwise it would stand 32 from the date field, the way the
 * fifteen screens phase 18 measured want it to.
 *
 * The screen has no right panel at all: `Step panel` `5411:37957` is the full
 * 1230 and the `Divider` beside it is a node of width 0. `BriefShellView`
 * already knew that — step 6 is in its `isFullWidth` list.
 */

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
    <!--
      No second subtitle here. `Step header` `5411:37960` carries the whole
      caption — "Додаткові опції для вашого проєкту." — and this view used to
      print a near-copy of it right underneath, so the screen said it twice.
      The one sentence now lives in the router meta. Same fix as row 74 made on
      the step 7 heading.
    -->
    <div :class="DELIVERABLE_GRID_CLASS">
      <DeliverableToggleCard
        v-model="legalLanding"
        title="Legal Landing"
        description="Лендінг зі всією юридичною інформацією про бренд: політика конфіденційності, умови використання, GDPR compliance."
      >
        <template #icon>
          <DeliverablesScopeIcon :class="DELIVERABLE_CARD_ICON_CLASS" />
        </template>
      </DeliverableToggleCard>

      <DeliverableToggleCard
        v-model="partnerLanding"
        title="Partner Landing"
        description="Сайт для партнерів, для підписаня контрактів."
      >
        <template #icon>
          <HandshakeIcon :class="DELIVERABLE_CARD_ICON_CLASS" />
        </template>
      </DeliverableToggleCard>
    </div>

    <!--
      The kit Input `5411:38242` is Title + `spacing/8` + field, and its Title
      is the 20 glyph beside `body/medium` 16/24 — `UiFieldLabel`. What stood
      here was a hand-made row with a 16 glyph.

      The asterisk is drawn WHITE on white on her screen, exactly as it is on
      the drawn step 1. Divergences row 113 already settled that: ours stays
      red, because the validation below is live and a field with no mark is
      indistinguishable from an optional one.
    -->
    <div v-if="hasAnythingEnabled" :class="[DELIVERABLE_FIELD_WIDTH_CLASS, 'flex flex-col gap-2']">
      <UiFieldLabel required>
        <template #icon="{ iconClass }">
          <CalendarIcon :class="iconClass" />
        </template>
        Дедлайн розробки
      </UiFieldLabel>

      <DatePicker v-model="developmentDeadline" :min-date="todayISO" />

      <UiFieldHint v-if="!developmentDeadline" tone="error">
        Дедлайн є обовʼязковим, якщо увімкнено хоча б одну опцію
      </UiFieldHint>
    </div>

    <StepCommentField v-model="comment" :class="DELIVERABLE_FIELD_WIDTH_CLASS" flush />
  </div>
</template>
