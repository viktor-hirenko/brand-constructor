/**
 * Shared Tailwind utility class strings for the BrandBrief shell UI.
 *
 * Central source of truth for buttons and layout rules that are reused across
 * `ConstructorLayout.vue`, `ReviewSubmitView.vue`, and ceo-reselect / po-edit
 * sub-route views. Import the relevant constant instead of copy-pasting the
 * class string — this keeps visual consistency easy to maintain.
 *
 * Naming convention:
 *   `BRIEF_BTN_<VARIANT>_<MODIFIER?>` — button variant classes
 *   `BRIEF_LAYOUT_<AREA>` — layout / shell structural classes
 */

// ─── Buttons ──────────────────────────────────────────────────────────────────

/** Primary action button (brand-colored background). */
export const BRIEF_BTN_PRIMARY =
  'h-[50px] px-6 bg-primary text-primary-foreground rounded-[10px] ' +
  'disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all ' +
  'text-base font-medium'

/** Secondary / ghost button (transparent with hairline border). */
export const BRIEF_BTN_SECONDARY =
  'h-[50px] px-6 border border-black/10 text-foreground rounded-[10px] ' +
  'hover:bg-black/[0.02] transition-all text-base font-medium'

/**
 * Dark-filled primary button (used in "Return to review" footer action and
 * similar high-contrast CTA slots).
 */
export const BRIEF_BTN_PRIMARY_DARK =
  'h-[50px] px-6 bg-[#030213] text-white rounded-[10px] ' +
  'hover:opacity-90 transition-all text-base font-medium flex items-center gap-2'

// ─── Footer wrapper ───────────────────────────────────────────────────────────

/** Wrapper for the wizard step footer bar. */
export const BRIEF_FOOTER_BAR =
  'shrink-0 px-12 py-6 border-t border-border'

/** Inline row for footer action buttons. */
export const BRIEF_FOOTER_ACTIONS = 'flex items-center gap-3'
