<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const emit = defineEmits<{
  'toggle-sidebar': []
}>()

const route = useRoute()

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    brands: 'Бренди',
    orders: 'Замовлення',
    'order-detail': 'Замовлення',
    concepts: 'Бібліотека концептів',
    'concept-detail': 'Концепт',
    namings: 'Бібліотека неймінгів',
    'pr-packages': 'PR-пакети',
    'component-variants': 'Варіанти компонента',
    components: 'Бібліотека UI-компонентів',
    users: 'Користувачі',
    'workspace-brand': 'Бриф бренду',
    'workspace-new': 'Новий бренд',
  }
  return titles[route.name as string] || 'Brand Constructor'
})

/*
 * There was a "← Brands" button here on the wizard routes, and it is gone —
 * DP-15450, the owner's call.
 *
 * It only ever showed BELOW `$bp-sidebar` (1280): from 1280 up, `App.vue`
 * hides this whole bar on the wizard workspace, because the kit draws no bar
 * above the wizard at all. So the button was a leftover of the one place the
 * designer never drew, and in that place it duplicated two controls that are
 * both on screen: the wizard's own × in its header and the burger beside it.
 * It was also drawn with an HTML arrow entity rather than a glyph from the
 * icon set, which is the reason the same button was taken out above 1280.
 *
 * The burger stays. Below 1280 the sidebar is off-canvas and this is the only
 * thing that opens it.
 */
</script>

<template>
  <header class="app-header">
    <button class="app-header__burger" aria-label="Відкрити меню" @click="emit('toggle-sidebar')">
      <span class="app-header__burger-line" />
      <span class="app-header__burger-line" />
      <span class="app-header__burger-line" />
    </button>
    <h1 class="app-header__title">{{ pageTitle }}</h1>
  </header>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;
@use '@/styles/variables' as *;

.app-header {
  padding: $spacing-6;
  background-color: $color-bg-white;
  border-bottom: 1px solid $color-border;
  display: flex;
  align-items: center;
  gap: $spacing-4;

  @include mobile {
    padding: $spacing-4;
  }

  // See the comment at the call site in `App.vue`: the wizard workspace drops
  // this bar wherever the sidebar is permanent, because the kit draws no bar
  // above the wizard and its 88px come straight out of the right column.
  &--wizard-workspace {
    @include mq($bp-sidebar) {
      display: none;
    }
  }

  &__burger {
    display: none;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    background: none;
    border: none;
    cursor: pointer;
    padding: $spacing-1;
    flex-shrink: 0;

    @include sidebar-collapsed {
      display: flex;
    }
  }

  &__burger-line {
    display: block;
    width: 22px;
    height: 2px;
    background-color: $color-text;
    border-radius: 2px;
    transition: background-color $transition-fast;
  }

  &__title {
    font-size: $font-size-2xl;
    font-weight: $font-weight-bold;
    color: $color-text;

    @include mobile {
      font-size: $font-size-xl;
    }
  }
}
</style>
