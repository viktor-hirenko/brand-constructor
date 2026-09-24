import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Guard for `src/components/icons/` — DP-15258 phase 23.
 *
 * Icons sit on 20+ screens and nothing else in the tree notices when one is
 * wrong. A swapped or missed glyph does not break a type, does not fail a
 * render and does not change a class string — it just draws the wrong picture
 * somewhere the next person is not looking. That is the whole reason this file
 * exists.
 *
 * Three things are pinned:
 *
 * 1. **The kit glyphs are filled, never stroked.** Every icon the designer
 *    matched to Phosphor is one `fill="currentColor"` path on a 24 box with no
 *    `stroke` at all. Our pre-kit drawings were hollow outlines at
 *    `stroke-width: 2`, which read heavier at every size — that difference is
 *    what the owner saw on each screen before this phase.
 * 2. **Each file carries the glyph the mapping table assigned it.** Pinned by
 *    the path's opening coordinates *and* its length, because the first is not
 *    unique on its own: `ArrowLeft` and `Plus` are both symmetric about the
 *    centre and both start `M21 12C21 12.1989`. Prefix alone would let that
 *    pair be swapped silently.
 * 3. **The list of icons with no kit pair does not drift.** The kit has no
 *    clock, crown, rocket, moon or spinner, so those files keep our own
 *    drawing. If one is converted — or a converted one is reverted — the sets
 *    below stop matching and this goes red. Each is a row in
 *    `docs/design-audit/dp-15258-divergences.md` awaiting a designer answer;
 *    inventing a Phosphor glyph for them is explicitly not allowed.
 *
 * Sizes and colours are deliberately NOT pinned here: they belong to the
 * component that shows the icon (`uiProperty.ts`, `uiButton.ts`,
 * `uiIconButton.ts`, `uiLink.ts`), never to the icon file.
 *
 * Verified to fail: swap the `d` of `ArrowLeftIcon` and `PlusIcon`, put a
 * `stroke="currentColor"` back on any converted icon, or move a file between
 * the two lists — each one turns this file red.
 */

const ICONS_DIR = fileURLToPath(new URL('../../../../src/components/icons/', import.meta.url))

const read = (name: string): string => readFileSync(`${ICONS_DIR}${name}.vue`, 'utf8')

/**
 * The doc comments say things like "was a stroked pencil at stroke-width 2" on
 * purpose — that prose is the record of what changed. Measure the markup, not
 * the prose, or every one of those sentences reads as a live stroke.
 */
const markupOf = (source: string): string => source.slice(source.indexOf('<template>'))

/**
 * Every icon the designer's mapping table (`5658:39246`) matched to a Phosphor
 * glyph, with the node it was exported from and the shape of its path.
 *
 * `dLength` and `dStart` are measured from the Figma export, not copied from
 * the plan — the plan's own numbers for this phase were wrong three times
 * (it called the set "32 symbols" where the file holds 47, and the table
 * "~30 rows" where it holds 47).
 */
const KIT_ICONS: ReadonlyArray<
  readonly [file: string, phosphor: string, weight: string, node: string, dLength: number, dStart: string]
