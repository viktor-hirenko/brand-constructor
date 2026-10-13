<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import clipboardText from '@phosphor-icons/core/regular/clipboard-text.svg?raw'
import lightbulb from '@phosphor-icons/core/regular/lightbulb.svg?raw'
import megaphone from '@phosphor-icons/core/regular/megaphone.svg?raw'
import squaresFour from '@phosphor-icons/core/regular/squares-four.svg?raw'
import tag from '@phosphor-icons/core/regular/tag.svg?raw'
import textAa from '@phosphor-icons/core/regular/text-aa.svg?raw'
import users from '@phosphor-icons/core/regular/users.svg?raw'
import close from '@phosphor-icons/core/regular/x.svg?raw'
import PhosphorIcon from '@/components/ui/PhosphorIcon.vue'
import { LIBRARY_TAB_ROLES, ORDER_ROLES, ROLE_LABELS, isOrderRole } from '@brand-constructor/shared'
import type { OrderListResponse } from '@brand-constructor/shared'
import { useAuthStore } from '@/stores/auth'
import { apiGet } from '@/composables/useApi'
import { useListPolling } from '@/composables/useListPolling'

interface Props {
  isOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
})

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
// The stage is a deployed copy too: it signs out like production and wears a
// plate so it is never mistaken for production.
const isStage = import.meta.env.VITE_ENVIRONMENT === 'stage'
const isProductionMode = import.meta.env.VITE_ENVIRONMENT === 'production' || isStage

interface NavItem {
  label: string
  path: string
  /** A Phosphor SVG file, as text. */
  icon: string
  adminOnly?: boolean
  /** Only these roles see the item; the router refuses the page to the rest. */
  roles?: readonly string[]
  /** Shows the number of open orders beside the label. */
  counter?: 'openOrders'
}

// Glyphs — DP-15859, the designer's mapping table `5658:39246`, "Admin sidebar"
// rows, all weight Regular. `Users` has no row there and is not drawn on any
// screen (the mock-ups show a product owner's menu); the owner chose Phosphor
// `Users` for it. `Orders` (brief-orders plan, phase 2a) has no row either;
// the plan names Phosphor `ClipboardText`.
const navItems: NavItem[] = [
  { label: 'Бренди', path: '/brands', icon: tag },
  { label: 'Замовлення', path: '/orders', icon: clipboardText, roles: ORDER_ROLES, counter: 'openOrders' },
  { label: 'Концепти', path: '/concepts', icon: lightbulb, roles: LIBRARY_TAB_ROLES },
  { label: 'Неймінги', path: '/namings', icon: textAa, roles: LIBRARY_TAB_ROLES },
  { label: 'PR-пакети', path: '/pr-packages', icon: megaphone, roles: LIBRARY_TAB_ROLES },
  { label: 'UI-компоненти', path: '/components', icon: squaresFour, roles: LIBRARY_TAB_ROLES },
  { label: 'Користувачі', path: '/users', icon: users, adminOnly: true },
]

const visibleItems = computed(() =>
  navItems.filter(
    item =>
      (!item.adminOnly || authStore.isStrictAdmin) &&
      (!item.roles || item.roles.includes(authStore.user?.role ?? ''))
  )
)

// Open orders: on every page change and with the lists' background refresh, so
// «Готово» or a new order shows without a reload.
const openOrders = ref(0)

async function refreshOpenOrders() {
  if (!isOrderRole(authStore.user?.role ?? '')) return
  try {
    const res = await apiGet<OrderListResponse>('/api/orders?tab=open')
    openOrders.value = res.counts.open
  } catch {
    // The menu stays usable without the number.
  }
}

onMounted(refreshOpenOrders)
watch(() => route.fullPath, refreshOpenOrders)
useListPolling(refreshOpenOrders)

function isActive(path: string): boolean {
  // The embedded Wizard lives under `/workspace/*` but is opened from Brands,
  // so keep the Brands item highlighted while the Wizard tab is active.
  if (path === '/brands') {
    return route.path.startsWith('/brands') || route.path.startsWith('/workspace')
  }
  return route.path.startsWith(path)
}

function handleNavClick() {
  emit('close')
}

