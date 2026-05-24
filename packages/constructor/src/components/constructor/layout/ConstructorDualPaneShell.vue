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

const leftRouterClass = computed(() =>
  props.reviewShell || (props.layoutMode === 'wizard' && props.wizardStep === 8)
    ? 'flex-1 min-h-0 flex flex-col overflow-hidden'
    : ''
)

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
