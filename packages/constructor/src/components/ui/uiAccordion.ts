/**
 * Class map for `UiAccordion.vue`, `UiAccordionItem.vue`, `UiAccordionOption.vue`
 * and — this is the point of the file — for
 * `skeletons/VisualComponentsAccordionSkeleton.vue`.
 *
 * Kit source: Figma section Accordion, two frames that do NOT mean what their
 * names suggest:
 *   Accordion open `3839:12607` — the SECTION: State = Default / Hovered /
 *                                 Disabled (all 504×56) and Open (504×196)
 *   Accordion item `3839:12381` — the ROW inside it: State = Default /
 *                                 Hovered / Selected (all 504×56)
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3839-12607&m=dev
 *
 * So the kit's "item" is a variant row, not a section. `UiAccordionItem` here
 * is the section (the name the plan gave it) and `UiAccordionOption` is the
 * kit's "Accordion item". Getting this backwards costs a rewrite: the two
 * symbols share a radius and a background and nothing else.
 *
 * ── Why the skeleton imports from here
 *
 * The collapsed row and `VisualComponentsAccordionSkeleton` used to carry the
 * same eight numbers as two hand-typed copies. They drifted the moment either
 * side was edited, and the drift is invisible in review: it shows up as the
 * loading list jumping when the real accordion replaces it. Both sides now
 * read the same four constants, and `uiAccordion.test.ts` pins the pair that
 * cannot be shared as a class string (the 24 of the header content).
 *
 * ── Measured, not copied from the plan
 *
 * `get_metadata 3839:12607` and `get_design_context 3839:12606` (State = Open):
 *   section    504 wide, header 56 tall, radius/accordion 16
 *   header     p = spacing/16 (16 on all four sides), gap 8
 *              → 16 + 24 + 16 = 56, where 24 is the body/medium line box
 *   title      body/medium 16/24 in accordion/content/title #1f1f2e
 *   chevron    16×16  (the code had 20 — `size-5`)
 *   divider    full width, under the header
 *   content    p = spacing/12 (12), gap = spacing/4 (4)
 *
 * `get_design_context 3839:12380` (row, State = Default) and `3839:12404`
 * (State = Selected):
 *   row        pl 4 / pr 16 / py 4, gap 16, radius/accordion 16 → 4+48+4 = 56
 *   preview    48×48, radius/small-preview 12, bg/alt-2 #f3f3f5,
 *              letter header/s 18/24 in #95959d
 *   text       gap 4; title caption/l/medium 14/16 in #1f1f2e;
 *              description caption/l/regular 14/16 in
 *              accordion/content/description #6f6f7d
 *   Selected   border accordion/border/accent #030213 + a 20×20 check, right
 *
 * The drawn screen agrees, which is why these numbers are taken rather than
 * the ones in the plan: `get_metadata 5382:36912` puts collapsed sections on a
 * 64 pitch (56 + gap 8) and the rows inside an open one on a 60 pitch
 * (56 + gap 4), starting at y=12 from the section's top.
 *
 * ── Three kit values the code had backwards
 *
 *   - **The section is WHITE and hovers to #f3f3f5.** The code painted the
 *     header #f3f3f5 always and hovered it to #ececf0, a colour the kit does
 *     not contain.
 *   - **Disabled is `opacity/50`**, not the 40 the delegate branch used. Same
 *     answer as Button, Input and List item.
 *   - **The row's Default has no border and Selected has a 1px one.** Taken as
 *     a transparent border in Default instead: identical to the kit on screen,
 *     and it keeps the row from shifting 1px when it is picked. This is the
 *     one deliberate divergence in the file.
 *
 *     **And for its whole life it drew no border at all.** The transparent was
 *     in the base class and the accent was added on top, but both are plain
 *     border-colour utilities of equal weight, so the winner is whichever
 *     Tailwind emits last — and that is `.border-transparent`. The selected
 *     row therefore looked exactly like the unselected one, and only the check
 *     on the right told them apart. The two colours are now mutually
 *     exclusive; `uiAccordion.test.ts` holds them apart.
 *
 * ── Letter-spacing: the kit's zero, by the owner's call
 *
 * Open question 7's standing default is "keep the current look on вынос
 * screens", and phase 12 first shipped that way — the header title at
 * `-0.31px`, both row texts at `-0.15px`. QA overruled it: the instruction is
 * that every value on this component matches the drawn one. All five type
 * styles in the kit set `letterSpacing: 0`, so the tracking is gone.
 *
 * This is the accordion only. The rest of the tree still carries its trackings
 * and open question 7 is still open for them; phase 20 is where that gets
 * settled in one pass rather than component by component.
 *
 * Why a `.ts` map and not a component test: `packages/constructor` has no
 * `@vue/test-utils` and no `jsdom`, and `vitest.config.ts:11` sets
 * `environment: 'node'` — mounting is impossible, so the class decision is a
 * pure function. Same idiom as `ui/uiButton.ts`, `ui/uiField.ts`,
 * `ui/uiListItem.ts`.
 *
 * Every length is a rem-based Tailwind utility — "Железные правила адаптива".
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The list
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Pitch between collapsed sections: 64 on the drawn screen, i.e. the 56 box
 * plus `gap-2`. Shared with the skeleton — this is number 1 of the eight.
 */