> = [
  ['ArrowLeftIcon', 'ArrowLeft', 'Regular', '3262:988', 979, 'M21 12C21 12.1989 20.921'],
  ['ArrowRightIcon', 'ArrowRight', 'Regular', '3261:867', 798, 'M20.7806 12.5306L14.0306'],
  ['CalendarIcon', 'CalendarBlank', 'Regular', '3262:4195', 1082, 'M19.5 3H17.25V2.25C17.25'],
  ['ChatBubbleIcon', 'ChatCircleText', 'Regular', '3262:4467', 2267, 'M15.75 10.5C15.75 10.698'],
  ['CheckBadgeIcon', 'CheckCircle', 'Regular', '3262:4212', 1763, 'M16.2806 9.21937C16.3504'],
  ['CheckIcon', 'Check', 'Regular', '3262:993', 643, 'M21.5306 7.28062L9.53061'],
  ['ChevronLeftIcon', 'CaretLeft', 'Regular', '3261:861', 813, 'M15.5306 18.9694C15.6003'],
  ['ChevronRightIcon', 'CaretRight', 'Regular', '3261:859', 824, 'M17.0306 12.5306L9.53055'],
  ['CloseIcon', 'X', 'Regular', '3261:877', 1078, 'M19.2807 18.2194C19.3504'],
  ['DeliverablesScopeIcon', 'Scales', 'Regular', '3262:4495', 1485, 'M22.4466 12.4688L19.4466'],
  ['EyeIcon', 'Eye', 'Regular', '3262:4487', 1729, 'M23.1853 11.6962C23.1525'],
  ['EyeSlashIcon', 'EyeSlash', 'Regular', '5353:24585', 3564, 'M5.05499 3.24563C4.98913'],
  ['FigmaLogoIcon', 'FigmaLogo', 'Regular', '5658:39709', 2541, 'M18 9C18.6297 8.52776 19'],
  ['GlobeIcon', 'Globe', 'Regular', '3262:4208', 1767, 'M12 2.25C10.0716 2.25 8.'],
  [
    'GlobeHemisphereWestIcon',
    'GlobeHemisphereWest',
    'Regular',
    '5658:38632',
    2348,
    'M12 2.25C10.0716 2.25 8.',
  ],
  ['HandshakeIcon', 'Handshake', 'Regular', '5658:39240', 2406, 'M23.8406 10.1165L21.4481'],
  ['ImagePlaceholderIcon', 'ImageSquare', 'Regular', '4492:12024', 1425, 'M19.5 3H4.5C4.10218 3 3.'],
  ['MagicWandIcon', 'MagicWand', 'Regular', '3298:4228', 3006, 'M4.50004 6C4.50004 5.801'],
  ['InfoCircleFilledIcon', 'WarningCircle', 'Fill', '3262:4504', 1278, 'M12 2.25C10.0716 2.25 8.'],
  ['LinkIcon', 'Link', 'Regular', '3298:3429', 2917, 'M22.5 8.27155C22.4624 9.'],
  ['MaximizeIcon', 'ArrowsOutSimple', 'Regular', '3262:4471', 1318, 'M20.25 4.5V9C20.25 9.198'],
  ['MegaphoneIcon', 'Megaphone', 'Regular', '3262:4491', 1394, 'M23.25 11.25C23.2488 10.'],
  [
    'NewspaperClippingIcon',
    'NewspaperClipping',
    'Regular',
    '5658:38633',
    2323,
    'M20.25 3.75H3.75C3.35218',
  ],
  ['PaletteIcon', 'Palette', 'Regular', '3262:4191', 3195, 'M18.8222 5.05219C17.0069'],
  ['PencilIcon', 'PencilSimple', 'Regular', '3262:4181', 859, 'M21.3103 6.87845L17.1216'],
  ['PlusIcon', 'Plus', 'Regular', '3261:875', 689, 'M21 12C21 12.1989 20.921'],
  ['RefreshIcon', 'ArrowsClockwise', 'Regular', '3262:4480', 1744, 'M21 4.50001V9.00001C21 9'],
  ['ShieldCheckIcon', 'ShieldCheck', 'Regular', '5658:38636', 1425, 'M19.5 3.75H4.5C4.10218 3'],
  ['SparklesIcon', 'Sparkle', 'Regular', '3262:4312', 2821, 'M18.5232 12.0994L13.6875'],
  ['StarIcon', 'Star', 'Regular', '5658:38634', 2315, 'M22.4231 9.11812C22.3294'],
  ['SwatchesIcon', 'Swatches', 'Regular', '5658:39710', 1722, 'M8.24999 16.875C8.24999 '],
  ['TextAaIcon', 'TextAa', 'Regular', '5637:24130', 1831, 'M8.17876 4.9303C8.11819 '],
  ['TrendingUpIcon', 'TrendUp', 'Regular', '5658:39677', 1085, 'M22.5 5.25V11.25C22.5 11'],
  ['TrophyIcon', 'Trophy', 'Regular', '5658:38635', 1524, 'M21.75 6H19.5V4.5C19.5 4'],
  ['UsersThreeIcon', 'UsersThree', 'Regular', '5658:38631', 5274, 'M22.95 14.1C22.8712 14.1'],
]

/**
 * `CaretDownIcon` is kit too, but it arrived in phase 12 from the accordion
 * header's own export at 16x16 rather than from the icon set at 24x24.
 *
 * **It is now the only one.** `ChevronDownIcon.vue` used to sit in the table
 * above carrying the 24-box version of this same glyph — the 24 path is this
 * one times 1.5, checked coordinate by coordinate — so the tree held one
 * drawing in two files. The clean-up deleted the 24 one and pointed its two
 * carriers, `LandingDraftCta` and `BriefOrderButton`, at this file. A viewBox
 * scales, so nothing on either screen changed size.
 */
const KIT_ICON_ON_16_GRID = 'CaretDownIcon'

/**
 * Icons the kit has no glyph for, and which still have a place on a screen.
 * Left on our own drawing on purpose: the designer drew no clock, package,
 * file, spinner, download, share, send or return arrow.
 *
 * **Twelve names left this list in the clean-up, and none of them was a
 * decision about drawing.** The icons pass matched the designer's table by USE
 * CASE, so the slots those drawings stood in were given kit glyphs from new
 * files — the old files were not converted, they were orphaned, and they sat
 * here with zero references anywhere in `src` until the clean-up deleted them:
 * `AlertTriangleIcon`, `BriefcaseIcon`, `ColumnsLayoutIcon`, `CrownIcon`,
 * `ImagePlaceholderFilledIcon`, `MoonIcon`, `RocketIcon`, `SparklesFilledIcon`,
 * `SunIcon`, `TagIcon`, `TargetIcon` and `ZapIcon`.
 *
 * `FileIcon` is still live — one slot, the "Бриф нового концепту" placeholder,
 * which the kit does not draw.
 *
 * The list is recomputed, never copied: `deadIconFiles()` below is the same
 * check in code, so a file that loses its last call site shows up as a failure
 * instead of quietly becoming the thirteenth.
 */
