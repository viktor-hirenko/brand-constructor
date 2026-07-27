/**
 * Shared Tailwind utility class strings for the BrandBrief shell UI.
 *
 * Central source of truth for buttons and layout rules that are reused across
 * `BriefShellView.vue`, `BriefReviewView.vue`, and ceo-reselect / po-edit
 * sub-route views. Import the relevant constant instead of copy-pasting the
 * class string — this keeps visual consistency easy to maintain.
 *
 * Naming convention:
 *   `BRIEF_BTN_<VARIANT>_<MODIFIER?>` — button variant classes
 *   `BRIEF_LAYOUT_<AREA>` — layout / shell structural classes
 */

// rem @ 16px design base — scales with html.wizard-embed root font-size (embed).
// Standalone: 1rem === 16px, values match Figma px exactly.

// ─── Buttons ──────────────────────────────────────────────────────────────────
// Footer / shell buttons: 50px height → 3.125rem, 10px radius → 0.625rem.

/** Primary action button (brand-colored background). 50px × 10px radius @16. */
export const BRIEF_BTN_PRIMARY =
  'h-[3.125rem] px-6 bg-primary text-primary-foreground rounded-[0.625rem] ' +
  'disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all ' +
  'text-base font-medium'

/** Secondary / ghost button (transparent with hairline border). 50px × 10px radius @16. */
export const BRIEF_BTN_SECONDARY =
  'h-[3.125rem] px-6 border border-black/10 text-foreground rounded-[0.625rem] ' +
  'hover:bg-black/[0.02] transition-all text-base font-medium'

/**
 * Dark-filled primary button (used in "Return to review" footer action and
 * similar high-contrast CTA slots). 50px × 10px radius @16.
 */
export const BRIEF_BTN_PRIMARY_DARK =
  'h-[3.125rem] px-6 bg-[#030213] text-white rounded-[0.625rem] ' +
  'hover:opacity-90 transition-all text-base font-medium flex items-center gap-2'

// ─── Footer wrapper ───────────────────────────────────────────────────────────

/** Wrapper for the wizard step footer bar. */
export const BRIEF_FOOTER_BAR =
  'shrink-0 px-12 py-6 border-t border-border'

/** Inline row for footer action buttons. */
export const BRIEF_FOOTER_ACTIONS = 'flex items-center gap-3'
