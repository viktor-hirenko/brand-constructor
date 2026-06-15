<script setup lang="ts">
import { computed } from 'vue'
import type { LayoutMode } from './dualPaneLayoutClasses'
import {
  SHELL_BASE_CLASS,
  leftContentPaddingClass,
  leftPanelBgClass,
  leftPanelWidthClass,
  rightPaneClass,
} from './dualPaneLayoutClasses'

interface ConstructorDualPaneShellProps {
  layoutMode: LayoutMode
  fullWidth?: boolean
  showRight?: boolean
  scale?: number
  reviewShell?: boolean
  wizardStep?: number
}

const props = withDefaults(defineProps<ConstructorDualPaneShellProps>(), {
  fullWidth: false,
  showRight: true,
  scale: 1,
  reviewShell: false,
  wizardStep: 1,
})

const shellStyle = computed(() => ({
  transform: `scale(${props.scale})`,
  transformOrigin: 'center center',
}))

const leftColumnClass = computed(() => [
  'constructor-dual-pane-shell__left flex flex-col min-h-0',
  leftPanelWidthClass(props.fullWidth),
  leftPanelBgClass(props.reviewShell),
])

const leftContentClass = computed(() =>
  leftContentPaddingClass(props.layoutMode, {
    reviewShell: props.reviewShell,
    wizardStep: props.wizardStep,
  })
)

const leftRouterClass = computed(() => {
  const isFixedHeightRouter =
    props.reviewShell ||
    props.layoutMode === 'edit' ||
    (props.layoutMode === 'wizard' && props.wizardStep === 8)

  if (isFixedHeightRouter) {
    return 'flex-1 min-h-0 flex flex-col overflow-hidden'
  }

  // Compensate reduced scroll-container pr-3 so content keeps 48px inset from column edge.
  if (props.layoutMode === 'wizard') {
    return 'constructor-dual-pane-shell__scroll-inner pr-9'
  }

  return ''
})

const rightColumnClass = computed(() =>
  rightPaneClass(props.layoutMode, { wizardStep: props.wizardStep })
)

const showRightColumn = computed(() => props.showRight && !props.fullWidth)
</script>

<template>
  <div class="constructor-dual-pane-shell" :class="SHELL_BASE_CLASS" :style="shellStyle">
    <div :class="leftColumnClass">
      <div :class="leftContentClass">
        <slot name="left-header" />
        <div class="constructor-dual-pane-shell__router-view" :class="leftRouterClass">
          <slot />
        </div>
      </div>
      <slot name="left-footer" />
    </div>

    <div v-if="showRightColumn" :class="rightColumnClass">
      <slot name="right" />
    </div>

    <slot name="overlays" />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.constructor-dual-pane-shell__main-content {
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgb(0 0 0 / 0.12) transparent;

  @include custom-scrollbar;

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgb(0 0 0 / 0.12);

    &:hover {
      background: rgb(0 0 0 / 0.2);
    }
  }
}
</style>
