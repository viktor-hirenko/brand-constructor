<script setup lang="ts">
import { computed } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { parsePurchasePrice, type DomainMode } from '@/utils/namingDomainStatus'

/**
 * Domain availability in the create and edit modals: the registrar decides
 * (Automatic), or the team marks a taken domain the owner sells and enters
 * what it costs (docs/architecture/domain-status-plan.md). Replaces «Override
 * auto-check» with its manual Unknown / Available / Sold.
 */
const props = defineProps<{
  /** Radio group name — unique per modal. */
  name: string
  /** Edit of a row that is For sale now: Automatic rechecks on save. */
  wasForSale?: boolean
}>()

const mode = defineModel<DomainMode>('mode', { required: true })
const purchasePrice = defineModel<string>('purchasePrice', { required: true })

const priceError = computed(() =>
  mode.value === 'for_sale' && purchasePrice.value.trim() !== '' && parsePurchasePrice(purchasePrice.value) === null
    ? 'Ціна має бути додатним числом, наприклад 2685'
    : ''
)

const automaticHint = computed(() =>
  props.wasForSale
    ? 'Статус буде оновлено одразу після збереження.'
    : 'Статус визначається автоматично та оновлюється щодня.'
)
</script>

<template>
  <div class="naming-domain-mode">
    <span class="naming-domain-mode__label">Статус домену</span>
    <label class="naming-domain-mode__option">
      <input v-model="mode" type="radio" :name="name" value="automatic" class="naming-domain-mode__radio" />
      <span>
        <span class="naming-domain-mode__title">Автоматично</span>
        <span class="naming-domain-mode__hint">{{ automaticHint }}</span>
      </span>
    </label>
    <label class="naming-domain-mode__option">
      <input v-model="mode" type="radio" :name="name" value="for_sale" class="naming-domain-mode__radio" />
      <span>
        <span class="naming-domain-mode__title">Продається власником (For sale)</span>
        <span class="naming-domain-mode__hint">Статус і ціна викупу задаються вручну та не оновлюються автоматично.</span>
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
