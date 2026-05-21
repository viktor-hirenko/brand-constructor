<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
const isProductionMode = import.meta.env.VITE_ENVIRONMENT === 'production'

interface NavItem {
  label: string
  path: string
  icon: string
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { label: 'Brands', path: '/brands', icon: '&#9830;' },
  { label: 'Concepts', path: '/concepts', icon: '&#9672;' },
  { label: 'Namings', path: '/namings', icon: '&#9998;' },
  { label: 'PR Packages', path: '/pr-packages', icon: '&#9733;' },
  { label: 'UI Components', path: '/components', icon: '&#9638;' },
  { label: 'Users', path: '/users', icon: '&#9823;', adminOnly: true },
]

const visibleItems = computed(() =>
  navItems.filter(item => !item.adminOnly || authStore.isStrictAdmin)
)

function isActive(path: string): boolean {
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
      <button class="sidebar__close" aria-label="Close menu" @click="emit('close')">
        ✕
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
        <span class="sidebar__link-icon" v-html="item.icon" />
        <span class="sidebar__link-label">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="sidebar__footer">
      <div v-if="authStore.user" class="sidebar__user">
        <span class="sidebar__user-name">{{ authStore.user.name }}</span>
        <span class="sidebar__user-role">{{ authStore.user.role }}</span>
        <button v-if="isProductionMode" class="sidebar__logout" @click="handleLogout">
          Sign out
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
  background-color: $color-bg-sidebar;
  color: $color-text-inverse;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;

  @include mobile-tablet {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: $z-sidebar;
    transform: translateX(-100%);
    transition: transform $transition-slow;
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
  }

  &--open {
    @include mobile-tablet {
      transform: translateX(0);
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

    @include mobile-tablet {
      display: block;
    }
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
    gap: $spacing-3;
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

    @include mobile-tablet {
      padding: $spacing-4 $spacing-6;
      font-size: $font-size-base;
    }
  }

  &__link-icon {
    font-size: $font-size-lg;
    width: 24px;
    text-align: center;
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

  &__user-role {
    font-size: $font-size-xs;
    color: $color-text-muted;
    text-transform: capitalize;
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
