/**
 * Class map for the kit input family — `UiTextField.vue`, `UiTextarea.vue`,
 * `UiFieldLabel.vue` and `UiFieldHint.vue`.
 *
 * Kit source: Figma section Input `3403:1192`, which holds three frames:
 *   Input       `3424:2287` — State = Default / Hovered / Focused / Filled /
 *                             Error / Disabled  ×  Type = Default / Area
 *   Title       `3424:1050` — Icon 20 + label, the caption ABOVE the box
 *   Description `3424:5408` — Type = Default / Error, the caption BELOW it
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3424-2287&m=dev
 *
 * ── What `get_variable_defs` returns per state (all twelve symbols read)
 *
 *   state      bg                     border                  extra
 *   Default    input/bg/default  #f3f3f5   input/border/default #eaeaeb   placeholder #95959d
 *   Hovered    input/bg/hovered  #eaeaeb   input/border/default #eaeaeb   —
 *   Focused    input/bg/default  #f3f3f5   input/border/focused #cacace   —
 *   Filled     input/bg/default  #f3f3f5   input/border/default #eaeaeb   value #1f1f2e
 *   Error      input/bg/default  #f3f3f5   input/border/error   #f4a9aa   input/error #ce2c31
 *   Disabled   input/bg/default  #f3f3f5   input/border/default #eaeaeb   opacity/50
 *
 * Two of those the plan did not predict and they are the reason this map is a
 * function and not six literals:
 *   - **Hover moves the FILL, not the border.** Every recipe in the tree did
 *     the opposite (`hover:border-black/20`).
 *   - **Disabled is Default under `opacity/50`.** The kit gives it no colour of
 *     its own, exactly like Button and Icon button.
 *
 * Every colour lands on a token: #f3f3f5 → ink-200, #eaeaeb → ink-300 (the
 * value the DP-15258 token fix moved it to), #cacace → ink-500, #95959d →
 * ink-600, #1f1f2e → ink-900, #6f6f7d → ink-700, #f4a9aa → red-border,
 * #ce2c31 → red-content. No raw hex is written here: `uiAlert.ts`, `uiBadge.ts`
 * and `uiIconButton.ts` carried #eaeaeb as a patch until that fix, and the task
 * document forbids re-opening that hole for new components.
 *
 * ── Geometry comes from the usage, not from the matrix
 *
 * The twelve matrix symbols measure the field at 68 (Default) and 96 (Area) —
 * but they draw the optional inner Label, which the real screens switch off.
 * `get_metadata` on the drawn brief-order modal `5562:49171` gives the numbers
 * this file encodes: an Input instance is 512×80 or 512×128, i.e.
 *
 *   Title 24  +  spacing/8  +  field 48        (Type = Default)
 *   Title 24  +  spacing/8  +  field 96        (Type = Area)
 *
 * with the value inset 16 horizontally (12 padding + 4 inside the text frame)
 * and 12 vertically, `radius/input` 8. Seven Input instances there, every one
 * with `Label` and `Description` hidden.
 *
 * ── Why a `.ts` map and not a component test
 *
 * `packages/constructor` has no `@vue/test-utils` and no `jsdom`, and
 * `vitest.config.ts:11` sets `environment: 'node'` — mounting is impossible, so
 * the class decision is a pure function and the markup stays under manual
 * acceptance. Same idiom as `ui/uiButton.ts`, `ui/uiBadge.ts`, `ui/uiLink.ts`.
 *
 * ── Lengths
 *
 * Every length is a rem-based Tailwind utility. The wizard is scaled by the
 * single knob in `app.css` (`html.wizard-embed`), and a `px` box here would
 * silently opt out of it with no test going red — see "Железные правила
 * адаптива" in `docs/design-audit/dp-15258-ui-kit.md`.
 *
 * ── Letter-spacing: a deliberate divergence from open question 7
 *
 * That question's default answer is "keep the current look on вынос screens".
 * It cannot be honoured here: the 21 elements being unified carry THREE
 * different trackings — `-0.1504px` (comments), `-0.31px` (brief-order modals)
 * and none at all (step 1) — so "the current look" is undefined. The kit sets
 * `letterSpacing: 0` on all five type styles, so that is what this map takes,
 * and the report names it as a visible change instead of hiding it.
 */

