<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppSidebar from '@/components/ui/AppSidebar.vue'
import AppHeader from '@/components/ui/AppHeader.vue'

const route = useRoute()
const authStore = useAuthStore()

const isLoginPage = computed(() => route.name === 'login')
const isSidebarOpen = ref(false)
const isLandscapeMobile = ref(false)

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

function closeSidebar() {
  isSidebarOpen.value = false
}

function checkLandscapeMobile() {
  isLandscapeMobile.value = window.innerHeight < 500 && window.innerWidth > window.innerHeight
}

onMounted(async () => {
  if (import.meta.env.VITE_ENVIRONMENT === 'development') {
    await authStore.fetchCurrentUser()
  }

  checkLandscapeMobile()
  window.addEventListener('resize', checkLandscapeMobile)
  window.addEventListener('orientationchange', checkLandscapeMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkLandscapeMobile)
  window.removeEventListener('orientationchange', checkLandscapeMobile)
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

    <div v-if="isLandscapeMobile" class="landscape-warning">
      <div class="landscape-warning__content">
        <span class="landscape-warning__icon">📱</span>
        <p class="landscape-warning__text">
          Поверніть пристрій у вертикальну орієнтацію
        </p>
      </div>
    </div>
  </template>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;
@use '@/styles/variables' as *;

.app-layout {
  display: flex;
  height: 100vh;
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

.landscape-warning {
  position: fixed;
  inset: 0;
  background-color: $color-bg-sidebar;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;

  &__content {
    text-align: center;
    padding: $spacing-6;
  }

  &__icon {
    display: block;
    font-size: 3rem;
    margin-bottom: $spacing-4;
    animation: rotate-phone 2s ease-in-out infinite;
  }

  &__text {
    color: $color-text-inverse;
    font-size: $font-size-lg;
    font-weight: $font-weight-medium;
  }
}

@keyframes rotate-phone {
  0%, 100% { transform: rotate(0deg); }
  30%       { transform: rotate(-90deg); }
  70%       { transform: rotate(-90deg); }
}
</style>
