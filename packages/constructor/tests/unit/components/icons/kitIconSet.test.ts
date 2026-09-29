import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { phosphorPaths } from '@brand-constructor/shared'

/**
 * Guard for `src/components/icons/` — DP-15258 phase 23, re-pinned by DP-15859.
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
 *    matched to Phosphor is painted by `fill="currentColor"` with no `stroke`
 *    at all. Our pre-kit drawings were hollow outlines at `stroke-width: 2`,
 *    which read heavier at every size.
 * 2. **Each file carries the glyph the mapping table assigned it.** Since
 *    DP-15859 no file holds path data: each imports ONE file of
 *    `@phosphor-icons/core`, and the folder of that file is the weight. Two
 *    things are pinned per icon — the import (which file, which weight) and
 *    the drawing inside that package file, by its opening coordinates *and*
 *    its length, so a package upgrade that redraws a glyph shows up here.
 *    Before DP-15859 the same pair was measured on the pasted Figma export;
 *    the pasted and the package drawings were compared as rasters at 96 px
 *    and match within anti-aliasing (tracker `dp-15859-icons.md`).
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
 * Verified to fail: swap the imports of `ArrowLeftIcon` and `PlusIcon`, point
 * `InfoCircleFilledIcon` at the Regular weight, paste a `d` back into any
 * converted icon, put a `stroke="currentColor"` back, or move a file between
 * the two lists — each one turns this file red.
 */

const ICONS_DIR = fileURLToPath(new URL('../../../../src/components/icons/', import.meta.url))

const read = (name: string): string => readFileSync(`${ICONS_DIR}${name}.vue`, 'utf8')

/** Resolves package files the way the wizard's own imports do. */
const requireFromPackage = createRequire(new URL('../../../../package.json', import.meta.url))

/**
 * The doc comments say things like "was a stroked pencil at stroke-width 2" on
 * purpose — that prose is the record of what changed. Measure the markup, not
 * the prose, or every one of those sentences reads as a live stroke.
 */
const markupOf = (source: string): string => source.slice(source.indexOf('<template>'))

/**
 * Every icon the designer's mapping table (`5658:39246`) matched to a Phosphor
 * glyph, with the kit node it matches and the package file that draws it.
 *
 * `dLength` and `dStart` are measured from the package file (first path), not
 * copied from anywhere. The Figma-export numbers this table used to carry
 * were measured, not copied from the plan — the plan's own numbers for that
 * phase were wrong three times (it called the set "32 symbols" where the file
 * holds 47, and the table "~30 rows" where it holds 47).
 */
const KIT_ICONS: ReadonlyArray<
  readonly [
    file: string,
    phosphor: string,
    weight: 'Regular' | 'Fill',
    node: string,
    packageFile: string,
    dLength: number,
    dStart: string,
  ]