/** Kit `Type` on the Input matrix, plus the one shape the kit does not draw. */
export type UiFieldType =
  /** Type = Default — a 48-tall single-line box. */
  | 'default'
  /** Type = Area — min 96, grows with content. */
  | 'area'
  /**
   * Ours, not the kit's: a box whose height is driven by what is inside it
   * (the GEO trigger wraps badges). Floors at the kit's 48 and never fixes a
   * height, so a wrapped second row is not clipped.
   */
  | 'fluid'

export interface UiFieldSurfaceOptions {
  type?: UiFieldType
  /** Kit State = Error — swaps `input/border/default` for `input/border/error`. */
  invalid?: boolean
  /** Kit State = Disabled — Default colours under `opacity/50`. */
  disabled?: boolean
  /**
   * Read-only text shown in the field's shape, full colour: no hover fill and
   * no focus border, since nothing on it reacts. The author's view of the CEO
   * general comment (`5387:105225`) — owner 30.09: «зачем на него ховер».
   */
  readonly?: boolean
  /**
   * True when the surface WRAPS the focusable control (a div holding an
   * `<input>`, the GEO trigger) instead of being one (a bare `<select>`).
   * Picks `focus-within:` over `focus:` so the kit's Focused border still
   * appears. Defaults to true — only the raw `<select>` needs it off.
   */
  focusWithin?: boolean
  /**
   * True when the surface is a `<select>`. A select does not honour
   * `display: flex` on itself, so the box keeps its height and inset but drops
   * the flex layout the other carriers use for their icon slots.
   */
  bare?: boolean
  /**
   * Forces kit State = Focused. A trigger that opens a popover has to keep
   * looking focused while the popover is what actually holds the pointer, and
   * `:focus` cannot express that. Passing it as a flag also keeps the decision
   * inside this function — adding `border-ink-500` at the call site would put
   * two `border-color` utilities on one element, and which of them wins is
   * decided by Tailwind's own property order, not by the order they are
   * written in.
   */
  focused?: boolean
}

/**
 * Shared by every carrier of the kit input surface, whatever element it is:
 * `box-border` so the 1px border lives INSIDE the kit's 48 (phase 1 learned
 * this the hard way — "Назад" shipped 50px tall because the border sat outside
 * the height).
 */
export const UI_FIELD_BASE_CLASS =
  'ui-field box-border w-full rounded-lg border bg-ink-200 transition-colors'

/** Type = Default: the kit's 48-tall box, value vertically centred. */
export const UI_FIELD_TYPE_DEFAULT_CLASS = 'ui-field--default flex h-12 items-center gap-1 px-4'

/** Type = Default for a `<select>`, which cannot be a flex container itself. */
export const UI_FIELD_TYPE_DEFAULT_BARE_CLASS = 'ui-field--default h-12 px-4'

/** Type = Area: floor 96 (`min-h-24` = 6rem), value top-aligned. */
// The kit's 1 px stroke sits inside the 96 (`I5387:99898;3424:2444`: p12,
// text px4 → text 12 down and 16 in from the outer edge). Our border is outside
// the padding, so the padding is 1 px short of the kit's: 11 + 1 and 15 + 1.
// Without it three rows came out 98 tall (owner 29.09, edit External Naming).
export const UI_FIELD_TYPE_AREA_CLASS = 'ui-field--area flex min-h-24 flex-col gap-1 px-[0.9375rem] py-[0.6875rem]'

/** Ours: floors at the kit's 48 and grows, for the badge-carrying GEO trigger. */
export const UI_FIELD_TYPE_FLUID_CLASS =
  'ui-field--fluid flex min-h-12 flex-wrap items-center gap-2 px-4 py-2'

