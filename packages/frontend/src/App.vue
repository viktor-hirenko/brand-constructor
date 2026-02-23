<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import AppSidebar from '@/components/ui/AppSidebar.vue';
import AppHeader from '@/components/ui/AppHeader.vue';

const authStore = useAuthStore();

onMounted(async () => {
  await authStore.fetchCurrentUser();
});
</script>

<template>
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