> = [
  ['ArrowLeftIcon', 'ArrowLeft', 'Regular', '3262:988', 'regular/arrow-left.svg', 148, 'M224,128a8,8,0,0,1-8,8'],
  ['ArrowRightIcon', 'ArrowRight', 'Regular', '3261:867', 'regular/arrow-right.svg', 145, 'M221.66,133.66l-72,72a'],
  ['CalendarIcon', 'CalendarBlank', 'Regular', '3262:4195', 'regular/calendar-blank.svg', 227, 'M208,32H184V24a8,8,0,0'],
  ['CaretDownIcon', 'CaretDown', 'Regular', '3839:12555', 'regular/caret-down.svg', 114, 'M213.66,101.66l-80,80a'],
  ['ChatBubbleIcon', 'ChatCircleText', 'Regular', '3262:4467', 'regular/chat-circle-text.svg', 341, 'M168,112a8,8,0,0,1-8,8'],
  ['CheckBadgeIcon', 'CheckCircle', 'Regular', '3262:4212', 'regular/check-circle.svg', 239, 'M173.66,98.34a8,8,0,0,'],
  ['CheckIcon', 'Check', 'Regular', '3262:993', 'regular/check.svg', 115, 'M229.66,77.66l-128,128'],
  ['ChevronLeftIcon', 'CaretLeft', 'Regular', '3261:861', 'regular/caret-left.svg', 100, 'M165.66,202.34a8,8,0,0'],
  ['ChevronRightIcon', 'CaretRight', 'Regular', '3261:859', 'regular/caret-right.svg', 119, 'M181.66,133.66l-80,80a'],
  ['CloseIcon', 'X', 'Regular', '3261:877', 'regular/x.svg', 184, 'M205.66,194.34a8,8,0,0'],
  ['DeliverablesScopeIcon', 'Scales', 'Regular', '3262:4495', 'regular/scales.svg', 561, 'M239.43,133l-32-80h0a8'],
  ['EyeIcon', 'Eye', 'Regular', '3262:4487', 'regular/eye.svg', 601, 'M247.31,124.76c-.35-.7'],
  ['EyeSlashIcon', 'EyeSlash', 'Regular', '5353:24585', 'regular/eye-slash.svg', 900, 'M53.92,34.62A8,8,0,1,0'],
  ['FigmaLogoIcon', 'FigmaLogo', 'Regular', '5658:39709', 'regular/figma-logo.svg', 320, 'M192,96a40,40,0,0,0-24'],
  ['GlobeHemisphereWestIcon', 'GlobeHemisphereWest', 'Regular', '5658:38632', 'regular/globe-hemisphere-west.svg', 860, 'M128,24A104,104,0,1,0,'],
  ['GlobeIcon', 'Globe', 'Regular', '3262:4208', 'regular/globe.svg', 756, 'M128,24h0A104,104,0,1,'],
  ['HandshakeIcon', 'Handshake', 'Regular', '5658:39240', 'regular/handshake.svg', 798, 'M254.3,107.91,228.78,5'],
  ['ImagePlaceholderIcon', 'ImageSquare', 'Regular', '4492:12024', 'regular/image-square.svg', 265, 'M208,32H48A16,16,0,0,0'],
  ['InfoCircleFilledIcon', 'WarningCircle', 'Fill', '3262:4504', 'fill/warning-circle-fill.svg', 142, 'M128,24A104,104,0,1,0,'],
  ['LinkIcon', 'Link', 'Regular', '3298:3429', 'regular/link.svg', 590, 'M240,88.23a54.43,54.43'],
  ['MagicWandIcon', 'MagicWand', 'Regular', '3298:4228', 'regular/magic-wand.svg', 505, 'M48,64a8,8,0,0,1,8-8H7'],
  ['MaximizeIcon', 'ArrowsOutSimple', 'Regular', '3262:4471', 'regular/arrows-out-simple.svg', 235, 'M216,48V96a8,8,0,0,1-1'],
  ['MegaphoneIcon', 'Megaphone', 'Regular', '3262:4491', 'regular/megaphone.svg', 401, 'M248,120a48.05,48.05,0'],
  ['NewspaperClippingIcon', 'NewspaperClipping', 'Regular', '5658:38633', 'regular/newspaper-clipping.svg', 550, 'M216,40H40A16,16,0,0,0'],
  ['PaletteIcon', 'Palette', 'Regular', '3262:4191', 'regular/palette.svg', 602, 'M200.77,53.89A103.27,1'],
  ['PencilIcon', 'PencilSimple', 'Regular', '3262:4181', 'regular/pencil-simple.svg', 248, 'M227.31,73.37,182.63,2'],
  ['PlusIcon', 'Plus', 'Regular', '3261:875', 'regular/plus.svg', 112, 'M224,128a8,8,0,0,1-8,8'],
  ['RefreshIcon', 'ArrowsClockwise', 'Regular', '3262:4480', 'regular/arrows-clockwise.svg', 403, 'M224,48V96a8,8,0,0,1-8'],
  ['ShieldCheckIcon', 'ShieldCheck', 'Regular', '5658:38636', 'regular/shield-check.svg', 436, 'M208,40H48A16,16,0,0,0'],
  ['SparklesIcon', 'Sparkle', 'Regular', '3262:4312', 'regular/sparkle.svg', 566, 'M197.58,129.06,146,110'],
  ['StarIcon', 'Star', 'Regular', '5658:38634', 'regular/star.svg', 710, 'M239.18,97.26A16.38,16'],
  ['SwatchesIcon', 'Swatches', 'Regular', '5658:39710', 'regular/swatches.svg', 522, 'M88,180a12,12,0,1,1-12'],
  ['TextAaIcon', 'TextAa', 'Regular', '5637:24130', 'regular/text-aa.svg', 462, 'M87.24,52.59a8,8,0,0,0'],
  ['TrendingUpIcon', 'TrendUp', 'Regular', '5658:39677', 'regular/trend-up.svg', 192, 'M240,56v64a8,8,0,0,1-1'],
  ['TrophyIcon', 'Trophy', 'Regular', '5658:38635', 'regular/trophy.svg', 419, 'M232,64H208V48a8,8,0,0'],
  ['UsersThreeIcon', 'UsersThree', 'Regular', '5658:38631', 'regular/users-three.svg', 589, 'M244.8,150.4a8,8,0,0,1'],
]

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
      ...ICONS_WITHOUT_A_KIT_PAIR,
    ].sort()

    expect(accounted).toEqual(onDisk)
  })

  describe.each(KIT_ICONS)(
    '%s',
    (file, phosphor, weight, node, packageFile, dLength, dStart) => {
      const source = read(file)
      const markup = markupOf(source)

      it(`imports Phosphor ${phosphor} (${weight}) from @phosphor-icons/core/${packageFile}`, () => {
        const imports = [
          ...source.matchAll(/^import\s+(\w+)\s+from\s+'@phosphor-icons\/core\/([\w/-]+\.svg)\?raw'/gm),
        ]
        expect(imports, `${file} must import exactly one package glyph`).toHaveLength(1)
        expect(imports[0][1]).toBe('glyph')
        expect(imports[0][2]).toBe(packageFile)
      })

      it(`takes the ${weight} weight — the folder of the package file`, () => {
        const folder = weight === 'Fill' ? 'fill/' : 'regular/'
        expect(packageFile.startsWith(folder)).toBe(true)
        if (weight === 'Fill') expect(packageFile.endsWith('-fill.svg')).toBe(true)
      })

      it('the package file still draws the glyph measured for it', () => {
        const svg = readFileSync(requireFromPackage.resolve(`@phosphor-icons/core/${packageFile}`), 'utf8')
        const [first] = phosphorPaths(svg)
        expect(first).toHaveLength(dLength)
        expect(first.slice(0, dStart.length)).toBe(dStart)
      })

      it('renders that glyph and nothing pasted', () => {
        expect(source).toMatch(/const paths = phosphorPaths\(glyph\)/)
        expect(markup).toContain(':viewBox="PHOSPHOR_VIEW_BOX"')
        expect(markup).toMatch(/<path v-for="\(d, i\) in paths" :key="i" :d="d" \/>/)
        expect(markup).not.toMatch(/\sd="/)
        expect(markup).not.toMatch(/\sviewBox="/)
      })

      it('carries no stroke — the kit weight comes from the shape, not a stroke', () => {
        expect(markup).toContain('fill="currentColor"')
        expect(markup).not.toContain('stroke="currentColor"')
        expect(markup).not.toContain('stroke-width')
        expect(source).not.toContain('StrokeIconProps')
      })

      it(`names its kit node ${node} so the next session can re-check it`, () => {
        expect(source).toContain(node)
        expect(source).toContain(`Phosphor \`${phosphor}\``)
      })
    },
  )

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