/** `input/border/default` #eaeaeb — Default, Hovered, Filled and Disabled all take it. */
export const UI_FIELD_BORDER_DEFAULT_CLASS = 'border-ink-300'

/** `input/border/error` #f4a9aa — kit State = Error. */
export const UI_FIELD_BORDER_ERROR_CLASS = 'ui-field--invalid border-red-border'

/** `input/border/focused` #cacace, held open — see `focused` above. */
export const UI_FIELD_BORDER_FOCUSED_CLASS = 'ui-field--focused border-ink-500'

/**
 * Hovered: `input/bg/hovered` #eaeaeb. Focused: back to `input/bg/default`
 * plus `input/border/focused` #cacace. The `focus*:bg-ink-200` is not
 * redundant — without it a focused field under the pointer would keep the
 * hover fill, a state the kit does not draw.
 */
export const UI_FIELD_INTERACTIVE_WITHIN_CLASS =
  'hover:bg-ink-300 focus-within:bg-ink-200 focus-within:border-ink-500'

/** Same pair for a surface that IS the control (the raw `<select>`). */
export const UI_FIELD_INTERACTIVE_SELF_CLASS =
  'hover:bg-ink-300 focus:bg-ink-200 focus:border-ink-500'

/**
 * Hover and focus are dropped while the border is already pinned — by Error or
 * by a held-open Focused. The kit has no Error+Hovered and no Error+Focused
 * symbol, and letting either repaint the border would hide the state the field
 * is reporting.
 */
export const UI_FIELD_INTERACTIVE_INVALID_CLASS = 'ui-field--pinned'

/** Read-only — Default colours, no hover and no focus state, plain cursor. */
export const UI_FIELD_READONLY_CLASS = 'ui-field--readonly cursor-default'

/** Kit State = Disabled — `opacity/50` over the Default colours, no hover. */
export const UI_FIELD_DISABLED_CLASS = 'ui-field--disabled cursor-not-allowed opacity-50'

/**
 * The control itself: transparent, because the surface around it already
 * carries `input/bg/*`. `text-base` is Tailwind's 16/24 — the kit's `body`.
 * `input/content/value` #1f1f2e → ink-900, `input/content/placeholder`
 * #95959d → ink-600.
 */
export const UI_FIELD_CONTROL_BASE_CLASS =
  'ui-field__control bg-transparent text-base text-ink-900 outline-none placeholder:text-ink-600 disabled:cursor-not-allowed'

/**
 * The usual case: the control is the only thing in the box and fills it. The
 * width is split out because the GEO search input shares the box with badges
 * and must stay `w-auto` — two `width` utilities on one element would be
 * resolved by Tailwind's property order rather than by the class string.
 */
export const UI_FIELD_CONTROL_CLASS = `${UI_FIELD_CONTROL_BASE_CLASS} w-full min-w-0 flex-1`

/** Type = Area adds `resize-none`: the kit's Area is sized by us, not dragged. */
export const UI_FIELD_CONTROL_AREA_CLASS = `${UI_FIELD_CONTROL_CLASS} resize-none`

/** `input/icon` #6f6f7d at 20×20 — the Icon left / Icon right slots. */
export const UI_FIELD_ICON_CLASS = 'ui-field__icon size-5 shrink-0 text-ink-700'

/**
 * The optional inner Label (`3436:4420`): `caption/l/medium` 14/16 in
 * `input/description` #6f6f7d. Its one carrier in this tree is the CEO comment
 * editor, which already drew exactly this shape by hand at #5B5B62.
 */
export const UI_FIELD_INNER_LABEL_CLASS =
  'ui-field__inner-label block text-sm/4 font-medium text-ink-700'

/**
 * Kit Title `3424:1050`: Icon 20 at x=0, label at x=28 → `spacing/8` gap,
 * `body/medium` 16/24 in `input/title` #1f1f2e.
 */
export const UI_FIELD_LABEL_CLASS =
  'ui-field-label flex items-center gap-2 text-base font-medium text-ink-900'

