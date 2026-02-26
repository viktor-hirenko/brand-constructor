<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppSidebar from '@/components/ui/AppSidebar.vue'
import AppHeader from '@/components/ui/AppHeader.vue'

const route = useRoute()
const authStore = useAuthStore()

const isLoginPage = computed(() => route.name === 'login')
const isSidebarOpen = ref(false)

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

function closeSidebar() {
  isSidebarOpen.value = false
}

onMounted(async () => {
  if (import.meta.env.VITE_ENVIRONMENT === 'development') {
    await authStore.fetchCurrentUser()
  }
})
</script>

<template>
  <template v-if="isLoginPage">
    <RouterView />
  </template>

  <template v-else>
    <div
      class="app-layout"
      :class="{ 'app-layout--sidebar-open': isSidebarOpen }"
    >
      <div class="app-layout__overlay" @click="closeSidebar" />
      <AppSidebar :is-open="isSidebarOpen" @close="closeSidebar" />
      <div class="app-layout__main">
        <AppHeader @toggle-sidebar="toggleSidebar" />
        <main class="app-layout__content">
          <RouterView />
        </main>
      </div>
    </div>
  </template>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;
@use '@/styles/variables' as *;

.app-layout {
  display: flex;
  height: 100svh;
  overflow: hidden;
  background-color: $color-bg;

  &__overlay {
    display: none;

    @include mobile-tablet {
      display: block;
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: $z-sidebar - 1;
      opacity: 0;
      pointer-events: none;
      transition: opacity $transition-base;
    }
  }

  &--sidebar-open {
    .app-layout__overlay {
      @include mobile-tablet {
        opacity: 1;
        pointer-events: auto;
      }
    }
  }

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  &__content {
    flex: 1;
    padding: $spacing-6;
    overflow-y: auto;

    @include mobile {
      padding: $spacing-4;
    }
  }
}
</style>
