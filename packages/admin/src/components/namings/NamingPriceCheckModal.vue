<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { formatUsd } from '@/utils/namingDomainStatus'
import {
  PRICE_SOURCE_LABELS,
  describeDomainCard,
  describeSourceReading,
  formatCheckDate,
  priceOffer,
  recheckKind,
  type CheckedNaming,
} from '@/utils/namingPriceCheck'

/**
 * The card behind a price or a status in the namings table: what the domain
 * is, who set its price, when it was checked and what each marketplace asks —
 * in whole sentences (docs/architecture/domain-price-sync-plan.md). The table
 * itself shows only the price and the status.
 */
const props = defineProps<{
  naming: CheckedNaming
  /** Roles that edit namings get the buttons; the rest only read. */
  canWrite: boolean
  saving: 'accept' | 'keep' | null
  checking: boolean
  error: string | null
}>()

const emit = defineEmits<{
  close: []
  decide: [action: 'accept' | 'keep']
  recheck: []
}>()

const card = computed(() => describeDomainCard(props.naming))
const sources = computed(() => props.naming.price_check?.sources ?? [])
const offer = computed(() =>
  props.canWrite && props.naming.status === 'active' ? priceOffer(props.naming.price_check) : null
)
const canRecheck = computed(() => props.canWrite && recheckKind(props.naming) !== null)
const busy = computed(() => props.saving !== null || props.checking)
</script>

<template>
  <BaseModal :title="naming.domain || 'Домен'" width="460px" @close="emit('close')">
    <p class="domain-card__headline">{{ card.headline }}</p>
    <p v-for="line in card.details" :key="line" class="domain-card__detail">{{ line }}</p>
    <ul v-if="sources.length" class="domain-card__sources">
      <li v-for="s in sources" :key="s.source" class="domain-card__source">
        <a
          v-if="s.url"
          class="domain-card__link"
          :href="s.url"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ PRICE_SOURCE_LABELS[s.source] }}
        </a>
        <span v-else>{{ PRICE_SOURCE_LABELS[s.source] }}</span>
        <span class="domain-card__value">{{ describeSourceReading(s) }}</span>
        <span v-if="s.read_at" class="domain-card__date">{{ formatCheckDate(s.read_at) }}</span>
      </li>
    </ul>
    <!-- In the body, not the footer: three buttons do not fit one row of it. -->
    <div v-if="canRecheck" class="domain-card__recheck">
      <BaseButton variant="secondary" size="sm" :loading="checking" :disabled="busy" @click="emit('recheck')">
        Перевірити зараз
      </BaseButton>
    </div>
    <p v-if="error" class="domain-card__error">{{ error }}</p>
    <template #footer>
      <template v-if="offer">
        <BaseButton
          variant="secondary"
          :loading="saving === 'keep'"
          :disabled="busy"
          @click="emit('decide', 'keep')"
        >
          Залишити свою
        </BaseButton>
        <BaseButton :loading="saving === 'accept'" :disabled="busy" @click="emit('decide', 'accept')">
          Взяти ціну сайту — {{ formatUsd(offer.amount) }}
        </BaseButton>
      </template>
      <BaseButton v-else variant="secondary" @click="emit('close')">Закрити</BaseButton>
    </template>
  </BaseModal>
</template>

<style lang="scss" scoped>
.domain-card {
  &__headline {
    font-size: $font-size-base;
    font-weight: $font-weight-semibold;
    color: $color-text;
    margin-bottom: $spacing-2;
  }

  &__detail {
    font-size: $font-size-sm;
    line-height: $line-height-normal;
    color: $color-text-secondary;

    & + & {
      margin-top: $spacing-1;
    }
  }

  &__sources {
    display: flex;
    flex-direction: column;
    gap: $spacing-2;
    margin: $spacing-4 0 0;
    padding: $spacing-3 0 0;
    border-top: 1px solid $color-border;
    list-style: none;
  }

  &__source {
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr) auto;
    align-items: baseline;
    gap: $spacing-2;
    font-size: $font-size-sm;
    color: $color-text;
  }

  &__link {
    color: $color-primary;
    text-decoration: underline;
  }

  &__date {
    font-size: $font-size-xs;
    color: $color-text-muted;
  }

  &__error {
    margin-top: $spacing-3;
    font-size: $font-size-xs;
    color: #b91c1c;
  }

  &__recheck {
    margin-top: $spacing-4;
  }
}
</style>
