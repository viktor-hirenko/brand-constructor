<script setup lang="ts">
import { computed } from 'vue'
import type { NamingPriceSourceReading } from '@brand-constructor/shared'
import BaseInput from '@/components/ui/BaseInput.vue'
import NamingSitePrices from '@/components/namings/NamingSitePrices.vue'
import { parsePurchasePrice, type DomainMode } from '@/utils/namingDomainStatus'
import type { DomainCard } from '@/utils/namingPriceCheck'

/**
 * Domain status and price in the create and edit modals. The system decides
 * both — free, taken, or for sale by its owner at the marketplace's price
 * (docs/architecture/domain-price-sync-plan.md) — and a person only says when
 * the price is their own: a domain sold elsewhere, or a price agreed with the
 * seller. One question, where there used to be a status to pick by hand.
 */
defineProps<{
  /** Radio group name — unique per modal. */
  name: string
  /** Edit: what the system knows of the saved domain, shown above the choice. */
  found?: DomainCard | null
  /** The domain in the field: the three marketplaces' prices for it stand above the choice. */
  domain?: string
  /** Edit: the domain as saved and what the last check read about it. */
  savedDomain?: string | null
  savedSources?: NamingPriceSourceReading[] | null
  /** The registrar says the domain is free. */
  free?: boolean
}>()

const mode = defineModel<DomainMode>('mode', { required: true })
const purchasePrice = defineModel<string>('purchasePrice', { required: true })

const priceError = computed(() =>
  mode.value === 'for_sale' && purchasePrice.value.trim() !== '' && parsePurchasePrice(purchasePrice.value) === null
    ? 'Ціна має бути додатним числом, наприклад 2685'
    : ''
)
</script>

<template>
  <div class="naming-domain-mode">
    <span class="naming-domain-mode__label">Статус і ціна домену</span>
    <p v-if="found" class="naming-domain-mode__found">
      <strong>{{ found.headline }}</strong>
      <span v-for="line in found.details" :key="line">{{ line }}</span>
    </p>
    <NamingSitePrices
      v-if="domain !== undefined"
      :domain="domain"
      :automatic="mode === 'automatic'"
      :saved-domain="savedDomain"
      :saved-sources="savedSources"
      :free="free"
    />
    <label class="naming-domain-mode__option">
      <input v-model="mode" type="radio" :name="name" value="automatic" class="naming-domain-mode__radio" />
      <span>
        <span class="naming-domain-mode__title">Автоматично</span>
        <span class="naming-domain-mode__hint">
          Статус і ціна визначаються автоматично: домен вільний, зайнятий або продається власником.
          Перевіряється щодня.
        </span>
      </span>
    </label>
    <label class="naming-domain-mode__option">
      <input v-model="mode" type="radio" :name="name" value="for_sale" class="naming-domain-mode__radio" />
      <span>
        <span class="naming-domain-mode__title">Своя ціна викупу (For sale)</span>
        <span class="naming-domain-mode__hint">
          Для домену, що продається на іншому сайті або за домовленою ціною. Автоматично не змінюється.
        </span>
      </span>
    </label>
    <BaseInput
      v-if="mode === 'for_sale'"
      v-model="purchasePrice"
      class="naming-domain-mode__price"
      label="Ціна викупу, USD"
      placeholder="Наприклад, 2685"
      required
      :error="priceError"
    />
  </div>
</template>

<style lang="scss" scoped>
.naming-domain-mode__found {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: $spacing-2 $spacing-3;
  border-radius: $radius-md;
  background-color: $color-primary-light;
  font-size: $font-size-xs;
  line-height: $line-height-normal;
  color: $color-text-secondary;

  strong {
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: $color-text;
  }
}

.naming-domain-mode {
  display: flex;
  flex-direction: column;
  gap: $spacing-2;

  &__label {
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: $color-text;
  }

  &__option {
    display: flex;
    align-items: flex-start;
    gap: $spacing-2;
    font-size: $font-size-sm;
    color: $color-text;
    cursor: pointer;
  }

  &__radio {
    width: 16px;
    height: 16px;
    margin: 2px 0 0;
    flex-shrink: 0;
    cursor: pointer;
  }

  &__title {
    display: block;
  }

  &__hint {
    display: block;
    font-size: $font-size-xs;
    color: $color-text-muted;
    line-height: $line-height-normal;
  }

  &__price {
    margin-left: calc(16px + #{$spacing-2});
  }
}
</style>