export const UI_ACCORDION_LIST_CLASS = 'ui-accordion flex flex-col gap-2'

/** Kit State = Disabled: the Default colours under `opacity/50`, inert. */
export const UI_ACCORDION_LIST_DISABLED_CLASS =
  'ui-accordion--disabled pointer-events-none opacity-50'

/* ────────────────────────────────────────────────────────────────────────────
 * The section — kit `3839:12607`
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * `accordion/bg/default` #ffffff, `accordion/border/default` #eaeaeb,
 * `radius/accordion` 16. Numbers 2–4 of the eight.
 *
 * The 1px stroke is an inner outline, not a border: the kit's stroke is
 * inside, so a closed item is 56 — with `border` it measured 58 on step 7
 * (`5382:70251`, five items at a 64 pitch; we had 66). An outline is painted
 * over the children, so the header's hover fill cannot cover it the way it
 * would an inset ring. `overflow-hidden` is what makes the radius clip the
 * header fill and the body while it animates.
 */
export const UI_ACCORDION_ITEM_CLASS =
  'ui-accordion-item box-border overflow-hidden rounded-2xl outline outline-1 -outline-offset-1 outline-ink-300 bg-white'

/**
 * Header: `spacing/16` on all four sides with a 24 line box between them.
 * Numbers 5–6 of the eight (`p-4`, and the 24 pinned by the title below).
 *
 * **This is a row, not a button, and that is DP-15450 `visual components 4`.**
 * The kit's header holds three slots side by side — `Title + Badge`, an
 * optional `Visibility Icon` and `Chevron Icon` (`5382:33737`) — and the
 * middle one is a control of its own: the eye that shows/hides the Sidebar in
 * the preview. A button cannot contain another button, so the row gives up
 * being one and hands the toggle to the two slots that open the section.
 */
export const UI_ACCORDION_HEADER_CLASS =
  'ui-accordion-item__header flex w-full items-center gap-2 p-4 text-left transition-colors'

/** State = Hovered — `accordion/bg/hovered` #f3f3f5, the kit's only hover here. */
export const UI_ACCORDION_HEADER_INTERACTIVE_CLASS = 'cursor-pointer hover:bg-ink-200'

/**
 * `Title + Badge` frame: `spacing/8` between the two, title truncates first.
 *
 * Also the shape of the button that opens the section: it is `flex-1`, so it
 * covers every pixel of the row left of the action slot, which is what the
 * whole-row button used to cover.
 */
export const UI_ACCORDION_HEADER_TITLE_GROUP_CLASS =
  'ui-accordion-item__title-group flex min-w-0 flex-1 items-center gap-2 text-left'

/**
 * `body/medium` 16/24 in `accordion/content/title` #1f1f2e. `text-base` is
 * Tailwind's 16/24, so this class IS the 24 that
 * `UI_ACCORDION_HEADER_CONTENT_HEIGHT_CLASS` mirrors — the test pins the pair.
 */
export const UI_ACCORDION_HEADER_TITLE_CLASS =
  'ui-accordion-item__title truncate text-base font-medium text-ink-900'

/**
 * The header's content height, for carriers that have no text to derive it
 * from — the skeleton's placeholder bars. Number 7 of the eight.
 *
 * It cannot be shared as the same class the title uses (a placeholder has no
 * line box), so it is shared as a number and guarded by a test instead.
 */
export const UI_ACCORDION_HEADER_CONTENT_HEIGHT_CLASS = 'h-6'