/**
 * The required asterisk and the "(необов'язково)" suffix are ours — the kit
 * draws neither — but both already existed in the tree in two spellings each
 * (`text-red-500` / `text-error`, `rgba(91,91,98,0.6)`). They take the kit's
 * own `input/error` and `input/description` rather than a new colour.
 */
export const UI_FIELD_LABEL_REQUIRED_CLASS = 'ui-field-label__required text-red-content'
export const UI_FIELD_LABEL_OPTIONAL_CLASS = 'ui-field-label__optional font-normal text-ink-700'

/**
 * Kit Description `3424:5408`: 16 tall, `caption/l/regular` 14/16. Type =
 * Default is `input/description` #6f6f7d, Type = Error is `input/error`
 * #ce2c31. Bare `text-sm` would give Tailwind's 14/20 — the `/4` modifier is
 * how `uiButton.ts` and `uiLink.ts` spell the kit's 16.
 */
export const UI_FIELD_HINT_BASE_CLASS = 'ui-field-hint text-sm/4'
export const UI_FIELD_HINT_TONE_CLASS: Record<'default' | 'error', string> = {
  default: 'ui-field-hint--default text-ink-700',
  error: 'ui-field-hint--error text-red-content',
}

export function resolveUiFieldSurfaceClasses(options: UiFieldSurfaceOptions = {}): string {
  const {
    type = 'default',
    invalid = false,
    disabled = false,
    readonly = false,
    focusWithin = true,
    bare = false,
    focused = false,
  } = options

  const typeClass =
    type === 'area'
      ? UI_FIELD_TYPE_AREA_CLASS
      : type === 'fluid'
        ? UI_FIELD_TYPE_FLUID_CLASS
        : bare
          ? UI_FIELD_TYPE_DEFAULT_BARE_CLASS
          : UI_FIELD_TYPE_DEFAULT_CLASS

  const borderClass = invalid
    ? UI_FIELD_BORDER_ERROR_CLASS
    : focused
      ? UI_FIELD_BORDER_FOCUSED_CLASS
      : UI_FIELD_BORDER_DEFAULT_CLASS

  const interactiveClass = disabled
    ? UI_FIELD_DISABLED_CLASS
    : readonly
      ? UI_FIELD_READONLY_CLASS
      : invalid || focused
      ? UI_FIELD_INTERACTIVE_INVALID_CLASS
      : focusWithin
        ? UI_FIELD_INTERACTIVE_WITHIN_CLASS
        : UI_FIELD_INTERACTIVE_SELF_CLASS

  return [UI_FIELD_BASE_CLASS, typeClass, borderClass, interactiveClass].join(' ')
}

export function resolveUiFieldHintClasses(tone: 'default' | 'error' = 'default'): string {
  return `${UI_FIELD_HINT_BASE_CLASS} ${UI_FIELD_HINT_TONE_CLASS[tone]}`
}

export interface TextareaAutosizeLayout {
  heightPx: number
  overflowY: 'auto' | 'hidden'
}

/**
 * Height of an autosizing Area field, in real pixels.
 *
 * The caller measures `lineHeightPx` and `verticalPaddingPx` off the live
 * element instead of hard-coding 24 and 32 the way `StepCommentField` used to.
 * That is not tidying: under the embed scale the root font-size is ~13px, so a
 * line is ~19.5px, and a hard-coded 24 made the field a fifth too tall on every
 * panel narrower than the 1440 design canvas — silently, because no test covers
 * the embed scale ("Главная опасность" in the task document).
 */
export function computeTextareaAutosize(
  scrollHeightPx: number,
  lineHeightPx: number,
  rows: number,
  maxRows: number,
  verticalPaddingPx: number,
): TextareaAutosizeLayout {
  const minHeightPx = rows * lineHeightPx + verticalPaddingPx
  const maxHeightPx = maxRows * lineHeightPx + verticalPaddingPx

  if (scrollHeightPx > maxHeightPx) {
    return { heightPx: maxHeightPx, overflowY: 'auto' }
  }
  return { heightPx: Math.max(scrollHeightPx, minHeightPx), overflowY: 'hidden' }
}