async function handleLogout() {
  // Await the store mutation before navigating. Combined with the
  // store-side ordering (clear user/csrfToken before the network call),
  // this guarantees the beforeEach guard sees `isAuthenticated === false`
  // and does not bounce the redirect back into the app.
  await authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <aside class="sidebar" :class="{ 'sidebar--open': props.isOpen }">
    <div class="sidebar__header">
      <span class="sidebar__logo-text">BC Admin</span>
      <span v-if="isStage" class="sidebar__stage">Stage</span>
      <button class="sidebar__close" aria-label="Закрити меню" @click="emit('close')">
        <PhosphorIcon :svg="close" class="sidebar__close-icon" />
      </button>
    </div>

    <nav class="sidebar__nav">
      <RouterLink
        v-for="item in visibleItems"
        :key="item.path"
        :to="item.path"
        class="sidebar__link"
        :class="{ 'sidebar__link--active': isActive(item.path) }"
        @click="handleNavClick"
      >
        <PhosphorIcon :svg="item.icon" class="sidebar__link-icon" />
        <span class="sidebar__link-label">{{ item.label }}</span>
        <span
          v-if="item.counter === 'openOrders' && openOrders > 0"
          class="sidebar__link-counter"
          :aria-label="`Відкритих замовлень: ${openOrders}`"
          >{{ openOrders }}</span
        >
      </RouterLink>
    </nav>

    <div class="sidebar__footer">
      <div v-if="authStore.user" class="sidebar__user">
        <span class="sidebar__user-name">{{ authStore.user.name }}</span>
        <span class="sidebar__user-email" :title="authStore.user.email">{{ authStore.user.email }}</span>
        <span class="sidebar__user-role">{{ ROLE_LABELS[authStore.user.role] ?? authStore.user.role }}</span>
        <button v-if="isProductionMode" class="sidebar__logout" @click="handleLogout">
          Вийти
        </button>
      </div>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;
@use '@/styles/variables' as *;

.sidebar {
  width: $sidebar-width;
  height: 100svh;

  // Kit `5395:119181` / `5395:119534`: the sidebar widens at 1920 and stays
  // there. Everything else about it is unchanged on all four frames.
  @include mq($bp-sidebar-wide) {
    width: $sidebar-width-wide;
  }

  background-color: $color-bg-sidebar;
  color: $color-text-inverse;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;

  @include sidebar-collapsed {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: $z-sidebar;
    transform: translateX(-100%);
    // The shadow is the open menu's. Carried while the menu stood beyond the
    // edge, it reached back onto the screen as a grey strip along the left of
    // every page on a phone and a tablet.
    transition: transform $transition-slow, box-shadow $transition-slow;
  }

  &--open {
    @include sidebar-collapsed {
      transform: translateX(0);
      box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
    }
  }

  &__header {
    padding: $spacing-6;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__logo-text {
    font-size: $font-size-lg;
    font-weight: $font-weight-bold;
  }

  &__stage {
    margin-right: auto;
    margin-left: $spacing-2;
    padding: 2px $spacing-2;
    border-radius: 999px;
    background: $color-warning;
    color: #1f1300;
    font-size: $font-size-xs;
    font-weight: $font-weight-bold;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  &__close {
    display: none;
    background: none;
    border: none;
    color: $color-text-muted;
    font-size: $font-size-lg;
    cursor: pointer;
    padding: $spacing-1;
    line-height: 1;
    transition: color $transition-fast;

    &:hover {
      color: $color-text-inverse;
    }

    @include sidebar-collapsed {
      display: block;
    }
  }

  // DP-15859: "Close → X, Regular" (`5658:39246`). The collapsed menu has no
  // mock-up, so the glyph keeps the size the `✕` character had: one em.
  &__close-icon {
    display: block;
    width: 1em;
    height: 1em;
  }

  &__nav {
    flex: 1;
    padding: $spacing-4 0;
    display: flex;
    flex-direction: column;
    gap: $spacing-1;
  }

  &__link {
    display: flex;
    align-items: center;
    // Sidebar `5382:30672`: label 8 after the 20 glyph, i.e. at 52.
    gap: $spacing-2;
    padding: $spacing-3 $spacing-6;
    color: $color-text-muted;
    text-decoration: none;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    transition: all $transition-fast;

    &:hover {
      color: $color-text-inverse;
      background-color: $color-bg-sidebar-hover;
    }

    &--active {
      color: $color-text-inverse;
      background-color: $color-bg-sidebar-active;
    }

    @include sidebar-collapsed {
      padding: $spacing-4 $spacing-6;
      font-size: $font-size-base;
    }
  }

  // Open orders beside «Orders». No mock-up: a small pill in the active-item
  // colour, pushed to the row's end.
  &__link-counter {
    margin-left: auto;
    min-width: 20px;
    padding: 0 $spacing-2;
    border-radius: $radius-full;
    background-color: $color-bg-sidebar-active;
    color: $color-text-inverse;
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    line-height: 20px;
    text-align: center;
  }

  // On the active row the pill would vanish into the same colour.
  &__link--active &__link-counter {
    background-color: $color-text-inverse;
    color: $color-bg-sidebar-active;
  }

  // Sidebar `5382:30672`: glyph 20, painted in the label's colour.
  &__link-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }

  &__footer {
    padding: $spacing-4 $spacing-6;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  &__user {
    display: flex;
    flex-direction: column;
    gap: $spacing-1;
  }

  &__user-name {
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
  }

  &__user-email {
    display: block;
    min-width: 0;
    font-size: $font-size-xs;
    color: $color-text-muted;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__user-role {
    font-size: $font-size-xs;
    color: $color-text-muted;
  }

  &__logout {
    margin-top: $spacing-2;
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: $radius-md;
    color: $color-text-muted;
    font-size: $font-size-xs;
    padding: $spacing-1 $spacing-3;
    cursor: pointer;
    width: 100%;
    text-align: center;
    transition: all $transition-fast;

    &:hover {
      border-color: rgba(255, 255, 255, 0.4);
      color: $color-text-inverse;
    }
  }
}
</style>
