<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppSidebar from '@/components/ui/AppSidebar.vue'
import AppHeader from '@/components/ui/AppHeader.vue'

const route = useRoute()
const authStore = useAuthStore()

const isLoginPage = computed(() => route.name === 'login')

onMounted(async () => {
  // In development mode, fetch user from API (dev bypass handles auth)
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
    <div class="app-layout">
      <AppSidebar />
      <div class="app-layout__main">
        <AppHeader />
        <main class="app-layout__content">
          <RouterView />
        </main>
      </div>
    </div>
  </template>
</template>

<style lang="scss" scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background-color: $color-bg;

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__content {
    flex: 1;
    padding: $spacing-6;
    overflow-y: auto;
  }
}
</style>