/**
 * Icon slots in the header are 16 in the kit, not the 20 the code used.
 * Number 8 of the eight — the skeleton draws its chevron at this size.
 */
export const UI_ACCORDION_ICON_SIZE_CLASS = 'size-4'

/**
 * The header's chevron is `section card/content/label` #6f6f7d → ink-700, NOT
 * the #1f1f2e that `accordion/content/icon` carries.
 *
 * Both tokens come back from `get_variable_defs` on the same node and it is
 * easy to bind the wrong one: #1f1f2e belongs to the ROW's check
 * (`3839:12409`, and the exported glyph is indeed `fill="#1F1F2E"`), while the
 * header's two icons export `fill="#6F6F7D"` — verified by downloading both
 * SVGs rather than by reading the token list. Phase 12 shipped ink-900 here
 * and QA caught it.
 *
 * The 180° flip on open is ours: the kit draws a separate `CaretUp`, which is
 * this glyph mirrored in the same colour.
 */
// Hover of the action glyph — owner 29.09: «не рамка и не фон, может, жирнее
// линию». Phosphor draws filled outlines, so a currentColor stroke thickens
// them: 8 units on the 256 box adds 4 per side, Regular 16 → 24 = Phosphor
// Bold. Colour goes ink-700 → ink-900 with it.
export const UI_ACCORDION_ACTION_ICON_CLASS = `${UI_ACCORDION_ICON_SIZE_CLASS} stroke-current [stroke-linejoin:round] [stroke-width:0] transition-[stroke-width,color] duration-150 group-hover:[stroke-width:8] group-hover:text-ink-900`

export const UI_ACCORDION_CHEVRON_CLASS = `ui-accordion-item__chevron ${UI_ACCORDION_ICON_SIZE_CLASS} shrink-0 text-ink-700 transition-transform duration-200`

/**
 * The chevron's own button. It opens the section like the title does, so it is
 * not a second stop for the keyboard — the title button already carries
 * `aria-expanded` and the accessible name.
 */
export const UI_ACCORDION_CHEVRON_BUTTON_CLASS =
  'ui-accordion-item__chevron-button flex shrink-0 items-center justify-center'

/**
 * The header's action slot — the kit's `Visibility Icon` (`I5382:33737;5352:37363`),
 * a bare 16 glyph in the chevron's own `#6f6f7d`, `spacing/8` from both
 * neighbours. No tile, no fill: the kit draws the glyph alone.
 *
 * The box is 24 with the 16 glyph centred in it, and `-mx-1` gives the four
 * spare pixels back on each side — so the glyph still stands 8 from the badge
 * and 8 from the chevron, exactly as drawn, while the pointer gets a target
 * half again as wide. The negative margin is 4 and the gap is 8, so the box
 * cannot reach into the chevron's.
 */
// Owner 29.09: the eye was hard to hit. The glyph still takes 16 in the row
// (padding cancelled by negative margin), but the button reaches 16 to the left
// (over the gap into the title's free space), 8 right (the gap) and 12 up/down.
export const UI_ACCORDION_HEADER_ACTION_CLASS = `ui-accordion-item__action group -my-3 -ml-4 -mr-2 flex shrink-0 items-center justify-center py-3 pl-4 pr-2 text-ink-700`

/** Content frame under the divider: `spacing/12` inset, `spacing/4` between rows. */
export const UI_ACCORDION_CONTENT_CLASS =
  'ui-accordion-item__content flex flex-col gap-1 p-3'

/* ────────────────────────────────────────────────────────────────────────────
 * The row — kit `3839:12381`
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * pl 4 / pr 16 / py 4 around a 48 preview → 56 tall, `radius/accordion` 16.
 *
 * The border WIDTH is declared here so the row never shifts by a pixel when it
 * is picked; the COLOUR is chosen by the resolver, and the two states are
 * mutually exclusive on purpose.
 *
 * **`border-transparent` used to live here, and that is why the selected row
 * had no border on screen.** Both `border-transparent` and `border-primary`
 * are single-class border-colour utilities, so neither outranks the other and
 * the cascade is decided by their order in the built stylesheet — where
 * Tailwind puts `.border-transparent` after `.border-primary`. Adding the
 * accent on top of a permanent transparent therefore changed nothing, at any
 * breakpoint, for as long as the component existed. The source read correctly
 * and the product never drew it.
 */
