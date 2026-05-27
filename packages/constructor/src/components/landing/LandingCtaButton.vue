<script setup lang="ts">
import { computed } from 'vue'

interface LandingCtaButtonProps {
  disabled?: boolean
  variant?: 'default' | 'split-main' | 'split-toggle'
  /** Menu open: square bottom corners so the panel attaches flush. */
  menuOpen?: boolean
  /** Looks active but does not accept clicks (header state). */
  passive?: boolean
}

const props = withDefaults(defineProps<LandingCtaButtonProps>(), {
  disabled: false,
  variant: 'default',
  menuOpen: false,
  passive: false,
})

const LANDING_CTA_BASE =
  'landing-cta-btn inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-[14px] shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)] text-lg font-medium tracking-[-0.44px] border-0'

const buttonClass = computed(() => {
  const interactive = props.passive
    ? 'cursor-default pointer-events-none'
    : 'cursor-pointer hover:shadow-[0px_15px_25px_rgba(0,0,0,0.15),0px_6px_10px_rgba(0,0,0,0.1)] disabled:opacity-60 disabled:cursor-not-allowed'

  const menuOpenClass = props.menuOpen ? 'landing-cta-btn--menu-open' : ''

  if (props.variant === 'split-main') {
    const bottom = props.menuOpen ? 'rounded-bl-none' : ''
    return `${LANDING_CTA_BASE} ${menuOpenClass} ${interactive} gap-2 rounded-r-none pl-8 pr-4 min-w-[236px] whitespace-nowrap ${bottom}`
  }
  if (props.variant === 'split-toggle') {
    const bottom = props.menuOpen ? 'rounded-br-none' : ''
    return `${LANDING_CTA_BASE} ${menuOpenClass} ${interactive} shrink-0 w-[2.75rem] justify-center px-0 rounded-l-none border-l border-white/20 ${bottom}`
  }
  return `${LANDING_CTA_BASE} ${interactive}`
})
</script>

<template>
  <button
    type="button"
    :class="buttonClass"
    :disabled="disabled && !passive"
    :aria-disabled="passive ? true : undefined"
  >
    <slot />
  </button>
</template>

<style scoped>
.landing-cta-btn {
  transition:
    box-shadow 200ms ease-out,
    border-radius var(--draft-corner-round-duration) var(--draft-motion-ease-close);
}

.landing-cta-btn--menu-open {
  transition:
    box-shadow 200ms ease-out,
    border-radius 0ms linear;
}

@media (prefers-reduced-motion: reduce) {
  .landing-cta-btn,
  .landing-cta-btn--menu-open {
    transition: none;
  }
}
</style>
