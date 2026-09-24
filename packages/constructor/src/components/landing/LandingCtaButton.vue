<script setup lang="ts">
import { computed } from 'vue'
import { resolveUiButtonClasses } from '@/components/ui/uiButton'

/**
 * The SPLIT half of the step-0 call to action. The plain one is `UiButton`
 * itself — kit `Button` Primary L-48, drawn on `Brand Creation (step 0)`
 * `5409:35125` as the instance `5409:35672`: 196 × 48, `p-12`, `radius/button`
 * 8, `button/primary/bg/default` #030213, label `body/medium` 16/24 white and a
 * 24 `Sparkle` in the right icon slot.
 *
 * The split form is ours and the kit does not draw it: a Product Owner with
 * unfinished drafts can either start a new brief or reopen one, and that second
 * door is a toggle welded to the button's right edge. Everything it adds is a
 * corner radius and a hairline — the surface, the height, the radius and the
 * type all come from `resolveUiButtonClasses`, so there is one recipe in the
 * tree rather than two.
 *
 * Before this work this file WAS the second recipe: radius 14, a two-layer
 * shadow, `px-8 py-4` and 18/24 at −0.44, none of which is in any kit section.
 */
interface LandingCtaButtonProps {
  disabled?: boolean
  /** `main` carries the label, `toggle` the chevron that opens the draft list. */
  half: 'main' | 'toggle'
  /** Menu open: square bottom corners so the panel attaches flush. */
  menuOpen?: boolean
  /** Looks active but does not accept clicks (header state). */
  passive?: boolean
}

const props = withDefaults(defineProps<LandingCtaButtonProps>(), {
  disabled: false,
  menuOpen: false,
  passive: false,
})

/** Kit Primary L-48 — height, padding, radius, colour and type, all from there. */
const kit = resolveUiButtonClasses({ variant: 'primary', size: 'L' })

const buttonClass = computed(() => {
  const interactive = props.passive ? 'cursor-default pointer-events-none' : 'cursor-pointer'
  const menuOpenClass = props.menuOpen ? 'landing-cta-btn--menu-open' : ''
  const base = `landing-cta-btn ${kit.root} ${menuOpenClass} ${interactive}`

  if (props.half === 'toggle') {
    // `p-3` plus a 24 glyph is 48 across as well as tall, so the toggle is the
    // button's own square and has no width of its own to invent.
    const bottom = props.menuOpen ? 'rounded-br-none' : ''
    return `${base} w-12 shrink-0 rounded-l-none border-l border-white/20 ${bottom}`
  }

  // Welded to the toggle: the right pair of corners belongs to that half.
  const bottom = props.menuOpen ? 'rounded-bl-none' : ''
  return `${base} rounded-r-none ${bottom}`
})
</script>

<template>
  <button
    type="button"
    :class="buttonClass"
    :disabled="disabled && !passive"
    :aria-disabled="passive ? true : undefined"
  >
    <!-- `px-2` on the label half is the kit's 8 between a label and an icon
         slot; the toggle half is a bare glyph box, like the kit's own. -->
    <span :class="half === 'toggle' ? 'inline-flex shrink-0 items-center justify-center' : kit.label">
      <slot :icon-class="kit.icon" />
    </span>
  </button>
</template>

<style scoped>
.landing-cta-btn {
  transition:
    background-color 200ms ease-out,
    border-radius var(--draft-corner-round-duration) var(--draft-motion-ease-close);
}

.landing-cta-btn--menu-open {
  transition:
    background-color 200ms ease-out,
    border-radius 0ms linear;
}

@media (prefers-reduced-motion: reduce) {
  .landing-cta-btn,
  .landing-cta-btn--menu-open {
    transition: none;
  }
}
</style>
