<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/ui/AppSidebar.vue'
import AppHeader from '@/components/ui/AppHeader.vue'
import ErrorDialog from '@/components/ui/ErrorDialog.vue'

const route = useRoute()

const isLoginPage = computed(() => route.name === 'login')
// The embedded Wizard (WizardWorkspaceView) fills the content area edge-to-edge,
// so the default content padding/scroll is dropped for `/workspace/*` routes.
const isFlushContent = computed(() => route.path.startsWith('/workspace'))
const isSidebarOpen = ref(false)

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

function closeSidebar() {
  isSidebarOpen.value = false
}
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
        <!--
          On the wizard workspace the Admin header is hidden wherever the
          sidebar is permanent (>= $bp-sidebar). The kit draws the wizard
          without it: all 29 screens of `5382:36911` and all four breakpoints
          of `5395:118197` are `Sidebar` + `Wizard` filling the viewport
          height, and the way out of a brand is the cross in the wizard header,
          not a "← Brands" button above it. Keeping it cost 88px of height —
          padding 24 + the 39 back button + 24 + the rule — and 88 of height is
          88 of the RIGHT column, because the kit derives that column from the
          available height. Divergences row 87.

          Below $bp-sidebar the header stays: there the sidebar is off-canvas
          and its burger lives in this header, so hiding it would make the
          sidebar unreachable. 1280 is also the narrowest size the designer
          drew, so nothing below it is specified anyway.
        -->
        <AppHeader
          :class="{ 'app-header--wizard-workspace': isFlushContent }"
          @toggle-sidebar="toggleSidebar"
        />
        <main class="app-layout__content" :class="{ 'app-layout__content--flush': isFlushContent }">
          <RouterView />
        </main>
      </div>
    </div>
  </template>

  <ErrorDialog />
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

    @include sidebar-collapsed {
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
      @include sidebar-collapsed {
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

    // Edge-to-edge mode for the embedded Wizard iframe: no padding, no scroll
    // (the iframe manages its own scaling/scrolling and fills the area).
    &--flush {
      padding: 0;
      overflow: hidden;

      @include mobile {
        padding: 0;
      }
    }
  }
}
</style>
