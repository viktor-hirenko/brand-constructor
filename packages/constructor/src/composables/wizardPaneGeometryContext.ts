import type { ComputedRef, InjectionKey } from 'vue'
import type { WizardPaneGeometry } from '@/constants/wizardResponsive'

/**
 * The measured pane geometry, handed down from `ConstructorDualPaneShell`.
 *
 * The square preview is the one thing the kit resizes with the viewport
 * (`5395:118197`), and the shell is the only place that can measure it — the
 * width of the right column is derived from the row's height, so the number
 * exists nowhere else. Anything that has to live inside that square needs it:
 * today the phone previews on step 7 and on the step-8 review, which are drawn
 * at a fixed design size and have to shrink to fit rather than be cropped
 * (bullet five of the designer's sticker `5395:118367`).
 *
 * `undefined` where the shell is not an ancestor — Storybook stories and the
 * skeletons render standalone. Callers fall back to the design size.
 */
export const WIZARD_PANE_GEOMETRY_KEY: InjectionKey<ComputedRef<WizardPaneGeometry>> =
  Symbol('wizardPaneGeometry')
