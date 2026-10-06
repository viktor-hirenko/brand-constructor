import type { InjectionKey, Ref } from 'vue'
import { inject } from 'vue'

/**
 * How many times the person pressed the greyed-out «Далі» on the current step.
 *
 * A disabled button gets no `click`, so the step behind it never learned that
 * the person tried to go on — on step 1 the hints «Оберіть хоча б одну ГЕО» /
 * «Вкажіть дату запуску» stayed hidden and the grey button explained nothing
 * (H-38, run 02.10: T-004). `BriefShellView` owns the footer: it counts the
 * presses (a `pointerdown` still reaches the footer from a disabled button) and
 * hands the count down; a step that wants to react watches it.
 *
 * `null` where the shell is not an ancestor — Storybook renders steps alone.
 */
export const WIZARD_BLOCKED_NEXT_KEY: InjectionKey<Readonly<Ref<number>>> =
  Symbol('wizardBlockedNext')

export function useWizardBlockedNext(): Readonly<Ref<number>> | null {
  return inject(WIZARD_BLOCKED_NEXT_KEY, null)
}
