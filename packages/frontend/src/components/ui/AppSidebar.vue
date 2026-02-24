<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
  { label: 'Concepts', path: '/concepts', icon: '&#9672;' },
  { label: 'Namings', path: '/namings', icon: '&#9998;' },
  { label: 'PR Packages', path: '/pr-packages', icon: '&#9733;' },
  { label: 'UI Components', path: '/components', icon: '&#9638;' },
  { label: 'Users', path: '/users', icon: '&#9823;', adminOnly: true },
]

const visibleItems = computed(() => navItems.filter(item => !item.adminOnly || authStore.isAdmin))

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}

function handleLogout() {
  authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__logo">
      <span class="sidebar__logo-text">Brand Constructor</span>
    </div>

    <nav class="sidebar__nav">
      <RouterLink
        v-for="item in visibleItems"
        :key="item.path"
        :to="item.path"
        class="sidebar__link"
        :class="{ 'sidebar__link--active': isActive(item.path) }"
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
.sidebar {
  width: $sidebar-width;
  min-height: 100vh;
  background-color: $color-bg-sidebar;
  color: $color-text-inverse;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  &__logo {
    padding: $spacing-6;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  &__logo-text {
    font-size: $font-size-lg;
    font-weight: $font-weight-bold;
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