const ICONS_WITHOUT_A_KIT_PAIR: readonly string[] = [
  'ClockIcon',
  'CornerUpLeftIcon',
  'DownloadIcon',
  'FileIcon',
  'LoaderIcon',
  'PackageIcon',
  'RevisionReturnIcon',
  'SendIcon',
  'ShareIcon',
]

describe('kit icon set (DP-15258 phase 23)', () => {
  it('accounts for every icon file — no icon is silently outside both lists', () => {
    const onDisk = readdirSync(ICONS_DIR)
      .filter((name) => name.endsWith('.vue'))
      .map((name) => name.replace(/\.vue$/, ''))
      .sort()

    const accounted = [
      ...KIT_ICONS.map(([file]) => file),
      KIT_ICON_ON_16_GRID,
      ...ICONS_WITHOUT_A_KIT_PAIR,
    ].sort()

    expect(accounted).toEqual(onDisk)
  })

  describe.each(KIT_ICONS)('%s', (file, phosphor, weight, node, dLength, dStart) => {
    const source = read(file)
    const path = /<path\s+d="([^"]+)"\s+fill="currentColor"\s*\/>/.exec(source)

    it(`draws Phosphor ${phosphor} (${weight}) as one filled path`, () => {
      expect(path, `${file} must hold exactly one filled path`).not.toBeNull()
      expect(path?.[1]).toHaveLength(dLength)
      expect(path?.[1].slice(0, dStart.length)).toBe(dStart)
    })

    it('carries no stroke — the kit weight comes from the shape, not a stroke', () => {
      const markup = markupOf(source)
      expect(markup).not.toContain('stroke="currentColor"')
      expect(markup).not.toContain('stroke-width')
      expect(source).not.toContain('StrokeIconProps')
    })

    it('sits on the kit 24 box', () => {
      expect(markupOf(source)).toContain('viewBox="0 0 24 24"')
    })

    it(`names its source node ${node} so the next session can re-check it`, () => {
      expect(source).toContain(node)
      expect(source).toContain(`Phosphor \`${phosphor}\``)
    })
  })

  it(`keeps ${KIT_ICON_ON_16_GRID} on the kit glyph it got in phase 12`, () => {
    const markup = markupOf(read(KIT_ICON_ON_16_GRID))
    expect(markup).toContain('viewBox="0 0 16 16"')
    expect(markup).toContain('fill="currentColor"')
    expect(markup).not.toContain('stroke="currentColor"')
  })

  describe.each(ICONS_WITHOUT_A_KIT_PAIR)('%s has no kit pair', (file) => {
    it('is left on our own drawing rather than an invented Phosphor glyph', () => {
      expect(read(file)).not.toContain('Phosphor `')
    })
  })
})

/**
 * Nothing in the icons folder is dead — the clean-up work.
 *
 * Twelve files had zero call sites when this was written, every one of them
 * orphaned the same way: the icons pass matched the designer's table by USE
 * CASE, gave each slot a kit glyph from a NEW file, and left the old drawing
 * behind with nobody pointing at it. They were deleted, and a thirteenth would
 * appear the same way — silently, with no type error, no failing render and no
 * changed class string.
 *
 * So the list is recomputed here rather than written down. This is the same
 * check the clean-up ran as a shell loop, kept as a test so that removing the
 * last call site of an icon fails instead of going unnoticed:
 *
 *   for f in src/components/icons/*.vue; do n=$(basename "$f" .vue);
 *     c=$(grep -rl "<$n" --include='*.vue' src | grep -cv 'components/icons/');
 *     [ "$c" = 0 ] && echo "$n"; done
 *
 * Counted by TAG (`<Name`), never by bare name: an icon named in a comment
 * that explains where it used to stand is not a call site, and a bare grep
 * would call every deleted file alive again.
 */
describe('no icon file is dead (clean-up work)', () => {
  const SRC = fileURLToPath(new URL('../../../../src/', import.meta.url))

  const walkVue = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (entry.name === '.swarm') return []
      const path = `${dir}${entry.name}`
      if (entry.isDirectory()) return walkVue(`${path}/`)
      return entry.name.endsWith('.vue') ? [path] : []
    })

  const iconFiles = readdirSync(ICONS_DIR)
    .filter((name) => name.endsWith('.vue'))
    .map((name) => name.replace(/\.vue$/, ''))

  /** Every `.vue` in `src` that is not itself an icon file. */
  const callSites = walkVue(SRC)
    .filter((path) => !path.includes('/components/icons/'))
    .map((path) => readFileSync(path, 'utf8'))

  it('gives every icon at least one call site outside the icons folder', () => {
    const dead = iconFiles.filter(
      (name) => !callSites.some((source) => source.includes(`<${name}`)),
    )
    expect(dead).toEqual([])
  })

  it('has one caret file, not two drawings of the same glyph', () => {
    // `ChevronDownIcon.vue` carried this exact glyph on a 24 box. A viewBox
    // scales, so the two were one drawing in two files.
    expect(iconFiles).toContain('CaretDownIcon')
    expect(iconFiles).not.toContain('ChevronDownIcon')
  })
})