export const UI_ACCORDION_OPTION_CLASS =
  'ui-accordion-option box-border flex w-full items-center gap-4 rounded-2xl border py-1 pl-1 pr-4 text-left transition-colors'

/** State = Hovered — `accordion/bg/hovered` #f3f3f5. */
export const UI_ACCORDION_OPTION_INTERACTIVE_CLASS = 'hover:bg-ink-200'

/** State = Selected — `accordion/border/accent` #030213, fill stays white. */
export const UI_ACCORDION_OPTION_SELECTED_CLASS = 'ui-accordion-option--selected border-primary'

/**
 * States Default and Hovered — the kit draws no border on either, and the row
 * keeps the same 1px so picking it moves nothing. Applied only when the row is
 * NOT selected: see the note on the cascade in `UI_ACCORDION_OPTION_CLASS`.
 */
export const UI_ACCORDION_OPTION_UNSELECTED_CLASS = 'border-transparent'

/** `opacity/50` again, for a row disabled on its own rather than by the list. */
export const UI_ACCORDION_OPTION_DISABLED_CLASS =
  'ui-accordion-option--disabled cursor-not-allowed opacity-50'

/**
 * `Preview` 48×48, `radius/small-preview` 12, `bg/alt-2` #f3f3f5. The design
 * dropped the thumbnail picture and shows the variant letter instead, so the
 * tile is a centring box.
 */
export const UI_ACCORDION_OPTION_PREVIEW_CLASS =
  'ui-accordion-option__preview flex size-12 shrink-0 items-center justify-center rounded-xl bg-ink-200'

/** The letter: `header/s` 18/24 in #95959d → ink-600. `text-lg/6` is that pair. */
export const UI_ACCORDION_OPTION_PREVIEW_LETTER_CLASS =
  'ui-accordion-option__preview-letter text-lg/6 font-medium text-ink-600'

/** `Text` frame: `spacing/4` between title and description. */
export const UI_ACCORDION_OPTION_TEXT_CLASS =
  'ui-accordion-option__text flex min-w-0 flex-1 flex-col gap-1'

/**
 * `caption/l/medium` 14/16 in `accordion/content/title` #1f1f2e. Bare `text-sm`
 * is Tailwind's 14/20 — `/4` is how `uiButton.ts`, `uiLink.ts` and `uiField.ts`
 * spell the kit's 16.
 */
export const UI_ACCORDION_OPTION_TITLE_CLASS =
  'ui-accordion-option__title block text-sm/4 font-medium text-ink-900'

/** `caption/l/regular` 14/16 in `accordion/content/description` #6f6f7d. */
export const UI_ACCORDION_OPTION_DESCRIPTION_CLASS =
  'ui-accordion-option__description block text-sm/4 text-ink-700'

/** The Selected row's trailing check — 20 in the kit, unlike the header's 16. */
export const UI_ACCORDION_OPTION_ICON_CLASS =
  'ui-accordion-option__icon size-5 shrink-0 text-ink-900'

export interface UiAccordionHeaderOptions {
  /** Kit State = Disabled — drops the hover fill with it. */
  disabled?: boolean
}

export interface UiAccordionOptionOptions {
  selected?: boolean
  disabled?: boolean
}

export function resolveUiAccordionListClasses(options: UiAccordionHeaderOptions = {}): string {
  const { disabled = false } = options

  return disabled
    ? `${UI_ACCORDION_LIST_CLASS} ${UI_ACCORDION_LIST_DISABLED_CLASS}`
    : UI_ACCORDION_LIST_CLASS
}

export function resolveUiAccordionHeaderClasses(
  options: UiAccordionHeaderOptions = {}
): string {
  const { disabled = false } = options

  return disabled
    ? UI_ACCORDION_HEADER_CLASS
    : `${UI_ACCORDION_HEADER_CLASS} ${UI_ACCORDION_HEADER_INTERACTIVE_CLASS}`
}

export function resolveUiAccordionOptionClasses(
  options: UiAccordionOptionOptions = {}
): string {
  const { selected = false, disabled = false } = options

  return [
    UI_ACCORDION_OPTION_CLASS,
    selected ? UI_ACCORDION_OPTION_SELECTED_CLASS : UI_ACCORDION_OPTION_UNSELECTED_CLASS,
    disabled ? UI_ACCORDION_OPTION_DISABLED_CLASS : UI_ACCORDION_OPTION_INTERACTIVE_CLASS,
  ]
    .filter(Boolean)
    .join(' ')
}
